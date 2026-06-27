import { useEffect, useRef } from 'react'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const PIN = `
<svg viewBox="0 0 24 24" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 23s8-6.3 8-13A8 8 0 1 0 4 10c0 6.7 8 13 8 13Z" fill="#0B7A47" stroke="#fff" stroke-width="1.5"/>
  <circle cx="12" cy="10" r="3" fill="#fff"/>
</svg>`

interface Props {
  lat: number
  lon: number
  zoom?: number
  label?: string
}

export default function LeafletMap({ lat, lon, zoom = 15, label }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const map = L.map(el, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: true,
    }).setView([lat, lon], zoom)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const icon = L.divIcon({
      html: PIN,
      className: 'aa-pin',
      iconSize: [36, 36],
      iconAnchor: [18, 34],
      popupAnchor: [0, -30],
    })
    const marker = L.marker([lat, lon], { icon }).addTo(map)
    if (label) marker.bindPopup(label)

    const t = window.setTimeout(() => map.invalidateSize(), 120)

    return () => {
      window.clearTimeout(t)
      map.remove()
    }
  }, [lat, lon, zoom, label])

  return <div ref={ref} className="aspect-video w-full" aria-label="Mapa de la ubicación" />
}
