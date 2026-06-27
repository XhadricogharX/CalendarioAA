import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { PartyEvent } from '../lib/types'
import { PROVINCE_CENTER } from '../lib/geocode'

const PIN = `
<svg viewBox="0 0 24 24" width="30" height="30" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 23s8-6.3 8-13A8 8 0 1 0 4 10c0 6.7 8 13 8 13Z" fill="#0B7A47" stroke="#fff" stroke-width="1.5"/>
  <circle cx="12" cy="10" r="3" fill="#fff"/>
</svg>`

interface Props {
  events: PartyEvent[]
  onSelect: (e: PartyEvent) => void
}

export default function LeafletMultiMap({ events, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const map = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    }).setView([37.4, -4.7], 7)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const icon = L.divIcon({
      html: PIN,
      className: 'aa-pin',
      iconSize: [30, 30],
      iconAnchor: [15, 28],
      popupAnchor: [0, -26],
    })

    const seen = new Map<string, number>()
    const bounds: [number, number][] = []

    for (const ev of events) {
      let lat = ev.lat
      let lon = ev.lon
      if (lat == null || lon == null) {
        // Sin coordenadas exactas: usar centro de provincia con leve separación.
        const c = PROVINCE_CENTER[ev.province ?? 'andalucia']
        const key = ev.province ?? 'andalucia'
        const n = seen.get(key) ?? 0
        seen.set(key, n + 1)
        lat = c.lat + ((n % 5) - 2) * 0.035
        lon = c.lon + (Math.floor(n / 5) - 2) * 0.035
      }
      bounds.push([lat, lon])
      const marker = L.marker([lat, lon], { icon }).addTo(map)
      marker.bindTooltip(ev.title, { direction: 'top' })
      marker.on('click', () => onSelectRef.current(ev))
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 })
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 11)
    }

    const t = window.setTimeout(() => map.invalidateSize(), 120)
    return () => {
      window.clearTimeout(t)
      map.remove()
    }
  }, [events])

  return (
    <div
      ref={ref}
      className="h-[60vh] min-h-[320px] w-full"
      aria-label="Mapa de convocatorias en Andalucía"
    />
  )
}
