import { supabase, EVENT_BUCKET, publicImageUrl } from './supabase'
import type { PartyEvent, EventDraft, Attendee, EventImage } from './types'
import { PROVINCES } from './types'
import type { OptimizedImage, OptimizedPair } from './imageCompression'
import { toKey } from './dates'
import { getDeviceId } from './device'
import { geocode } from './geocode'

/** Días tras la FECHA DEL EVENTO antes de borrar su imagen para liberar espacio. */
export const IMAGE_RETENTION_DAYS = 30

function client() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

/** Geocodifica la ubicación al guardar para no depender de Nominatim al ver el mapa. */
async function geocodeDraft(
  draft: EventDraft,
): Promise<{ lat: number | null; lon: number | null }> {
  if (!draft.location) return { lat: null, lon: null }
  const provLabel =
    draft.province !== 'andalucia' ? PROVINCES[draft.province] : 'Andalucía'
  const query = [draft.location, provLabel, 'España'].filter(Boolean).join(', ')
  const hit = await geocode(query)
  return hit ? { lat: hit.lat, lon: hit.lon } : { lat: null, lon: null }
}

export async function fetchEventsByRange(
  startKey: string,
  endKey: string,
): Promise<PartyEvent[]> {
  const sb = client()
  const { data, error } = await sb
    .from('events')
    .select('*')
    .gte('event_date', startKey)
    .lte('event_date', endKey)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as PartyEvent[]
}

/** Próxima convocatoria (de hoy en adelante) para el hero. */
export async function fetchNextEvent(): Promise<PartyEvent | null> {
  const sb = client()
  const today = toKey(new Date())
  const { data, error } = await sb
    .from('events')
    .select('*')
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: true })
    .limit(1)
  if (error) throw error
  return (data?.[0] ?? null) as PartyEvent | null
}

