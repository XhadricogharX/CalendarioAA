// Edge Function: confirma asistencia con anti-abuso por IP (hash, sin guardar la IP).
// La app la usa si está desplegada; si no, cae a inserción directa (con límites de BD).
//
// Desplegar:  supabase functions deploy submit-attendance --no-verify-jwt
// Variables (Project Settings → Edge Functions / Secrets): IP_SALT (texto aleatorio).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const NAME_RE = /^[\p{L}][\p{L} .'-]{0,79}$/u

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad_json' })
  }

  const eventId = String(body.event_id ?? '')
  const deviceId = String(body.device_id ?? '')
  const first = String(body.first_name ?? '').trim()
  const last = String(body.last_name ?? '').trim()

  if (!eventId || !deviceId || !first || !last) return json({ error: 'missing' })
  if (!NAME_RE.test(first) || !NAME_RE.test(last)) return json({ error: 'name' })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const salt = Deno.env.get('IP_SALT') ?? 'aa-default-salt'
  const ip =
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const ipHash = await sha256(salt + ip)

  const nowMs = Date.now()
  const sinceMin = new Date(nowMs - 60_000).toISOString()
  const sinceHour = new Date(nowMs - 3_600_000).toISOString()

  const [{ count: perMin }, { count: perHour }] = await Promise.all([
    sb
      .from('attendance_throttle')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', sinceMin),
    sb
      .from('attendance_throttle')
      .select('*', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', sinceHour),
  ])

  if ((perMin ?? 0) >= 4 || (perHour ?? 0) >= 20)
    return json({ error: 'rate_limited' })

  const { error } = await sb.from('attendances').insert({
    event_id: eventId,
    first_name: first,
    last_name: last,
    device_id: deviceId,
  })

  if (error) {
    if ((error as { code?: string }).code === '23505')
      return json({ error: 'already' })
    return json({ error: 'insert', detail: error.message })
  }

  await sb.from('attendance_throttle').insert({ ip_hash: ipHash })
  return json({ ok: true })
})
