import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  addMonths,
  currentMonth,
  cursorIndex,
  isSameMonth,
  monthLabel,
  monthRange,
  toKey,
  type MonthCursor,
} from '../lib/dates'
import type { PartyEvent, ProvinceFilter, CategoryFilter } from '../lib/types'
import { CATEGORY_ORDER, CATEGORIES } from '../lib/types'
import {
  fetchEventsByRange,
  deleteEvent,
  cleanupExpiredImages,
  fetchAttendanceCounts,
} from '../lib/events'
import {
  readEventCache,
  writeEventCache,
  readCountsCache,
  writeCountsCache,
} from '../lib/eventCache'
import { Calendar, CalendarSkeleton } from './Calendar'
import { AgendaList } from './AgendaList'
import type { CalendarView } from './FilterBar'
import { DayPanel } from './DayPanel'
import { Toast } from './Toast'
import { CategoryDot } from './EventBits'
import { Reveal } from './Reveal'
import { IconMapPin, IconSpinner } from './icons'

const LeafletMultiMap = lazy(() => import('./LeafletMultiMap'))

// El editor (y la librería de compresión de imágenes) solo se cargan en admin.
const EventEditor = lazy(() =>
  import('./EventEditor').then((m) => ({ default: m.EventEditor })),
)

/** Enlace profundo a un evento: ruta real /evento/<id> o, por compatibilidad, #/evento/<id>. */
function parseEventRoute(): string | null {
  const p = window.location.pathname.match(/^\/evento\/([\w-]+)\/?$/)
  if (p) return p[1]
  const h = window.location.hash.match(/^#\/?evento\/([\w-]+)$/)
  return h ? h[1] : null
}

/**
 * Sección de calendario. `admin = false` (web pública) → solo lectura, sin
 * ninguna acción ni aviso de administración. `admin = true` → gestión completa
 * (solo se usa dentro de la página de administración).
 */
export function CalendarSection({
  admin = false,
  primary = false,
}: {
  admin?: boolean
  primary?: boolean
}) {
  const configured = isSupabaseConfigured

  const min = useMemo(() => currentMonth(), [])
  const max = useMemo(() => addMonths(min, 1), [min])
  const range = useMemo(
    () => ({ start: monthRange(min).start, end: monthRange(max).end }),
    [min, max],
  )

  const [cursor, setCursor] = useState<MonthCursor>(min)
  const [events, setEvents] = useState<PartyEvent[]>(() =>
    configured ? (readEventCache(range.start, range.end) ?? []) : [],
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [dayKey, setDayKey] = useState<string | null>(null)
  const [dayOpen, setDayOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<PartyEvent | null>(null)
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null)
  const [province, setProvince] = useState<ProvinceFilter>('all')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [view, setView] = useState<CalendarView>('month')
  const [counts, setCounts] = useState<Map<string, number>>(() =>
    configured ? (readCountsCache(range.start, range.end) ?? new Map()) : new Map(),
  )
  const [deepLinkId, setDeepLinkId] = useState<string | null>(() =>
    parseEventRoute(),
  )
  const [focusEventId, setFocusEventId] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const cleaned = useRef(false)

  const showToast = (msg: string) => setToast({ id: Date.now(), msg })

  const refresh = useCallback(async () => {
    if (!configured) {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      // Auto-limpieza de imágenes de eventos pasados (una vez por sesión admin),
      // antes de cargar, para no mostrar imágenes que se acaban de borrar.
      if (admin && !cleaned.current) {
        cleaned.current = true
        try {
          await cleanupExpiredImages()
        } catch {
          /* limpieza best-effort: si falla, no bloquea la carga */
        }
      }
      const data = await fetchEventsByRange(range.start, range.end)
      setEvents(data)
      writeEventCache(range.start, range.end, data)
      try {
        const c = await fetchAttendanceCounts(data.map((e) => e.id))
        setCounts(c)
        writeCountsCache(range.start, range.end, c)
      } catch {
        /* los recuentos no son críticos para mostrar el calendario */
      }
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'No se pudieron cargar los eventos.',
      )
    } finally {
      setLoading(false)
    }
  }, [admin, configured, range.start, range.end])

  const refreshCounts = useCallback(async () => {
    if (!configured) return
    try {
      setCounts(await fetchAttendanceCounts(events.map((e) => e.id)))
    } catch {
      /* best-effort */
    }
  }, [configured, events])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Enlace profundo a un evento (/evento/<id> o #/evento/<id>): abre su día.
  useEffect(() => {
    const onNav = () => setDeepLinkId(parseEventRoute())
    window.addEventListener('hashchange', onNav)
    window.addEventListener('popstate', onNav)
    return () => {
      window.removeEventListener('hashchange', onNav)
      window.removeEventListener('popstate', onNav)
    }
  }, [])

  useEffect(() => {
    if (!deepLinkId || events.length === 0) return
    const ev = events.find((e) => e.id === deepLinkId)
    if (ev) {
      setDayKey(ev.event_date)
      setDayOpen(true)
      setFocusEventId(ev.id)
      setDeepLinkId(null)
      // Deja la URL limpia (raíz) tras abrir el evento compartido.
      if (window.location.pathname.startsWith('/evento/')) {
        window.history.replaceState(null, '', '/')
      }
    }
  }, [deepLinkId, events])

  const visibleEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          (province === 'all' || e.province === province) &&
          (category === 'all' || e.category === category),
      ),
    [events, province, category],
  )

  const eventsByDay = useMemo(() => {
    const map = new Map<string, PartyEvent[]>()
    for (const ev of visibleEvents) {
      const arr = map.get(ev.event_date)
      if (arr) arr.push(ev)
      else map.set(ev.event_date, [ev])
    }
    return map
  }, [visibleEvents])

  const dayEvents = dayKey ? (eventsByDay.get(dayKey) ?? []) : []

  const canPrev = cursorIndex(cursor) > cursorIndex(min)
  const canNext = cursorIndex(cursor) < cursorIndex(max)

  function selectDay(key: string) {
    setFocusEventId(null)
    setDayKey(key)
    setDayOpen(true)
  }

  function openNew() {
    setEditing(null)
    setDayOpen(false)
    setEditorOpen(true)
  }

  function openEdit(ev: PartyEvent) {
    setEditing(ev)
    setDayKey(ev.event_date)
    setDayOpen(false)
    setEditorOpen(true)
  }

  function closeEditor() {
    setEditorOpen(false)
    if (dayKey) setDayOpen(true)
  }

  async function handleSaved(msg: string) {
    showToast(msg)
    await refresh()
  }

  async function handleDelete(ev: PartyEvent) {
    await deleteEvent(ev)
    await refresh()
    showToast('Convocatoria eliminada')
  }

  return (
    <section
      id="calendario"
      className={`relative ${
        primary ? 'scroll-mt-24 pb-20 sm:pb-28' : 'scroll-mt-20 py-20 sm:py-28'
      }`}
    >
      <div
        className={`mx-auto w-full max-w-edge edge ${
          primary ? 'relative z-10 -mt-28 lg:-mt-44' : ''
        }`}
      >
        {primary ? (
          <h2 className="sr-only">
            Calendario de convocatorias de Adelante Andalucía
          </h2>
        ) : (
          <Reveal className="mb-10 max-w-3xl sm:mb-14" stagger={0.12}>
            <p className="mb-4 inline-flex items-center gap-2 text-[0.78rem] font-bold uppercase tracking-[0.22em] text-mint-600">
              <span className="h-px w-8 bg-mint-600" />
              {admin ? 'Gestión de la agenda' : 'La agenda del cambio'}
            </p>
            <h2 className="font-display text-[clamp(2.4rem,7vw,5rem)] font-extrabold leading-[0.94] tracking-tightest text-title">
              Calendario de
              <br />
              convocatorias
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-content/70">
              {admin
                ? 'Pulsa cualquier día para añadir, editar o eliminar convocatorias. Las imágenes se optimizan automáticamente antes de subirse.'
                : 'Manifestaciones, concentraciones, asambleas y actos públicos. Pulsa cualquier día marcado para verlo en grande, con su imagen y todos los detalles.'}
            </p>
          </Reveal>
        )}

        {admin && !configured && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong className="font-semibold">Configura Supabase</strong> para
            cargar y publicar convocatorias. Copia <code>.env.example</code> a{' '}
            <code>.env</code> con tus claves (ver <code>README.md</code>).
          </div>
        )}

        {loadError && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-full border border-red-300 px-4 py-1.5 font-semibold hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading && configured && events.length === 0 && !loadError ? (
          <CalendarSkeleton surface={primary ? 'elevated' : 'plain'} />
        ) : view === 'list' ? (
          <AgendaList
            events={visibleEvents}
            counts={counts}
            surface={primary ? 'elevated' : 'plain'}
            province={province}
            onProvinceChange={setProvince}
            category={category}
            onCategoryChange={setCategory}
            view={view}
            onViewChange={setView}
            onSelectDay={selectDay}
          />
        ) : (
          <Calendar
            cursor={cursor}
            label={monthLabel(cursor)}
            eventsByDay={eventsByDay}
            isAdmin={admin}
            loading={loading && configured}
            canPrev={canPrev}
            canNext={canNext}
            showTodayButton={!isSameMonth(cursor, min)}
            surface={primary ? 'elevated' : 'plain'}
            province={province}
            onProvinceChange={setProvince}
            category={category}
            onCategoryChange={setCategory}
            view={view}
            onViewChange={setView}
            onPrev={() => canPrev && setCursor((c) => addMonths(c, -1))}
            onNext={() => canNext && setCursor((c) => addMonths(c, 1))}
            onToday={() => setCursor(min)}
            onSelectDay={selectDay}
          />
        )}

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {CATEGORY_ORDER.map((c) => (
              <li
                key={c}
                className="inline-flex items-center gap-2 text-sm text-content/65"
              >
                <CategoryDot category={c} />
                {CATEGORIES[c].label}
              </li>
            ))}
          </ul>
          <p className="text-sm text-content/50">
            Solo se muestran el mes actual y el siguiente.
          </p>
        </div>

        {/* Mapa general de Andalucía (colapsable) */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setMapOpen((o) => !o)}
            aria-expanded={mapOpen}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 py-2.5 text-sm font-semibold text-title transition-colors hover:border-mint-600 hover:bg-mint/5"
          >
            <IconMapPin className="h-4 w-4 text-mint-600" />
            {mapOpen ? 'Ocultar mapa' : 'Ver mapa de convocatorias'}
          </button>

          {mapOpen && (
            <div className="mt-3 overflow-hidden rounded-3xl border border-hairline shadow-card">
              <Suspense
                fallback={
                  <div className="grid h-[320px] place-items-center bg-surface-2/40 text-content/40">
                    <IconSpinner className="h-6 w-6" />
                  </div>
                }
              >
                <LeafletMultiMap
                  events={visibleEvents.filter(
                    (e) => e.event_date >= toKey(new Date()),
                  )}
                  onSelect={(e) => selectDay(e.event_date)}
                />
              </Suspense>
            </div>
          )}
        </div>
      </div>

      <DayPanel
        open={dayOpen}
        onClose={() => {
          setDayOpen(false)
          setFocusEventId(null)
        }}
        dateKey={dayKey}
        events={dayEvents}
        isAdmin={admin}
        counts={counts}
        focusId={focusEventId}
        onAttendanceChange={refreshCounts}
        onAdd={openNew}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      {admin && (
        <Suspense fallback={null}>
          <EventEditor
            open={editorOpen}
            onClose={closeEditor}
            dateKey={dayKey ?? range.start}
            existing={editing}
            minKey={range.start}
            maxKey={range.end}
            onSaved={handleSaved}
          />
        </Suspense>
      )}

      {toast && (
        <Toast
          key={toast.id}
          message={toast.msg}
          onDone={() => setToast(null)}
        />
      )}
    </section>
  )
}