async function uploadImage(
  eventDate: string,
  image: OptimizedImage,
): Promise<{ path: string; width: number; height: number }> {
  const sb = client()
  const path = `${eventDate}/${crypto.randomUUID()}.webp`
  const { error } = await sb.storage.from(EVENT_BUCKET).upload(path, image.file, {
    contentType: 'image/webp',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  return { path, width: image.width, height: image.height }
}

/** Sube una imagen de galería: versión grande + miniatura. */
async function uploadPair(
  eventDate: string,
  pair: OptimizedPair,
): Promise<EventImage> {
  const full = await uploadImage(eventDate, pair.full)
  const thumb = await uploadImage(eventDate, pair.thumb)
  return {
    path: full.path,
    width: full.width,
    height: full.height,
    thumb: thumb.path,
  }
}

/** Todas las rutas de almacenamiento de una imagen de galería (grande + mini). */
function imagePaths(img: EventImage): string[] {
  return img.thumb ? [img.path, img.thumb] : [img.path]
}

export async function createEvent(
  draft: EventDraft,
  image: OptimizedImage | null,
  galleryNew: OptimizedPair[] = [],
): Promise<void> {
  const sb = client()
  let image_path: string | null = null
  let image_width: number | null = null
  let image_height: number | null = null

  if (image) {
    const up = await uploadImage(draft.event_date, image)
    image_path = up.path
    image_width = up.width
    image_height = up.height
  }

  const images: EventImage[] = []
  for (const pair of galleryNew) {
    images.push(await uploadPair(draft.event_date, pair))
  }

  const { lat, lon } = await geocodeDraft(draft)

  const { error } = await sb
    .from('events')
    .insert({ ...draft, image_path, image_width, image_height, images, lat, lon })

  if (error) {
    const orphans = [
      ...(image_path ? [image_path] : []),
      ...images.flatMap(imagePaths),
    ]
    if (orphans.length) await sb.storage.from(EVENT_BUCKET).remove(orphans)
    throw error
  }
}

export async function updateEvent(
  existing: PartyEvent,
  draft: EventDraft,
  image: OptimizedImage | null,
  removeImage: boolean,
  galleryKeep: EventImage[] = [],
  galleryNew: OptimizedPair[] = [],
): Promise<void> {
  const sb = client()
  let image_path = existing.image_path
  let image_width = existing.image_width
  let image_height = existing.image_height
  const orphans: string[] = []

  if (image) {
    const up = await uploadImage(draft.event_date, image)
    if (existing.image_path) orphans.push(existing.image_path)
    image_path = up.path
    image_width = up.width
    image_height = up.height
  } else if (removeImage && existing.image_path) {
    orphans.push(existing.image_path)
    image_path = null
    image_width = null
    image_height = null
  }

  // Galería: conserva las que siguen + sube las nuevas; el resto, a borrar.
  const keptPaths = new Set(galleryKeep.map((g) => g.path))
  for (const img of existing.images ?? []) {
    if (!keptPaths.has(img.path)) orphans.push(...imagePaths(img))
  }
  const uploadedNew: EventImage[] = []
  for (const pair of galleryNew) {
    uploadedNew.push(await uploadPair(draft.event_date, pair))
  }
  const images = [...galleryKeep, ...uploadedNew]

  // Solo geocodificamos de nuevo si cambió la ubicación; si no, reutilizamos
  // las coordenadas guardadas (más rápido y menos peticiones a Nominatim).
  const locationUnchanged =
    (draft.location ?? null) === (existing.location ?? null)
  const { lat, lon } = locationUnchanged
    ? { lat: existing.lat, lon: existing.lon }
    : await geocodeDraft(draft)

  const { error } = await sb
    .from('events')
    .update({ ...draft, image_path, image_width, image_height, images, lat, lon })
    .eq('id', existing.id)
  if (error) throw error

  if (orphans.length) await sb.storage.from(EVENT_BUCKET).remove(orphans)
}

export async function deleteEvent(ev: PartyEvent): Promise<void> {
  const sb = client()
  const { error } = await sb.from('events').delete().eq('id', ev.id)
  if (error) throw error
  const paths = [
    ...(ev.image_path ? [ev.image_path] : []),
    ...(ev.images ?? []).flatMap(imagePaths),
  ]
  if (paths.length) await sb.storage.from(EVENT_BUCKET).remove(paths)
}

/**
 * Auto-limpieza: borra las IMÁGENES (grande + miniaturas + galería) de los
 * eventos cuya fecha ya pasó hace más de `retentionDays` días. Mantiene el
 * evento (solo el texto) y libera almacenamiento. Requiere sesión admin.
 */
export async function cleanupExpiredImages(
  retentionDays = IMAGE_RETENTION_DAYS,
): Promise<number> {
  const sb = client()
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - retentionDays)
  const cutoffKey = toKey(cutoff)

  const { data, error } = await sb
    .from('events')
    .select('id, image_path, images')
    .lt('event_date', cutoffKey)
  if (error) throw error

  const rows = (data ?? []) as {
    id: string
    image_path: string | null
    images: EventImage[] | null
  }[]

  const paths: string[] = []
  const ids: string[] = []
  for (const r of rows) {
    const rowPaths = [
      ...(r.image_path ? [r.image_path] : []),
      ...(r.images ?? []).flatMap(imagePaths),
    ]
    if (rowPaths.length) {
      paths.push(...rowPaths)
      ids.push(r.id)
    }
  }
  if (!paths.length) return 0

  await sb.storage.from(EVENT_BUCKET).remove(paths)

  const { error: upErr } = await sb
    .from('events')
    .update({ image_path: null, image_width: null, image_height: null, images: [] })
    .in('id', ids)
  if (upErr) throw upErr

  return ids.length
}

// ---------------------------------------------------------------------------
// Asistencias (RSVP)
// ---------------------------------------------------------------------------

/** Se lanza cuando este dispositivo ya confirmó la asistencia al evento. */
export class AlreadyConfirmedError extends Error {
  constructor() {
    super('Ya has confirmado tu asistencia a este evento.')
    this.name = 'AlreadyConfirmedError'
  }
}

/**
 * Cualquiera puede confirmar asistencia (sin login). Nombre y apellido
 * obligatorios. Se envía un id anónimo de dispositivo: la base de datos impide
 * más de una confirmación por dispositivo y evento, y limita el ritmo de envíos.
 */
export async function addAttendance(
  eventId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const sb = client()
  const first = firstName.trim()
  const last = lastName.trim()
  const device_id = getDeviceId()

  // 1) Vía Edge Function (anti-abuso por IP). Devuelve siempre 200 con {ok}/{error}.
  try {
    const { data, error } = await sb.functions.invoke('submit-attendance', {
      body: { event_id: eventId, first_name: first, last_name: last, device_id },
    })
    if (!error && data) {
      const d = data as { ok?: boolean; error?: string }
      if (d.ok) return
      if (d.error === 'already') throw new AlreadyConfirmedError()
      if (d.error === 'rate_limited')
        throw new Error(
          'Demasiadas confirmaciones desde tu conexión. Inténtalo más tarde.',
        )
      if (d.error === 'name')
        throw new Error('Usa solo letras en el nombre y el apellido.')
      // otros errores → probamos inserción directa (abajo)
    }
  } catch (e) {
    if (e instanceof AlreadyConfirmedError) throw e
    if (e instanceof Error && /Demasiadas|Usa solo/.test(e.message)) throw e
    // invoke falló (función no desplegada / sin red) → fallback
  }

  // 2) Fallback: inserción directa (RLS + límites de BD por dispositivo y evento).
  const { error } = await sb.from('attendances').insert({
    event_id: eventId,
    first_name: first,
    last_name: last,
    device_id,
  })
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new AlreadyConfirmedError()
    }
    throw error
  }
}

