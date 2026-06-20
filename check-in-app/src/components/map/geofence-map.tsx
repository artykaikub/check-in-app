'use client'

import dynamic from 'next/dynamic'
import type { GeofenceMapProps } from './geofence-map.impl'

export type { GeofenceMapProps, LatLng } from './geofence-map.impl'

/**
 * Client-only Leaflet geofence map. Leaflet reads `window` at import time, so the
 * implementation is loaded via `next/dynamic` with `ssr: false`.
 */
const GeofenceMap = dynamic(() => import('./geofence-map.impl'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: 212,
        background: 'var(--trinity-muted)'
      }}
    />
  )
})

export default function GeofenceMapClient(props: GeofenceMapProps) {
  return <GeofenceMap {...props} />
}
