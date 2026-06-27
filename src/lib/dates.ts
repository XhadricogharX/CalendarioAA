// Utilidades de fechas en español, semana empezando en lunes.

export const WEEKDAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const WEEKDAYS_LONG = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
]
export const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** Clave local 'YYYY-MM-DD' (sin desfase de zona horaria). */
export function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export interface MonthCursor {
  year: number
  month: number // 0-11
}

export function currentMonth(): MonthCursor {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() }
}

export function addMonths(cursor: MonthCursor, delta: number): MonthCursor {
  const d = new Date(cursor.year, cursor.month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function cursorIndex(c: MonthCursor): number {
  return c.year * 12 + c.month
}

export function isSameMonth(a: MonthCursor, b: MonthCursor): boolean {
  return a.year === b.year && a.month === b.month
}

export function monthLabel(c: MonthCursor): string {
  return `${MONTHS[c.month]} ${c.year}`
}

/** Primer y último día (clave) del mes, útil para consultar Supabase. */
export function monthRange(c: MonthCursor): { start: string; end: string } {
  const start = new Date(c.year, c.month, 1)
  const end = new Date(c.year, c.month + 1, 0)
  return { start: toKey(start), end: toKey(end) }
}

export interface GridDay {
  date: Date
  key: string
  inMonth: boolean
  isToday: boolean
  isPast: boolean
}

/** Matriz de 6 semanas (42 celdas), lunes primero. */
export function monthGrid(c: MonthCursor): GridDay[] {
  const first = new Date(c.year, c.month, 1)
  // getDay: 0=domingo … 6=sábado → convertir a lunes=0
  const offset = (first.getDay() + 6) % 7
  const startDate = new Date(c.year, c.month, 1 - offset)

  const todayKey = toKey(new Date())
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: GridDay[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + i,
    )
    const key = toKey(date)
    days.push({
      date,
      key,
      inMonth: date.getMonth() === c.month,
      isToday: key === todayKey,
      isPast: date < today,
    })
  }
  return days
}

export function formatLongDate(key: string): string {
  const d = fromKey(key)
  const wd = WEEKDAYS_LONG[(d.getDay() + 6) % 7]
  return `${capitalize(wd)}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
