export type EventCategory =
  | 'manifestacion'
  | 'concentracion'
  | 'reunion'
  | 'asamblea'
  | 'acto'
  | 'otro'

export type Province =
  | 'almeria'
  | 'cadiz'
  | 'cordoba'
  | 'granada'
  | 'huelva'
  | 'jaen'
  | 'malaga'
  | 'sevilla'
  | 'andalucia'

export const PROVINCES: Record<Province, string> = {
  almeria: 'Almería',
  cadiz: 'Cádiz',
  cordoba: 'Córdoba',
  granada: 'Granada',
  huelva: 'Huelva',
  jaen: 'Jaén',
  malaga: 'Málaga',
  sevilla: 'Sevilla',
  andalucia: 'Toda Andalucía',
}

export const PROVINCE_ORDER: Province[] = [
  'almeria',
  'cadiz',
  'cordoba',
  'granada',
  'huelva',
  'jaen',
  'malaga',
  'sevilla',
  'andalucia',
]

/** Filtro de provincia para los usuarios: una provincia concreta o 'all' (todas). */
export type ProvinceFilter = Province | 'all'

/** Filtro por tipo de evento: una categoría concreta o 'all' (todas). */
export type CategoryFilter = EventCategory | 'all'

export interface EventImage {
  path: string
  width: number | null
  height: number | null
  thumb: string | null
}

export interface PartyEvent {
  id: string
  event_date: string // 'YYYY-MM-DD' (zona local)
  start_time: string | null // 'HH:MM'
  title: string
  description: string | null
  category: EventCategory
  province: Province | null
  location: string | null
  lat: number | null
  lon: number | null
  image_path: string | null
  image_width: number | null
  image_height: number | null
  images: EventImage[]
  created_at: string
  created_by: string | null
}

export interface EventDraft {
  event_date: string
  start_time: string | null
  title: string
  description: string | null
  category: EventCategory
  province: Province
  location: string | null
}

export interface Attendee {
  id: string
  first_name: string
  last_name: string
  created_at: string
}

export const CATEGORIES: Record<
  EventCategory,
  { label: string; short: string }
> = {
  manifestacion: { label: 'Manifestación', short: 'Mani' },
  concentracion: { label: 'Concentración', short: 'Concentra' },
  reunion: { label: 'Reunión', short: 'Reunión' },
  asamblea: { label: 'Asamblea', short: 'Asamblea' },
  acto: { label: 'Acto público', short: 'Acto' },
  otro: { label: 'Otro', short: 'Otro' },
}

export const CATEGORY_ORDER: EventCategory[] = [
  'manifestacion',
  'concentracion',
  'asamblea',
  'reunion',
  'acto',
  'otro',
]
