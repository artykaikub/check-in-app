'use client'

import L from 'leaflet'
import { Crosshair, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type LatLng = { lat: number; lng: number }

export type GeofenceMapProps = {
  /** Map centre. */
  center: LatLng
  /** Optional geofence polygon vertices, drawn as a dashed area. */
  polygon?: LatLng[]
  /** Optional current-position marker. */
  position?: LatLng
  /** Whether `position` is inside the geofence — drives marker/polygon colour. */
  inside?: boolean
  /** Pixel height of the map (windowed mode). Defaults to 212. */
  height?: number
}

const INSIDE_COLOR = '#247a3d'
const OUTSIDE_COLOR = '#c8102e'

/**
 * Imperative Leaflet OSM map with pan/zoom, a fullscreen toggle, and a
 * fit-to-work-area control. Imported only on the client via the `geofence-map`
 * dynamic wrapper (Leaflet touches `window` at module load). Leaflet CSS is
 * imported globally in the root layout.
 */
export default function GeofenceMapImpl({
  center,
  polygon,
  position,
  inside = true,
  height = 212
}: GeofenceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.Layer[]>([])
  const didFitRef = useRef(false)
  // Keep latest props available to the (run-once) map-creation effect.
  const propsRef = useRef({ center, polygon, position })
  propsRef.current = { center, polygon, position }

  const [fullscreen, setFullscreen] = useState(false)

  // Fit the view to the work-area polygon + current position so the geofence is
  // always visible. Falls back to a single point / the centre when there's less.
  function fitToContent() {
    const map = mapRef.current
    if (!map) return
    const { center: c, polygon: poly, position: pos } = propsRef.current
    const pts: [number, number][] = []
    if (poly) for (const p of poly) pts.push([p.lat, p.lng])
    if (pos) pts.push([pos.lat, pos.lng])
    if (pts.length >= 2) {
      map.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 18 })
    } else if (pts.length === 1) {
      map.setView(pts[0], 17)
    } else {
      map.setView([c.lat, c.lng], 17)
    }
  }

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 17,
      attributionControl: false,
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: false, // enabled only in fullscreen to avoid hijacking page scroll
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      touchZoom: true
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map)
    mapRef.current = map
    fitToContent()

    return () => {
      map.remove()
      mapRef.current = null
      layersRef.current = []
      didFitRef.current = false
    }
    // Intentionally run once; subsequent prop changes update layers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redraw polygon + position marker on change; fit once when content arrives.
  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    for (const layer of layersRef.current) {
      layer.remove()
    }
    layersRef.current = []

    const color = inside ? INSIDE_COLOR : OUTSIDE_COLOR

    if (polygon && polygon.length > 0) {
      const poly = L.polygon(
        polygon.map((p) => [p.lat, p.lng] as [number, number]),
        { color, weight: 2.5, dashArray: '7 5', fillOpacity: 0.14 }
      ).addTo(map)
      layersRef.current.push(poly)
    }

    if (position) {
      const marker = L.circleMarker([position.lat, position.lng], {
        radius: 7,
        color: '#ffffff',
        weight: 3,
        fillColor: '#1f6fff',
        fillOpacity: 1
      }).addTo(map)
      layersRef.current.push(marker)
    }

    // Auto-fit only the first time we actually have something to show, so the
    // user can freely pan/zoom afterwards without the view snapping back.
    if (!didFitRef.current && (polygon?.length || position)) {
      fitToContent()
      didFitRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polygon, position, inside])

  // Resizing (fullscreen toggle, sheet open) needs Leaflet to recompute size.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.scrollWheelZoom[fullscreen ? 'enable' : 'disable']()
    // Let the DOM apply the new size first, then invalidate + refit.
    const id = window.setTimeout(() => {
      map.invalidateSize()
      fitToContent()
    }, 60)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen])

  // Escape exits fullscreen.
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const wrapperStyle: React.CSSProperties = fullscreen
    ? { position: 'fixed', inset: 0, zIndex: 2147483000, height: '100%', width: '100%' }
    : { position: 'relative', width: '100%', height, borderRadius: 'inherit', overflow: 'hidden' }

  return (
    <div style={wrapperStyle}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* control buttons */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}
      >
        <button
          type="button"
          aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={() => setFullscreen((v) => !v)}
          style={ctrlStyle}
        >
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        <button type="button" aria-label="Recenter" onClick={fitToContent} style={ctrlStyle}>
          <Crosshair size={18} />
        </button>
      </div>
    </div>
  )
}

const ctrlStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  background: '#ffffff',
  border: '1px solid var(--trinity-border2)',
  color: 'var(--trinity-fg)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  boxShadow: '0 1px 4px rgba(0,0,0,.18)'
}
