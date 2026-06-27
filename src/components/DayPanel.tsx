import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { Modal } from './Modal'
import type { Attendee, PartyEvent } from '../lib/types'
import { PROVINCES } from '../lib/types'
import { formatLongDate } from '../lib/dates'
import {
  publicImageUrl,
  addAttendance,
  addAttendanceAdmin,
  deleteAttendee,
  fetchAttendeesByEvents,
  AlreadyConfirmedError,
} from '../lib/events'
import { geocode, PROVINCE_CENTER, type LatLng } from '../lib/geocode'
import { googleCalendarUrl, addToAppleCalendar } from '../lib/calendar-export'
import { CategoryTag, formatTime } from './EventBits'
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconClock,
  IconMapPin,
  IconCalendar,
  IconSpinner,
  IconUsers,
  IconCheck,
  IconClose,
  IconShare,
  IconArrowUpRight,
  IconChevronLeft,
  IconChevronRight,
} from './icons'

const LazyMap = lazy(() => import('./LeafletMap'))

const NAME_RE = /^[\p{L}][\p{L} .'-]*$/u

interface GalleryImage {
  full: string
  thumb: string
}

/** Imagen principal (image_path) + galería (images[]) en orden de visualización. */
function eventGallery(ev: PartyEvent): GalleryImage[] {
  const out: GalleryImage[] = []
  const primary = publicImageUrl(ev.image_path)
  if (primary) out.push({ full: primary, thumb: primary })
  for (const img of ev.images ?? []) {
    const full = publicImageUrl(img.path)
    if (!full) continue
    out.push({ full, thumb: publicImageUrl(img.thumb ?? img.path) ?? full })
  }
  return out
}

interface LightboxState {
  images: GalleryImage[]
  index: number
  title: string
}

interface DayPanelProps {
  open: boolean
  onClose: () => void
  dateKey: string | null
  events: PartyEvent[]
  isAdmin: boolean
  counts: Map<string, number>
  onAttendanceChange: () => void
  onAdd: () => void
  onEdit: (ev: PartyEvent) => void
  onDelete: (ev: PartyEvent) => Promise<void>
}

export function DayPanel({
  open,
  onClose,
  dateKey,
  events,
  isAdmin,
  counts,
  onAttendanceChange,
  onAdd,
  onEdit,
  onDelete,
}: DayPanelProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [attendees, setAttendees] = useState<Map<string, Attendee[]>>(new Map())
  const [loadingAttendees, setLoadingAttendees] = useState(false)
  const [lightbox, setLightbox] = useState<LightboxState | null>(null)

  const idsKey = useMemo(() => events.map((e) => e.id).join(','), [events])

  const reloadAttendees = useCallback(async () => {
    if (!open || !isAdmin || !events.length) {
      setAttendees(new Map())
      return
    }
    setLoadingAttendees(true)
    try {
      setAttendees(await fetchAttendeesByEvents(events.map((e) => e.id)))
    } catch {
      setAttendees(new Map())
    } finally {
      setLoadingAttendees(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAdmin, idsKey])

  useEffect(() => {
    void reloadAttendees()
  }, [reloadAttendees])

  async function handleAdminAddAttendee(
    eventId: string,
    first: string,
    last: string,
  ) {
    await addAttendanceAdmin(eventId, first, last)
    await reloadAttendees()
    onAttendanceChange()
  }

  async function handleAdminDeleteAttendee(id: string) {
    await deleteAttendee(id)
    await reloadAttendees()
    onAttendanceChange()
  }

  async function remove(ev: PartyEvent) {
    setBusyId(ev.id)
    try {
      await onDelete(ev)
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="Agenda del día"
      title={dateKey ? formatLongDate(dateKey) : ''}
      size="lg"
      ariaLabel="Convocatorias del día"
    >
      {isAdmin && (
        <button type="button" onClick={onAdd} className="btn-mint mb-6 w-full">
          <IconPlus className="h-5 w-5" />
          Añadir convocatoria a este día
        </button>
      )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-hairline py-12 text-center">
          <IconCalendar className="h-9 w-9 text-content/25" />
          <p className="text-content/55">
            No hay convocatorias este día.
            {isAdmin && ' Añade la primera con el botón de arriba.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-6">
          {events.map((ev) => {
            const gallery = eventGallery(ev)
            const hero = gallery[0] ?? null
            const heroAspect =
              ev.image_path && ev.image_width && ev.image_height
                ? `${ev.image_width} / ${ev.image_height}`
                : '16 / 9'
            const strip = gallery.slice(1)
            const time = formatTime(ev.start_time)
            const isConfirming = confirmId === ev.id
            const isBusy = busyId === ev.id

            return (
              <li
                key={ev.id}
                className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card"
              >
                {hero && (
                  <button
                    type="button"
                    onClick={() =>
                      setLightbox({
                        images: gallery,
                        index: 0,
                        title: ev.title,
                      })
                    }
                    className="group block w-full overflow-hidden bg-forest/5"
                    style={{ aspectRatio: heroAspect }}
                    aria-label="Ampliar imagen"
                  >
                    <img
                      src={hero.full}
                      alt={ev.title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </button>
                )}

                <div className="p-5 sm:p-6">
                  <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <CategoryTag category={ev.category} />
                    {ev.province && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-content/70">
                        <IconMapPin className="h-4 w-4 text-mint-600" />
                        {PROVINCES[ev.province]}
                      </span>
                    )}
                    {time && (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-content/70">
                        <IconClock className="h-4 w-4" />
                        {time}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-xl font-extrabold leading-tight tracking-tighter text-title sm:text-2xl">
                    {ev.title}
                  </h3>

                  {ev.description && (
                    <p className="mt-3 whitespace-pre-line text-[0.97rem] leading-relaxed text-content/75">
                      {ev.description}
                    </p>
                  )}

                  {strip.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-5">
                      {strip.map((g, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setLightbox({
                              images: gallery,
                              index: i + 1,
                              title: ev.title,
                            })
                          }
                          className="aspect-square overflow-hidden rounded-lg border border-hairline bg-forest/5"
                          aria-label={`Ampliar imagen ${i + 2}`}
                        >
                          <img
                            src={g.thumb}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-300 hover:scale-110"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {ev.location && <EventLocation event={ev} />}

                  <AddToCalendar event={ev} />
                  <ShareInline event={ev} />

                  <AttendanceBlock
                    event={ev}
                    count={counts.get(ev.id) ?? 0}
                    isAdmin={isAdmin}
                    attendees={attendees.get(ev.id) ?? []}
                    loadingAttendees={loadingAttendees}
                    onAdded={onAttendanceChange}
                    onAdminAdd={handleAdminAddAttendee}
                    onAdminDelete={handleAdminDeleteAttendee}
                  />

                  {isAdmin && (
                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                      {!isConfirming ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onEdit(ev)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-title transition-colors hover:border-forest/40 hover:bg-content/[0.06]"
                          >
                            <IconPencil className="h-4 w-4" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(ev.id)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-red-200 px-3.5 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                          >
                            <IconTrash className="h-4 w-4" />
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <div className="flex w-full flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-content/70">
                            ¿Eliminar esta convocatoria?
                          </span>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => remove(ev)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
                          >
                            {isBusy ? (
                              <IconSpinner className="h-4 w-4" />
                            ) : (
                              <IconTrash className="h-4 w-4" />
                            )}
                            Sí, eliminar
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmId(null)}
                            className="rounded-full px-3 py-2 text-sm font-semibold text-content/60 hover:text-content"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          title={lightbox.title}
          onClose={() => setLightbox(null)}
        />
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Lightbox (visor de galería a pantalla completa)                     */
/* ------------------------------------------------------------------ */

function Lightbox({
  images,
  index,
  title,
  onClose,
}: {
  images: GalleryImage[]
  index: number
  title: string
  onClose: () => void
}) {
  const [i, setI] = useState(index)
  const count = images.length
  const touchX = useRef<number | null>(null)

  const go = useCallback(
    (d: number) => setI((p) => (p + d + count) % count),
    [count],
  )

  useEffect(() => {
    setI(index)
  }, [index])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  // Bloquea el scroll del fondo mientras el visor está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null || count < 2) return
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
    touchX.current = null
  }

  const img = images[i]
  if (!img) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-fade"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de imágenes"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 grid h-11 w-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <IconClose className="h-6 w-6" />
      </button>

      <img
        src={img.full}
        alt={title}
        className="max-h-[88vh] max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(-1)
            }}
            aria-label="Imagen anterior"
            className="absolute left-3 top-1/2 grid h-12 w-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
          >
            <IconChevronLeft className="h-7 w-7" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              go(1)
            }}
            aria-label="Imagen siguiente"
            className="absolute right-3 top-1/2 grid h-12 w-12 -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
          >
            <IconChevronRight className="h-7 w-7" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white">
            {i + 1} / {count}
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ubicación + mapa (Leaflet / OpenStreetMap)                          */
/* ------------------------------------------------------------------ */

function locationQuery(event: PartyEvent): string {
  const provLabel =
    event.province && event.province !== 'andalucia'
      ? PROVINCES[event.province]
      : 'Andalucía'
  return [event.location, provLabel, 'España'].filter(Boolean).join(', ')
}

function EventLocation({ event }: { event: PartyEvent }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<LatLng | null>(null)
  const [approximate, setApproximate] = useState(false)

  const query = locationQuery(event)
  const q = encodeURIComponent(query)
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${q}`
  const appleUrl = `https://maps.apple.com/?q=${q}`

  async function reveal() {
    setOpen(true)
    if (coords) return
    // Coordenadas ya geocodificadas al guardar → mapa instantáneo.
    if (event.lat != null && event.lon != null) {
      setCoords({ lat: event.lat, lon: event.lon })
      setApproximate(false)
      return
    }
    setLoading(true)
    const hit = await geocode(query)
    if (hit) {
      setCoords(hit)
      setApproximate(false)
    } else {
      setCoords(PROVINCE_CENTER[event.province ?? 'andalucia'])
      setApproximate(true)
    }
    setLoading(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={reveal}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-title transition-colors hover:border-mint-600 hover:bg-mint/5"
      >
        <IconMapPin className="h-4 w-4 text-mint-600" />
        Mostrar ubicación
      </button>
    )
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-hairline">
      <div className="flex items-start gap-2 px-4 py-3">
        <IconMapPin className="mt-0.5 h-4 w-4 shrink-0 text-mint-600" />
        <p className="text-sm font-medium text-content/80">{event.location}</p>
      </div>

      {loading || !coords ? (
        <div className="flex aspect-video w-full items-center justify-center bg-forest/5 text-content/40">
          <IconSpinner className="h-6 w-6" />
        </div>
      ) : (
        <Suspense
          fallback={
            <div className="flex aspect-video w-full items-center justify-center bg-forest/5 text-content/40">
              <IconSpinner className="h-6 w-6" />
            </div>
          }
        >
          <LazyMap
            lat={coords.lat}
            lon={coords.lon}
            zoom={approximate ? 12 : 16}
            label={event.location ?? undefined}
          />
        </Suspense>
      )}

      {approximate && !loading && (
        <p className="bg-amber-50 px-4 py-2 text-xs text-amber-800">
          Ubicación aproximada por zona (no se pudo localizar la dirección
          exacta).
        </p>
      )}

      <div className="flex flex-col border-t border-hairline sm:flex-row">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold text-green-action transition-colors hover:bg-mint/10"
        >
          <IconArrowUpRight className="h-4 w-4" />
          Google Maps
        </a>
        <a
          href={appleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 border-t border-hairline py-3 text-sm font-semibold text-title transition-colors hover:bg-content/[0.06] sm:border-l sm:border-t-0"
        >
          <IconArrowUpRight className="h-4 w-4" />
          Apple Maps
        </a>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Añadir al calendario                                                */
/* ------------------------------------------------------------------ */

function AddToCalendar({ event }: { event: PartyEvent }) {
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-title transition-colors hover:border-mint-600 hover:bg-mint/5"
      >
        <IconCalendar className="h-4 w-4 text-mint-600" />
        Añadir a mi calendario
      </button>
    )
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <a
        href={googleCalendarUrl(event)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-2 text-sm font-semibold text-cream transition-colors hover:bg-forest-800"
      >
        <IconCalendar className="h-4 w-4" />
        Google Calendar
      </a>
      <button
        type="button"
        onClick={() => addToAppleCalendar(event)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-title transition-colors hover:border-forest/40 hover:bg-content/[0.06]"
      >
        <IconCalendar className="h-4 w-4" />
        Apple Calendar
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Asistencia (RSVP)                                                   */
/* ------------------------------------------------------------------ */

function attendedKey(id: string) {
  return `aa_attended_${id}`
}

function eventDeepLink(id: string): string {
  return `${window.location.origin}${window.location.pathname}#/evento/${id}`
}

function ShareInline({ event }: { event: PartyEvent }) {
  const [open, setOpen] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const url = eventDeepLink(event.id)
  const canShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  async function reveal() {
    setOpen(true)
    if (qr) return
    try {
      const QRCode = (await import('qrcode')).default
      setQr(
        await QRCode.toDataURL(url, {
          margin: 1,
          width: 320,
          color: { dark: '#06251B', light: '#ffffff' },
        }),
      )
    } catch {
      setQr(null)
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({
        title: event.title,
        text: 'Convocatoria de Adelante Andalucía',
        url,
      })
    } catch {
      /* cancelado */
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* sin permiso */
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={reveal}
        className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-title transition-colors hover:border-mint-600 hover:bg-mint/5"
      >
        <IconShare className="h-4 w-4 text-mint-600" />
        Compartir
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-2xl border border-hairline bg-surface-2/40 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {qr ? (
          <img
            src={qr}
            alt="Código QR del evento"
            className="h-32 w-32 shrink-0 self-center rounded-xl border border-hairline bg-white sm:self-auto"
          />
        ) : (
          <div className="grid h-32 w-32 shrink-0 self-center place-items-center rounded-xl border border-hairline text-content/40 sm:self-auto">
            <IconSpinner className="h-5 w-5" />
          </div>
        )}
        <div className="w-full min-w-0 flex-1">
          <p className="mb-2 text-sm text-content/65">
            Escanea el QR o comparte el enlace para que más gente se una.
          </p>
          <div className="mb-3 truncate rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs text-content/70">
            {url}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canShare && (
              <button type="button" onClick={nativeShare} className="btn-mint !py-2.5 text-sm">
                <IconShare className="h-4 w-4" />
                Compartir
              </button>
            )}
            <button type="button" onClick={copy} className="btn-ghost !py-2.5 text-sm">
              {copied ? (
                <>
                  <IconCheck className="h-4 w-4" />
                  Copiado
                </>
              ) : (
                'Copiar enlace'
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 py-2 text-sm font-semibold text-content/55 hover:text-title"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AttendanceBlock({
  event,
  count,
  isAdmin,
  attendees,
  loadingAttendees,
  onAdded,
  onAdminAdd,
  onAdminDelete,
}: {
  event: PartyEvent
  count: number
  isAdmin: boolean
  attendees: Attendee[]
  loadingAttendees: boolean
  onAdded: () => void
  onAdminAdd: (eventId: string, first: string, last: string) => Promise<void>
  onAdminDelete: (id: string) => Promise<void>
}) {
  const total = isAdmin ? Math.max(count, attendees.length) : count

  return (
    <div className="mt-5 border-t border-hairline pt-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-title">
        <IconUsers className="h-4 w-4 text-mint-600" />
        {total} {total === 1 ? 'persona confirmada' : 'personas confirmadas'}
      </div>

      {isAdmin ? (
        <AdminAttendees
          eventId={event.id}
          attendees={attendees}
          loading={loadingAttendees}
          onAdd={onAdminAdd}
          onDelete={onAdminDelete}
        />
      ) : (
        <UserAttend event={event} onAdded={onAdded} />
      )}
    </div>
  )
}

function AdminAttendees({
  eventId,
  attendees,
  loading,
  onAdd,
  onDelete,
}: {
  eventId: string
  attendees: Attendee[]
  loading: boolean
  onAdd: (eventId: string, first: string, last: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const f = first.trim()
    const l = last.trim()
    if (!f || !l) {
      setError('Indica nombre y apellido.')
      return
    }
    if (!NAME_RE.test(f) || !NAME_RE.test(l)) {
      setError('Usa solo letras en el nombre y el apellido.')
      return
    }
    setSaving(true)
    try {
      await onAdd(eventId, f, l)
      setFirst('')
      setLast('')
      setShowForm(false)
    } catch {
      setError('No se pudo añadir. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setBusyId(id)
    try {
      await onDelete(id)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mt-3">
      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-content/50">
          <IconSpinner className="h-4 w-4" />
          Cargando asistentes…
        </p>
      ) : attendees.length ? (
        <ul className="flex flex-wrap gap-2">
          {attendees.map((a) => (
            <li
              key={a.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-3 pr-1 text-sm font-medium text-content/80"
            >
              {a.first_name} {a.last_name}
              <button
                type="button"
                onClick={() => remove(a.id)}
                disabled={busyId === a.id}
                aria-label={`Eliminar a ${a.first_name} ${a.last_name}`}
                className="grid h-6 w-6 cursor-pointer place-items-center rounded-full text-content/45 transition-colors hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
              >
                {busyId === a.id ? (
                  <IconSpinner className="h-3.5 w-3.5" />
                ) : (
                  <IconClose className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-content/50">Aún no se ha apuntado nadie.</p>
      )}

      {showForm ? (
        <form
          onSubmit={submit}
          className="mt-3 rounded-2xl border border-hairline bg-surface-2/40 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor={`afn-${eventId}`}>
                Nombre
              </label>
              <input
                id={`afn-${eventId}`}
                className="field"
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                maxLength={60}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor={`aln-${eventId}`}>
                Apellido
              </label>
              <input
                id={`aln-${eventId}`}
                className="field"
                value={last}
                onChange={(e) => setLast(e.target.value)}
                maxLength={80}
                required
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-ghost"
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <IconSpinner className="h-5 w-5" />
                  Añadiendo…
                </>
              ) : (
                <>
                  <IconPlus className="h-5 w-5" />
                  Añadir asistente
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-hairline px-3.5 py-2 text-sm font-semibold text-title transition-colors hover:border-mint-600 hover:bg-mint/5"
        >
          <IconPlus className="h-4 w-4 text-mint-600" />
          Añadir asistente
        </button>
      )}
    </div>
  )
}

function UserAttend({
  event,
  onAdded,
}: {
  event: PartyEvent
  onAdded: () => void
}) {
  const [confirmed, setConfirmed] = useState(() => {
    try {
      return localStorage.getItem(attendedKey(event.id)) === '1'
    } catch {
      return false
    }
  })
  const [open, setOpen] = useState(false)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function markConfirmed() {
    try {
      localStorage.setItem(attendedKey(event.id), '1')
    } catch {
      /* almacenamiento no disponible */
    }
    setConfirmed(true)
  }

  if (confirmed) {
    return (
      <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-mint/15 px-4 py-2 text-sm font-semibold text-green-action">
        <IconCheck className="h-4 w-4" />
        Asistencia confirmada
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-mint mt-3"
      >
        <IconPlus className="h-5 w-5" />
        Añadir asistencia
      </button>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const f = first.trim()
    const l = last.trim()
    if (!f || !l) {
      setError('Indica al menos un nombre y un apellido.')
      return
    }
    if (!NAME_RE.test(f) || !NAME_RE.test(l)) {
      setError('Usa solo letras en el nombre y el apellido.')
      return
    }
    setSaving(true)
    try {
      await addAttendance(event.id, f, l)
      markConfirmed()
      onAdded()
    } catch (err) {
      if (err instanceof AlreadyConfirmedError) {
        markConfirmed()
        onAdded()
      } else {
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'No se pudo confirmar la asistencia. Inténtalo de nuevo.',
        )
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 rounded-2xl border border-hairline bg-surface-2/40 p-4"
    >
      <p className="mb-3 text-sm leading-relaxed text-content/75">
        Vas a <strong className="font-semibold">confirmar tu asistencia</strong> a
        este evento. Asegúrate de que vas a ir: al no haber inicio de sesión,{' '}
        <strong className="font-semibold">no podrás eliminarla</strong> una vez
        confirmada.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`fn-${event.id}`}>
            Nombre
          </label>
          <input
            id={`fn-${event.id}`}
            className="field"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            autoComplete="given-name"
            maxLength={60}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor={`ln-${event.id}`}>
            Apellido
          </label>
          <input
            id={`ln-${event.id}`}
            className="field"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            autoComplete="family-name"
            maxLength={80}
            required
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost"
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? (
            <>
              <IconSpinner className="h-5 w-5" />
              Confirmando…
            </>
          ) : (
            <>
              <IconCheck className="h-5 w-5" />
              Confirmar asistencia
            </>
          )}
        </button>
      </div>
    </form>
  )
}