/**
 * Recuento público de asistentes por evento (solo el número, nunca los nombres).
 * Usa una función RPC `attendance_counts` de Supabase con permisos seguros.
 */
export async function fetchAttendanceCounts(
  eventIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (!eventIds.length) return map
  const sb = client()
  const { data, error } = await sb.rpc('attendance_counts', {
    event_ids: eventIds,
  })
  if (error) throw error
  for (const row of (data ?? []) as { event_id: string; total: number }[]) {
    map.set(row.event_id, Number(row.total))
  }
  return map
}

/** Solo administradores: lista de nombres por evento (la RLS bloquea al público). */
export async function fetchAttendeesByEvents(
  eventIds: string[],
): Promise<Map<string, Attendee[]>> {
  const map = new Map<string, Attendee[]>()
  if (!eventIds.length) return map
  const sb = client()
  const { data, error } = await sb
    .from('attendances')
    .select('id, event_id, first_name, last_name, created_at')
    .in('event_id', eventIds)
    .order('created_at', { ascending: true })
  if (error) throw error
  for (const row of (data ?? []) as (Attendee & { event_id: string })[]) {
    const arr = map.get(row.event_id)
    const att: Attendee = {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      created_at: row.created_at,
    }
    if (arr) arr.push(att)
    else map.set(row.event_id, [att])
  }
  return map
}

/** Registra (1ª visita) el id anónimo de dispositivo en Supabase. Best-effort. */
export async function registerDevice(): Promise<void> {
  if (!supabase) return
  try {
    await supabase
      .from('devices')
      .upsert({ id: getDeviceId() }, { onConflict: 'id', ignoreDuplicates: true })
  } catch {
    /* no crítico */
  }
}

/** Admin: añade un asistente manualmente (id de dispositivo único por fila). */
export async function addAttendanceAdmin(
  eventId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const sb = client()
  const { error } = await sb.from('attendances').insert({
    event_id: eventId,
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    device_id: crypto.randomUUID(),
  })
  if (error) throw error
}

/** Admin: elimina un asistente. */
export async function deleteAttendee(id: string): Promise<void> {
  const sb = client()
  const { error } = await sb.from('attendances').delete().eq('id', id)
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Administración: estadísticas, almacenamiento y exportación
// ---------------------------------------------------------------------------

export async function fetchAllEvents(): Promise<PartyEvent[]> {
  const sb = client()
  const { data, error } = await sb
    .from('events')
    .select('*')
    .order('event_date', { ascending: true })
  if (error) throw error
  return (data ?? []) as PartyEvent[]
}

export type AttendeeRow = Attendee & { event_id: string }

export async function fetchAllAttendees(): Promise<AttendeeRow[]> {
  const sb = client()
  const { data, error } = await sb
    .from('attendances')
    .select('id, event_id, first_name, last_name, created_at')
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as AttendeeRow[]
}

export async function fetchStorageUsage(): Promise<{
  totalBytes: number
  fileCount: number
}> {
  const sb = client()
  const { data, error } = await sb.rpc('storage_usage')
  if (error) throw error
  const row = (data?.[0] ?? {}) as { total_bytes?: number; file_count?: number }
  return {
    totalBytes: Number(row.total_bytes ?? 0),
    fileCount: Number(row.file_count ?? 0),
  }
}

export { publicImageUrl }
