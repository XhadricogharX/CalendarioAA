import { useMemo, useRef } from 'react'
import {
  monthGrid,
  WEEKDAYS_SHORT,
  WEEKDAYS_LONG,
  capitalize,
  type MonthCursor,
} from '../lib/dates'
import {
  type PartyEvent,
  type ProvinceFilter,
  type CategoryFilter,
} from '../lib/types'
import { CategoryDot } from './EventBits'
import { CATEGORY_COLOR } from './EventBits'
import { IconChevronLeft, IconChevronRight, IconSpinner } from './icons'
import { FilterBar, type CalendarView } from './FilterBar'

interface CalendarProps {
  cursor: MonthCursor
  label: string
  eventsByDay: Map<string, PartyEvent[]>
  isAdmin: boolean
  loading: boolean
  canPrev: boolean
  canNext: boolean
  showTodayButton: boolean
  surface?: 'plain' | 'elevated'
  province?: ProvinceFilter
  onProvinceChange?: (p: ProvinceFilter) => void
  category?: CategoryFilter
  onCategoryChange?: (c: CategoryFilter) => void
  view?: CalendarView
  onViewChange?: (v: CalendarView) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onSelectDay: (key: string) => void
}

export function Calendar({
  cursor,
  label,
  eventsByDay,
  isAdmin,
  loading,
  canPrev,
  canNext,
  showTodayButton,
  surface = 'plain',
  province,
  onProvinceChange,
  category,
  onCategoryChange,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onSelectDay,
}: CalendarProps) {
  const days = useMemo(() => monthGrid(cursor), [cursor])

  // Gestos de deslizamiento (móvil): izquierda → mes siguiente, derecha → anterior.
  const touchX = useRef<number | null>(null)
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0]?.clientX ?? null
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 55) return
    if (dx < 0 && canNext) onNext()
    else if (dx > 0 && canPrev) onPrev()
  }

  const surfaceClass =
    surface === 'elevated'
      ? 'border border-hairline bg-page shadow-float'
      : 'border border-hairline bg-surface-2/40 shadow-card'

  return (
    <div className={`rounded-3xl p-3 sm:p-5 ${surfaceClass}`}>
      {onProvinceChange && onCategoryChange && onViewChange && (
        <FilterBar
          province={province ?? 'all'}
          onProvinceChange={onProvinceChange}
          category={category ?? 'all'}
          onCategoryChange={onCategoryChange}
          view={view ?? 'month'}
          onViewChange={onViewChange}
        />
      )}

      {/* Barra de navegación del mes */}
      <div className="mb-4 flex items-center justify-between gap-3 px-1 sm:mb-6">
        <h3
          className="font-display text-2xl font-extrabold tracking-tighter text-title sm:text-4xl"
          aria-live="polite"
        >
          {capitalize(label)}
        </h3>

        <div className="flex items-center gap-2">
          {showTodayButton && (
            <button
              type="button"
              onClick={onToday}
              className="hidden rounded-full border border-hairline px-4 py-2 text-sm font-semibold text-title transition-colors duration-200 hover:border-forest/40 hover:bg-content/[0.06] sm:inline-flex"
            >
              Hoy
            </button>
          )}
          <NavButton
            label="Mes anterior"
            disabled={!canPrev}
            onClick={onPrev}
          >
            <IconChevronLeft className="h-5 w-5" />
          </NavButton>
          <NavButton label="Mes siguiente" disabled={!canNext} onClick={onNext}>
            <IconChevronRight className="h-5 w-5" />
          </NavButton>
        </div>
      </div>

      {/* Rejilla con líneas hairline (gap-px sobre fondo sand) */}
      <div
        className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline"
        aria-busy={loading}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {WEEKDAYS_SHORT.map((d, i) => (
          <div
            key={d}
            className="bg-forest py-2.5 text-center text-[0.72rem] font-bold uppercase tracking-[0.14em] text-cream/75"
          >
            <span aria-hidden="true">{d}</span>
            <span className="sr-only">{WEEKDAYS_LONG[i]}</span>
          </div>
        ))}

        {days.map((day) => {
          const list = eventsByDay.get(day.key) ?? []
          const has = list.length > 0
          const interactive = day.inMonth && (has || isAdmin)

          return (
            <DayCell
              key={day.key}
              dayNumber={day.date.getDate()}
              inMonth={day.inMonth}
              isToday={day.isToday}
              isPast={day.isPast}
              events={list}
              interactive={interactive}
              onClick={() => onSelectDay(day.key)}
            />
          )
        })}
      </div>

      {loading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-content/50">
          <IconSpinner className="h-4 w-4" />
          Cargando convocatorias…
        </div>
      )}
    </div>
  )
}

