import { useMemo } from 'react'
import type { PartyEvent, ProvinceFilter, CategoryFilter } from '../lib/types'
import { PROVINCES } from '../lib/types'
import { toKey, formatLongDate } from '../lib/dates'
import { CategoryTag, formatTime } from './EventBits'
import { FilterBar, type CalendarView } from './FilterBar'
import { IconUsers, IconMapPin, IconClock, IconCalendar } from './icons'

interface AgendaListProps {
  events: PartyEvent[]
  counts: Map<string, number>
  surface: 'plain' | 'elevated'
  province: ProvinceFilter
  onProvinceChange: (p: ProvinceFilter) => void
  category: CategoryFilter
  onCategoryChange: (c: CategoryFilter) => void
  view: CalendarView
  onViewChange: (v: CalendarView) => void
  onSelectDay: (key: string) => void
}

export function AgendaList({
  events,
  counts,
  surface,
  province,
  onProvinceChange,
  category,
  onCategoryChange,
  view,
  onViewChange,
  onSelectDay,
}: AgendaListProps) {
  const surfaceClass =
    surface === 'elevated'
      ? 'border border-hairline bg-page shadow-float'
      : 'border border-hairline bg-surface-2/40 shadow-card'

  const upcoming = useMemo(() => {
    const todayKey = toKey(new Date())
    return events.filter((e) => e.event_date >= todayKey)
  }, [events])

  // Agrupa por fecha (los eventos ya vienen ordenados por fecha/hora).
  const groups = useMemo(() => {
    const map = new Map<string, PartyEvent[]>()
    for (const ev of upcoming) {
      const arr = map.get(ev.event_date)
      if (arr) arr.push(ev)
      else map.set(ev.event_date, [ev])
    }
    return [...map.entries()]
  }, [upcoming])

  return (
    <div className={`rounded-3xl p-3 sm:p-5 ${surfaceClass}`}>
      <FilterBar
        province={province}
        onProvinceChange={onProvinceChange}
        category={category}
        onCategoryChange={onCategoryChange}
        view={view}
        onViewChange={onViewChange}
      />

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <IconCalendar className="h-10 w-10 text-content/25" />
          <p className="font-display text-lg font-bold text-title">
            No hay convocatorias próximas
          </p>
          <p className="max-w-sm text-sm text-content/60">
            Prueba a cambiar los filtros de provincia o tipo, o vuelve pronto:
            la agenda se actualiza constantemente.
          </p>
        </div>
      ) : (
        <div className="space-y-7 px-1 py-2">
          {groups.map(([dateKey, dayEvents]) => (
            <section key={dateKey}>
              <h3 className="mb-3 font-display text-sm font-extrabold uppercase tracking-[0.1em] text-mint-600">
                {formatLongDate(dateKey)}
              </h3>
              <ul className="space-y-2.5">
                {dayEvents.map((ev) => {
                  const time = formatTime(ev.start_time)
                  const count = counts.get(ev.id) ?? 0
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => onSelectDay(ev.event_date)}
                        className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-hairline bg-surface p-4 text-left transition-colors hover:border-mint-600/60 hover:bg-mint/[0.04]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <CategoryTag category={ev.category} />
                            {ev.province && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-content/65">
                                <IconMapPin className="h-3.5 w-3.5 text-mint-600" />
                                {PROVINCES[ev.province]}
                              </span>
                            )}
                            {time && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-content/65">
                                <IconClock className="h-3.5 w-3.5" />
                                {time}
                              </span>
                            )}
                          </div>
                          <p className="truncate font-display text-lg font-extrabold tracking-tighter text-title">
                            {ev.title}
                          </p>
                          {count > 0 && (
                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-content/55">
                              <IconUsers className="h-3.5 w-3.5 text-mint-600" />
                              {count}{' '}
                              {count === 1 ? 'confirmada' : 'confirmadas'}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
