// Edge Function: limpieza programada. Borra imágenes y asistencias de eventos
// con más de RETENTION_DAYS días desde su fecha (ahorra almacenamiento + privacidad).
//
// Desplegar:  supabase functions deploy cleanup
// Variable (Secrets): CRON_SECRET (texto aleatorio).
// Programar (SQL Editor, requiere pg_cron + pg_net):
//   select cron.schedule('aa-cleanup','0 4 * * *', $$
//     select net.http_post(
//       url:='https://TU-PROYECTO.functions.supabase.co/cleanup',
//       headers:='{"x-cron-secret":"TU_SECRETO"}'::jsonb) $$);
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const RETENTION_DAYS = 30
const BUCKET = 'event-images'

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (secret && req.headers.get('x-cron-secret') !== secret)
    return new Response('forbidden', { status: 403 })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10)

  const { data: past } = await sb
    .from('events')
    .select('id, image_path, images')
    .lt('event_date', cutoff)

  const rows = past ?? []
  const paths: string[] = []
  for (const r of rows) {
    if (r.image_path) paths.push(r.image_path as string)
    for (const im of (r.images ?? []) as Array<{ path?: string }>) {
      if (im?.path) paths.push(im.path)
    }
  }

  if (paths.length) await sb.storage.from(BUCKET).remove(paths)

  const ids = rows.map((r) => r.id)
  if (ids.length) {
    await sb
      .from('events')
      .update({ image_path: null, image_width: null, image_height: null, images: [] })
      .in('id', ids)
    await sb.from('attendances').delete().in('event_id', ids)
  }

  // Limpia el registro anti-abuso (hashes de IP) de más de 1 día.
  await sb
    .from('attendance_throttle')
    .delete()
    .lt('created_at', new Date(Date.now() - 86_400_000).toISOString())

  return new Response(
    JSON.stringify({ ok: true, images_removed: paths.length, events: ids.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
