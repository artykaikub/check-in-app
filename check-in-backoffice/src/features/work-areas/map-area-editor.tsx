'use client'

import type * as Leaflet from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LatLngNode } from '@/generated/api/model'

const bangkokNodes: LatLngNode[] = [
  { lat: 13.758, lng: 100.527 },
  { lat: 13.758, lng: 100.532 },
  { lat: 13.754, lng: 100.532 },
  { lat: 13.754, lng: 100.527 }
]

function getCenter(nodes: LatLngNode[]) {
  const sum = nodes.reduce(
    (total, node) => ({
      lat: total.lat + node.lat,
      lng: total.lng + node.lng
    }),
    { lat: 0, lng: 0 }
  )

  return {
    lat: sum.lat / nodes.length,
    lng: sum.lng / nodes.length
  }
}

export function getDefaultAreaNodes() {
  return bangkokNodes
}

type MapAreaEditorProps = {
  value: LatLngNode[]
  onChange: (nodes: LatLngNode[]) => void
}

export function MapAreaEditor({ value, onChange }: MapAreaEditorProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Leaflet.Map | null>(null)
  const leafletRef = useRef<typeof Leaflet | null>(null)
  const polygonRef = useRef<Leaflet.Polygon | null>(null)
  const markersRef = useRef<Leaflet.Marker[]>([])
  const selectedIndexRef = useRef(0)
  const nodesRef = useRef<LatLngNode[]>(value.length === 4 ? value : bangkokNodes)
  const onChangeRef = useRef(onChange)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const nodes = value.length === 4 ? value : bangkokNodes
  const center = useMemo(() => getCenter(nodes), [nodes])
  const initialCenterRef = useRef(center)

  useEffect(() => {
    nodesRef.current = nodes
    onChangeRef.current = onChange
  })

  useEffect(() => {
    let isMounted = true

    async function bootMap() {
      if (!mapElementRef.current || mapRef.current) {
        return
      }

      const leaflet = await import('leaflet')

      if (!isMounted || !mapElementRef.current) {
        return
      }

      leafletRef.current = leaflet
      const map = leaflet
        .map(mapElementRef.current, {
          zoomControl: true,
          attributionControl: true
        })
        .setView([initialCenterRef.current.lat, initialCenterRef.current.lng], 17)

      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        })
        .addTo(map)

      map.on('click', (event) => {
        const nextNodes = [...nodesRef.current]
        nextNodes[selectedIndexRef.current] = {
          lat: Number(event.latlng.lat.toFixed(6)),
          lng: Number(event.latlng.lng.toFixed(6))
        }
        onChangeRef.current(nextNodes)
      })

      mapRef.current = map
    }

    bootMap()

    return () => {
      isMounted = false
      mapRef.current?.remove()
      mapRef.current = null
      polygonRef.current = null
      markersRef.current = []
    }
  }, [])

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
  }, [selectedIndex])

  useEffect(() => {
    const leaflet = leafletRef.current
    const map = mapRef.current

    if (!leaflet || !map) {
      return
    }

    polygonRef.current?.remove()
    markersRef.current.forEach((marker) => marker.remove())

    polygonRef.current = leaflet
      .polygon(
        nodes.map((node) => [node.lat, node.lng]),
        {
          color: '#111827',
          fillColor: '#111827',
          fillOpacity: 0.12,
          weight: 2
        }
      )
      .addTo(map)

    markersRef.current = nodes.map((node, index) => {
      const marker = leaflet
        .marker([node.lat, node.lng], {
          draggable: true,
          icon: leaflet.divIcon({
            className: '',
            html: `<span class="flex size-7 items-center justify-center rounded-full border-2 border-background bg-primary text-xs font-semibold text-primary-foreground shadow">${index + 1}</span>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })
        })
        .addTo(map)

      marker.on('click', () => setSelectedIndex(index))
      marker.on('dragend', () => {
        const latLng = marker.getLatLng()
        const nextNodes = [...nodes]
        nextNodes[index] = {
          lat: Number(latLng.lat.toFixed(6)),
          lng: Number(latLng.lng.toFixed(6))
        }
        onChange(nextNodes)
      })

      return marker
    })

    map.fitBounds(polygonRef.current.getBounds(), { padding: [24, 24], maxZoom: 18 })
  }, [nodes, onChange])

  function updateNode(index: number, key: keyof LatLngNode, rawValue: string) {
    const parsed = Number(rawValue)

    if (!Number.isFinite(parsed)) {
      return
    }

    const nextNodes = [...nodes]
    const currentNode = nextNodes[index] ?? { lat: 0, lng: 0 }
    nextNodes[index] = {
      ...currentNode,
      [key]: parsed
    }
    onChange(nextNodes)
  }

  return (
    <div className="grid gap-4">
      <div
        ref={mapElementRef}
        className="h-[360px] overflow-hidden rounded-md border bg-muted"
        aria-label="Work area map"
      />
      <div className="grid gap-3 md:grid-cols-2">
        {nodes.map((node, index) => (
          <button
            key={index}
            type="button"
            className={`rounded-md border p-3 text-left ${
              selectedIndex === index ? 'border-primary bg-accent' : 'bg-background'
            }`}
            onClick={() => setSelectedIndex(index)}
          >
            <div className="mb-2 text-sm font-medium">Node {index + 1}</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label htmlFor={`node-${index}-lat`}>Lat</Label>
                <Input
                  id={`node-${index}-lat`}
                  inputMode="decimal"
                  value={node.lat}
                  onChange={(event) => updateNode(index, 'lat', event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`node-${index}-lng`}>Lng</Label>
                <Input
                  id={`node-${index}-lng`}
                  inputMode="decimal"
                  value={node.lng}
                  onChange={(event) => updateNode(index, 'lng', event.target.value)}
                />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
