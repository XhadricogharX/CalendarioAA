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

type ExportFormat = 'csv' | 'txt' | 'pdf'
interface Table {
  headers: string[]
  rows: string[][]
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function csvCell(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function triggerDownload(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

function downloadCsv(name: string, rows: string[][]) {
  const content = rows.map((r) => r.map(csvCell).join(';')).join('\r\n')
  triggerDownload(name, new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' }))
}

function downloadTxt(name: string, title: string, t: Table) {
  const lines = [
    `ADELANTE ANDALUCÍA — ${title.toUpperCase()}`,
    `Generado: ${new Date().toLocaleString('es-ES')}`,
    `Total: ${t.rows.length}`,
    '='.repeat(48),
    '',
  ]
  t.rows.forEach((r, i) => {
    lines.push(`${i + 1}.`)
    t.headers.forEach((h, j) => {
      if (r[j]) lines.push(`   ${h}: ${r[j]}`)
    })
    lines.push('')
  })
  triggerDownload(name, new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }))
}

/** Abre una vista con estilo de informe y lanza la impresión (guardar como PDF). */
function printPdf(title: string, t: Table) {
  const head = t.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body = t.rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
  <title>${escapeHtml(title)} · Adelante Andalucía</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b2a20;margin:0;padding:32px}
    header{display:flex;align-items:center;gap:12px;border-bottom:3px solid #0B7A47;padding-bottom:14px;margin-bottom:18px}
    .logo{width:32px;height:32px;border-radius:50%;background:#0B7A47}
    h1{font-size:20px;margin:0}
    .meta{color:#5a6b63;font-size:12px;margin-top:2px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #dfe6e1;vertical-align:top}
    th{background:#eaf6ef;font-weight:700}
    tr:nth-child(even) td{background:#f7faf8}
    @page{margin:14mm}
  </style></head><body>
  <header><div class="logo"></div><div><h1>${escapeHtml(title)}</h1>
  <div class="meta">Adelante Andalucía · ${t.rows.length} registros · generado el ${new Date().toLocaleString('es-ES')}</div></div></header>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  </body></html>`

  const w = window.open('', '_blank')
  if (!w) {
    // Si el navegador bloquea la ventana, caemos a descargar el HTML.
    triggerDownload(`${title.toLowerCase()}.html`, new Blob([html], { type: 'text/html' }))
    return
  }
  w.document.write(html)
  w.document.close()
  setTimeout(() => {
    w.focus()
    w.print()
  }, 350)
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

  const countsById = useMemo(() => {
    const m = new Map<string, number>()
    for (const a of attendees) m.set(a.event_id, (m.get(a.event_id) ?? 0) + 1)
    return m
  }, [attendees])

  const eventById = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events],
  )

  function eventsTable(): Table {
    return {
      headers: ['Fecha', 'Hora', 'Tipo', 'Provincia', 'Título', 'Ubicación', 'Descripción', 'Confirmados'],
      rows: events.map((e) => [
        e.event_date,
        e.start_time ?? '',
        CATEGORIES[e.category].label,
        e.province ? PROVINCES[e.province] : '',
        e.title,
        e.location ?? '',
        e.description ?? '',
        String(countsById.get(e.id) ?? 0),
      ]),
    }
  }

  function attendeesTable(): Table {
    return {
      headers: ['Fecha evento', 'Evento', 'Nombre', 'Apellido', 'Confirmado el'],
      rows: attendees.map((a) => {
        const ev = eventById.get(a.event_id)
        return [
          ev?.event_date ?? '',
          ev?.title ?? '',
          a.first_name,
          a.last_name,
          new Date(a.created_at).toLocaleString('es-ES'),
        ]
      }),
    }
  }

  function exportEvents(fmt: ExportFormat) {
    const t = eventsTable()
    if (fmt === 'csv') downloadCsv('eventos.csv', [t.headers, ...t.rows])
    else if (fmt === 'txt') downloadTxt('eventos.txt', 'Eventos', t)
    else printPdf('Eventos', t)
  }

  function exportAttendees(fmt: ExportFormat) {
    const t = attendeesTable()
    if (fmt === 'csv') downloadCsv('asistentes.csv', [t.headers, ...t.rows])
    else if (fmt === 'txt') downloadTxt('asistentes.txt', 'Asistentes', t)
    else printPdf('Asistentes', t)
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
          <ExportMenu label="Descargar eventos" onPick={exportEvents} />
          <ExportMenu label="Descargar asistentes" onPick={exportAttendees} />
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

function ExportMenu({
  label,
  onPick,
}: {
  label: string
  onPick: (f: ExportFormat) => void
}) {
  const [open, setOpen] = useState(false)
  const options: { f: ExportFormat; label: string }[] = [
    { f: 'csv', label: 'CSV (Excel)' },
    { f: 'txt', label: 'Texto (.txt)' },
    { f: 'pdf', label: 'PDF (imprimir)' },
  ]
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="btn-ghost !py-2.5 text-sm"
      >
        <IconDownload className="h-4 w-4" />
        {label}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-hairline bg-surface shadow-float">
            {options.map((o) => (
              <button
                key={o.f}
                type="button"
                onClick={() => {
                  onPick(o.f)
                  setOpen(false)
                }}
                className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm font-medium text-content/80 transition-colors hover:bg-content/[0.06] hover:text-title"
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
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
