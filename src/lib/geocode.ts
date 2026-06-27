import type { Province } from './types'

export interface LatLng {
  lat: number
  lon: number
}

// Centroides aproximados de cada provincia (respaldo si la dirección exacta
// no se puede geolocalizar). Así el mapa SIEMPRE muestra la zona correcta.
export const PROVINCE_CENTER: Record<Province, LatLng> = {
  almeria: { lat: 36.84, lon: -2.46 },
  cadiz: { lat: 36.53, lon: -6.29 },
  cordoba: { lat: 37.89, lon: -4.78 },
  granada: { lat: 37.18, lon: -3.6 },
  huelva: { lat: 37.26, lon: -6.95 },
  jaen: { lat: 37.77, lon: -3.79 },
  malaga: { lat: 36.72, lon: -4.42 },
  sevilla: { lat: 37.39, lon: -5.99 },
  andalucia: { lat: 37.35, lon: -4.95 },
}

const memCache = new Map<string, LatLng | null>()
const LS_PREFIX = 'aa_geo_'

/**
 * Geolocaliza una dirección de texto con Nominatim (OpenStreetMap, gratuito).
 * Cachea el resultado (memoria + localStorage) para no repetir peticiones.
 * Devuelve null si no se encuentra.
 */
export async function geocode(query: string): Promise<LatLng | null> {
  const key = query.trim().toLowerCase()
  if (!key) return null
  if (memCache.has(key)) return memCache.get(key) ?? null

  try {
    const cached = localStorage.getItem(LS_PREFIX + key)
    if (cached) {
      const v = JSON.parse(cached) as LatLng
      memCache.set(key, v)
      return v
    }
  } catch {
    /* sin localStorage */
  }

  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
      encodeURIComponent(query)
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error('geocode failed')
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    const hit = data[0]
    const result: LatLng | null = hit
      ? { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon) }
      : null
    memCache.set(key, result)
    try {
      if (result) localStorage.setItem(LS_PREFIX + key, JSON.stringify(result))
    } catch {
      /* sin localStorage */
    }
    return result
  } catch {
    memCache.set(key, null)
    return null
  }
}
