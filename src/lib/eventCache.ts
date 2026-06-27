import type { PartyEvent } from './types'

// Caché local de eventos para que el calendario muestre lo último conocido
// al instante y también sin conexión.
function key(start: string, end: string): string {
  return `aa_events_${start}_${end}`
}

export function readEventCache(start: string, end: string): PartyEvent[] | null {
  try {
    const raw = localStorage.getItem(key(start, end))
    if (!raw) return null
    const data = JSON.parse(raw) as PartyEvent[]
    return Array.isArray(data) ? data : null
  } catch {
    return null
  }
}

export function writeEventCache(
  start: string,
  end: string,
  events: PartyEvent[],
): void {
  try {
    localStorage.setItem(key(start, end), JSON.stringify(events))
  } catch {
    /* almacenamiento lleno o no disponible: no es crítico */
  }
}

// Recuentos de asistencia (para mostrarlos al instante y sin conexión).
function countsKey(start: string, end: string): string {
  return `aa_counts_${start}_${end}`
}

export function readCountsCache(
  start: string,
  end: string,
): Map<string, number> | null {
  try {
    const raw = localStorage.getItem(countsKey(start, end))
    if (!raw) return null
    const obj = JSON.parse(raw) as Record<string, number>
    return new Map(Object.entries(obj))
  } catch {
    return null
  }
}

export function writeCountsCache(
  start: string,
  end: string,
  counts: Map<string, number>,
): void {
  try {
    localStorage.setItem(
      countsKey(start, end),
      JSON.stringify(Object.fromEntries(counts)),
    )
  } catch {
    /* no crítico */
  }
}