export function CalendarSkeleton({
  surface = 'plain',
}: {
  surface?: 'plain' | 'elevated'
}) {
  const surfaceClass =
    surface === 'elevated'
      ? 'border border-hairline bg-page shadow-float'
      : 'border border-hairline bg-surface-2/40 shadow-card'
  return (
    <div className={`rounded-3xl p-3 sm:p-5 ${surfaceClass}`} aria-hidden="true">
      <div className="mb-4 border-b border-hairline pb-4">
        <div className="h-9 w-44 animate-pulse rounded-full bg-hairline/60" />
      </div>
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <div className="h-9 w-44 animate-pulse rounded-lg bg-hairline/60 sm:h-11 sm:w-60" />
        <div className="flex gap-2">
          <div className="h-11 w-11 animate-pulse rounded-full bg-hairline/60" />
          <div className="h-11 w-11 animate-pulse rounded-full bg-hairline/60" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={`h${i}`} className="bg-forest py-3" />
        ))}
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[58px] bg-page p-1.5 sm:min-h-[112px] sm:p-2.5"
          >
            <div className="h-6 w-6 animate-pulse rounded-full bg-hairline/50" />
          </div>
        ))}
      </div>
    </div>
  )
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={disabled ? 'Fuera del rango disponible' : label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-hairline bg-page text-title transition-colors duration-200 hover:border-forest/40 hover:bg-content/[0.06] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-page"
    >
      {children}
    </button>
  )
}

function DayCell({
  dayNumber,
  inMonth,
  isToday,
  isPast,
  events,
  interactive,
  onClick,
}: {
  dayNumber: number
  inMonth: boolean
  isToday: boolean
  isPast: boolean
  events: PartyEvent[]
  interactive: boolean
  onClick: () => void
}) {
  const has = events.length > 0

  const base =
    'relative flex min-h-[58px] flex-col gap-1 p-1.5 text-left transition-colors duration-200 sm:min-h-[112px] sm:p-2.5'

  const tone = !inMonth
    ? 'bg-page/40 text-content/25'
    : has
      ? 'bg-mint/[0.07] text-content'
      : 'bg-page text-content'

  const number = (
    <span
      className={[
        'grid h-7 w-7 place-items-center rounded-full font-display text-sm font-bold sm:text-[0.95rem]',
        isToday ? 'bg-mint text-forest' : '',
        !isToday && isPast && inMonth ? 'text-content/45' : '',
      ].join(' ')}
    >
      {dayNumber}
    </span>
  )

  const Content = (
    <>
      <div className="flex items-center justify-between">
        {number}
        {has && (
          <span className="hidden text-[0.7rem] font-bold text-mint-600 sm:inline">
            {events.length}
          </span>
        )}
      </div>

      {/* Móvil: puntos por categoría */}
      {has && (
        <div className="flex flex-wrap gap-1 sm:hidden">
          {events.slice(0, 4).map((ev) => (
            <CategoryDot key={ev.id} category={ev.category} className="h-1.5 w-1.5" />
          ))}
        </div>
      )}

      {/* Escritorio: chips con título */}
      {has && (
        <div className="hidden flex-col gap-1 sm:flex">
          {events.slice(0, 2).map((ev) => (
            <span
              key={ev.id}
              className="flex items-center gap-1.5 truncate rounded-md px-1.5 py-1 text-[0.74rem] font-medium leading-tight text-content"
              style={{ background: `${CATEGORY_COLOR[ev.category]}1A` }}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: CATEGORY_COLOR[ev.category] }}
              />
              <span className="truncate">{ev.title}</span>
            </span>
          ))}
          {events.length > 2 && (
            <span className="pl-1 text-[0.72rem] font-semibold text-content/55">
              +{events.length - 2} más
            </span>
          )}
        </div>
      )}
    </>
  )

  if (!interactive) {
    return <div className={`${base} ${tone}`}>{Content}</div>
  }

  const aria = has
    ? `Día ${dayNumber}, ${events.length} ${
        events.length === 1 ? 'convocatoria' : 'convocatorias'
      }`
    : `Día ${dayNumber}, añadir convocatoria`

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      className={`${base} ${tone} cursor-pointer outline-none hover:bg-mint/15 focus-visible:bg-mint/15`}
    >
      {Content}
    </button>
  )
}
