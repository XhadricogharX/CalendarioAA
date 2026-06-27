import { CATEGORIES, type EventCategory } from '../lib/types'

export const CATEGORY_COLOR: Record<EventCategory, string> = {
  manifestacion: '#27A874',
  concentracion: '#E08A2B',
  asamblea: '#8A7B2B',
  reunion: '#2B7A8B',
  acto: '#0B7A47',
  otro: '#6B7280',
}

export function CategoryDot({
  category,
  className = 'h-2 w-2',
}: {
  category: EventCategory
  className?: string
}) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{ background: CATEGORY_COLOR[category] }}
      aria-hidden="true"
    />
  )
}

export function CategoryTag({ category }: { category: EventCategory }) {
  return (
    <span className="tag" style={{ color: CATEGORY_COLOR[category] }}>
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {CATEGORIES[category].label}
    </span>
  )
}

export function formatTime(time: string | null): string | null {
  if (!time) return null
  const [h, m] = time.split(':')
  if (h === undefined) return null
  return `${h}:${m ?? '00'} h`
}
