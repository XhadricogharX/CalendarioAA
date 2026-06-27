import { useEffect, useMemo, useState } from 'react'
import {
  fetchAllEvents,
  fetchAllAttendees,
  fetchStorageUsage,
  type AttendeeRow,
} from '../../lib/events'
import type { PartyEvent } from '../../lib/types'
import { PROVINCES, PROVINCE_ORDER, CATEGORIES } from '../../lib/types'
import { toKey } from '../../lib/dates'
import { formatBytes } from '../../lib/imageCompression'
import {
  IconChart,
  IconUsers,
  IconCalendar,
  IconImage,
  IconDownload,
  IconSpinner,
} from '../icons'

function csvCell(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv(name: string, rows: string[][]) {
  const content = rows.map((r) => r.map(csvCell).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + content], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function AdminStats() {
  const [events, setEvents] = useState<PartyEvent[]>([])
  const [attendees, setAttendees] = useState<AttendeeRow[]>([])
  const [storage, setStorage] = useState<{ totalBytes: number; fileCount: number }>({
    totalBytes: 0,
    fileCount: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      fetchAllEvents().catch(() => [] as PartyEvent[]),
      fetchAllAttendees().catch(() => [] as AttendeeRow[]),
      fetchStorageUsage().catch(() => ({ totalBytes: 0, fileCount: 0 })),
    ]).then(([ev, at, st]) => {
      if (!active) return
      setEvents(ev)
      setAttendees(at)
      setStorage(st)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    const todayKey = toKey(new Date())
    const upcoming = events.filter((e) => e.event_date >= todayKey).length
    const byProvince: Record<string, number> = {}
    for (const e of events) {
      const key = e.province ?? 'sin'
      byProvince[key] = (byProvince[key] ?? 0) + 1
    }
    return { upcoming, byProvince }
  }, [events])

  const maxProv = Math.max(1, ...PROVINCE_ORDER.map((p) => stats.byProvince[p] ?? 0))

  function exportEvents() {
    const counts = new Map<string, number>()
    for (const a of attendees)
      counts.set(a.event_id, (counts.get(a.event_id) ?? 0) + 1)
    const rows: string[][] = [
      ['Fecha', 'Hora', 'Tipo', 'Provincia', 'Título', 'Ubicación', 'Descripción', 'Confirmados'],
      ...events.map((e) => [
        e.event_date,
        e.start_time ?? '',
        CATEGORIES[e.category].label,
        e.province ? PROVINCES[e.province] : '',
        e.title,
        e.location ?? '',
        e.description ?? '',
        String(counts.get(e.id) ?? 0),
      ]),
    ]
    downloadCsv('eventos.csv', rows)
  }

  function exportAttendees() {
    const byId = new Map(events.map((e) => [e.id, e]))
    const rows: string[][] = [
      ['Fecha evento', 'Evento', 'Nombre', 'Apellido', 'Confirmado el'],
      ...attendees.map((a) => {
        const ev = byId.get(a.event_id)
        return [
          ev?.event_date ?? '',
          ev?.title ?? '',
          a.first_name,
          a.last_name,
          new Date(a.created_at).toLocaleString('es-ES'),
        ]
      }),
    ]
    downloadCsv('asistentes.csv', rows)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-3xl border border-hairline bg-surface-2/40 py-10 text-content/50">
        <IconSpinner className="h-5 w-5" />
        Cargando estadísticas…
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-hairline bg-surface-2/40 p-5 shadow-card sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tighter text-title">
          <IconChart className="h-5 w-5 text-mint-600" />
          Resumen
        </h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportEvents} className="btn-ghost !py-2.5 text-sm">
            <IconDownload className="h-4 w-4" />
            Eventos CSV
          </button>
          <button type="button" onClick={exportAttendees} className="btn-ghost !py-2.5 text-sm">
            <IconDownload className="h-4 w-4" />
            Asistentes CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<IconCalendar className="h-5 w-5" />} value={events.length} label="Eventos totales" />
        <StatCard icon={<IconCalendar className="h-5 w-5" />} value={stats.upcoming} label="Próximos" />
        <StatCard icon={<IconUsers className="h-5 w-5" />} value={attendees.length} label="Asistencias" />
        <StatCard
          icon={<IconImage className="h-5 w-5" />}
          value={formatBytes(storage.totalBytes)}
          label={`Almacenamiento · ${storage.fileCount} img.`}
        />
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-content/55">
          Eventos por provincia
        </h3>
        <ul className="space-y-2">
          {PROVINCE_ORDER.map((p) => {
            const n = stats.byProvince[p] ?? 0
            return (
              <li key={p} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-content/70">
                  {PROVINCES[p]}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-hairline">
                  <div
                    className="h-full rounded-full bg-mint"
                    style={{ width: `${(n / maxProv) * 100}%` }}
                  />
                </div>
                <span className="w-7 text-right text-sm font-semibold text-title">
                  {n}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: number | string
  label: string
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <span className="text-mint-600">{icon}</span>
      <div className="mt-2 font-display text-2xl font-extrabold tracking-tighter text-title">
        {value}
      </div>
      <div className="mt-0.5 text-xs leading-tight text-content/55">{label}</div>
    </div>
  )
}
