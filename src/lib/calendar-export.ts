import type { PartyEvent } from './types'
import { PROVINCES } from './types'
import { fromKey, toKey } from './dates'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function locationText(ev: PartyEvent): string {
  const prov =
    ev.province && ev.province !== 'andalucia'
      ? PROVINCES[ev.province]
      : 'Andalucía'
  return [ev.location, prov, 'España'].filter(Boolean).join(', ')
}

/** Devuelve marcas de tiempo locales (flotantes) para inicio y fin (+2h). */
function timedStamps(ev: PartyEvent): { start: string; end: string } | null {
  if (!ev.start_time) return null
  const d = fromKey(ev.event_date)
  const [h, m] = ev.start_time.split(':').map(Number)
  const startD = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    h,
    m || 0,
  )
  const endD = new Date(startD.getTime() + 2 * 60 * 60 * 1000)
  const fmt = (x: Date) =>
    `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(
      x.getHours(),
    )}${pad(x.getMinutes())}00`
  return { start: fmt(startD), end: fmt(endD) }
}

function allDayStamps(ev: PartyEvent): { start: string; end: string } {
  const startKey = ev.event_date.replace(/-/g, '')
  const next = fromKey(ev.event_date)
  next.setDate(next.getDate() + 1)
  return { start: startKey, end: toKey(next).replace(/-/g, '') }
}

export function googleCalendarUrl(ev: PartyEvent): string {
  const timed = timedStamps(ev)
  const dates = timed
    ? `${timed.start}/${timed.end}`
    : (() => {
        const a = allDayStamps(ev)
        return `${a.start}/${a.end}`
      })()

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    details: ev.description ?? 'Convocatoria de Adelante Andalucía.',
    location: locationText(ev),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function buildIcs(ev: PartyEvent): string {
  const timed = timedStamps(ev)
  const dtstamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '') // YYYYMMDDTHHMMSSZ

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Adelante Andalucia//Calendario//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${ev.id}@adelante-andalucia-calendario`,
    `DTSTAMP:${dtstamp}`,
  ]

  if (timed) {
    lines.push(`DTSTART:${timed.start}`, `DTEND:${timed.end}`)
  } else {
    const a = allDayStamps(ev)
    lines.push(`DTSTART;VALUE=DATE:${a.start}`, `DTEND;VALUE=DATE:${a.end}`)
  }

  lines.push(
    `SUMMARY:${icsEscape(ev.title)}`,
    `LOCATION:${icsEscape(locationText(ev))}`,
  )
  if (ev.description) lines.push(`DESCRIPTION:${icsEscape(ev.description)}`)
  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/**
 * Añade el evento al calendario de Apple (y compatibles).
 *  · En iPhone/iPad abre directamente la app Calendario (sin descargar nada).
 *  · En ordenador/Android descarga el .ics, que al abrirlo lo añade al
 *    calendario (Apple Calendar, Outlook, etc.).
 */
export function addToAppleCalendar(ev: PartyEvent): void {
  const ics = buildIcs(ev)

  if (isIOS()) {
    window.location.href =
      'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
    return
  }

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ev.title.replace(/[^\w\sáéíóúñ-]/gi, '').slice(0, 40) || 'evento'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
