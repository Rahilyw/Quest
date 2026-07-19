'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { theme, VICTORIA_DEFAULT } from '@/lib/theme'
import {
  POLYGON_MIN_VERTICES,
  RADIUS_PRESETS,
  closeRing,
  openRing,
  polygonCentroid,
  validatePolygonRing,
} from '@quest/geofence'
import {
  PLACE_CATEGORIES,
  placesInCategory,
  type PlaceCategory,
} from '@/lib/victoria-places'
import {
  nearlySamePoint,
  newClientId,
  type MultiArea,
} from '@/lib/multiAreas'

import 'leaflet/dist/leaflet.css'

type AddMode = 'search' | 'pin' | 'draw'

interface SearchResult {
  id: string
  name: string
  displayName: string
  lat: number
  lng: number
  type: string
}

interface Props {
  areas: MultiArea[]
  onAreasChange: (areas: MultiArea[]) => void
  /** Sync parent pin to areas centroid when areas change */
  onRepresentativeLatLng?: (lat: number, lng: number) => void
}

let MapContainer: any = null
let TileLayer: any = null
let Marker: any = null
let Circle: any = null
let Polygon: any = null
let Polyline: any = null
let useMapEvents: any = null
let L: any = null

function initLeaflet() {
  if (typeof window !== 'undefined' && !MapContainer) {
    L = require('leaflet')
    const rl = require('react-leaflet')
    MapContainer = rl.MapContainer
    TileLayer = rl.TileLayer
    Marker = rl.Marker
    Circle = rl.Circle
    Polygon = rl.Polygon
    Polyline = rl.Polyline
    useMapEvents = rl.useMapEvents
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
  }
}

function vertexIcon(color: string, size = 12) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function MapClick({
  enabled,
  onClick,
}: {
  enabled: boolean
  onClick: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e: any) {
      if (enabled) onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

const CATEGORY_SEARCH: Record<string, string> = {
  coffee: 'coffee',
  pizza: 'pizza',
  library: 'library',
  park: 'park',
  restaurant: 'restaurant',
}

export default function MultiAreaEditor({ areas, onAreasChange, onRepresentativeLatLng }: Props) {
  const [mounted, setMounted] = useState(false)
  const [addMode, setAddMode] = useState<AddMode>('search')
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchError, setSearchError] = useState<string | null>(null)

  // Drop-pin draft
  const [pinLat, setPinLat] = useState(VICTORIA_DEFAULT.lat)
  const [pinLng, setPinLng] = useState(VICTORIA_DEFAULT.lng)
  const [pinRadius, setPinRadius] = useState(100)
  const [pinLabel, setPinLabel] = useState('')
  const pinMarkerRef = useRef<any>(null)

  // Draw draft [lat, lng][]
  const [draft, setDraft] = useState<[number, number][]>([])
  const [zoneLabel, setZoneLabel] = useState('')

  const [selectedAreaIds, setSelectedAreaIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    initLeaflet()
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!onRepresentativeLatLng || areas.length === 0) return
    const pts: { lat: number; lng: number }[] = []
    for (const a of areas) {
      if (a.lat != null && a.lng != null) pts.push({ lat: a.lat, lng: a.lng })
      else if (a.boundaryRing) {
        const c = polygonCentroid(a.boundaryRing)
        if (c) pts.push(c)
      }
    }
    if (pts.length === 0) return
    onRepresentativeLatLng(
      pts.reduce((s, p) => s + p.lat, 0) / pts.length,
      pts.reduce((s, p) => s + p.lng, 0) / pts.length
    )
  }, [areas, onRepresentativeLatLng])

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.results ?? [])
      setSelectedIds(new Set())
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed')
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (addMode !== 'search') return
    const t = setTimeout(() => {
      if (query.trim().length >= 2) runSearch(query)
      else setResults([])
    }, 400)
    return () => clearTimeout(t)
  }, [query, addMode, runSearch])

  function addCircleAreas(
    items: { label: string; lat: number; lng: number; radius?: number }[]
  ) {
    const next = [...areas]
    for (const item of items) {
      if (next.some((a) => a.shape === 'circle' && a.lat != null && a.lng != null && nearlySamePoint({ lat: a.lat, lng: a.lng }, item))) {
        continue
      }
      next.push({
        clientId: newClientId(),
        label: item.label,
        shape: 'circle',
        lat: item.lat,
        lng: item.lng,
        radius_meters: item.radius ?? 100,
      })
    }
    onAreasChange(next)
  }

  function toggleResult(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function addSelectedResults() {
    const picked = results.filter((r) => selectedIds.has(r.id))
    addCircleAreas(picked.map((r) => ({ label: r.name, lat: r.lat, lng: r.lng, radius: 100 })))
    setSelectedIds(new Set())
  }

  function addAllResults() {
    addCircleAreas(results.map((r) => ({ label: r.name, lat: r.lat, lng: r.lng, radius: 100 })))
    setSelectedIds(new Set())
  }

  function addCatalogCategory(cat: PlaceCategory) {
    const places = placesInCategory(cat)
    addCircleAreas(
      places.map((p) => ({
        label: p.name,
        lat: p.lat,
        lng: p.lng,
        radius: p.defaultRadiusMeters ?? 100,
      }))
    )
  }

  function addPin() {
    const label = pinLabel.trim() || `Pin (${pinLat.toFixed(4)}, ${pinLng.toFixed(4)})`
    addCircleAreas([{ label, lat: pinLat, lng: pinLng, radius: pinRadius }])
    setPinLabel('')
  }

  function finishZone() {
    if (draft.length < POLYGON_MIN_VERTICES) return
    const open = draft.map(([la, ln]) => [ln, la])
    const closed = closeRing(open)
    const validation = validatePolygonRing(closed)
    if (!validation.ok) {
      alert(validation.error)
      return
    }
    const centroid = polygonCentroid(closed)
    const label = zoneLabel.trim() || `Zone ${areas.length + 1}`
    onAreasChange([
      ...areas,
      {
        clientId: newClientId(),
        label,
        shape: 'polygon',
        lat: centroid?.lat,
        lng: centroid?.lng,
        boundaryRing: closed,
      },
    ])
    setDraft([])
    setZoneLabel('')
  }

  function removeAreas(ids: Set<string>) {
    onAreasChange(areas.filter((a) => !ids.has(a.clientId)))
    setSelectedAreaIds(new Set())
  }

  function updateArea(clientId: string, patch: Partial<MultiArea>) {
    onAreasChange(areas.map((a) => (a.clientId === clientId ? { ...a, ...patch } : a)))
  }

  function handleMapClick(lat: number, lng: number) {
    if (addMode === 'pin') {
      setPinLat(lat)
      setPinLng(lng)
    } else if (addMode === 'draw') {
      setDraft((prev) => [...prev, [lat, lng]])
    }
  }

  const mapCenter = useMemo(() => {
    if (addMode === 'pin') return [pinLat, pinLng] as [number, number]
    const first = areas[0]
    if (first?.lat != null && first?.lng != null) return [first.lat, first.lng] as [number, number]
    return [VICTORIA_DEFAULT.lat, VICTORIA_DEFAULT.lng] as [number, number]
  }, [addMode, pinLat, pinLng, areas])

  const mapEl = useMemo(() => {
    if (!mounted || !MapContainer) {
      return (
        <div
          style={{
            height: 340,
            background: theme.bgElevated,
            borderRadius: 14,
            border: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.textMuted,
          }}
        >
          Loading map…
        </div>
      )
    }

    return (
      <div
        style={{
          height: 340,
          borderRadius: 14,
          border: `1px solid ${theme.border}`,
          overflow: 'hidden',
          cursor: addMode === 'draw' || addMode === 'pin' ? 'crosshair' : undefined,
        }}
      >
        <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClick enabled={addMode === 'pin' || addMode === 'draw'} onClick={handleMapClick} />

          {areas.flatMap((a) => {
            if (a.shape === 'circle' && a.lat != null && a.lng != null) {
              return [
                <Marker key={`${a.clientId}-m`} position={[a.lat, a.lng]} />,
                <Circle
                  key={`${a.clientId}-c`}
                  center={[a.lat, a.lng]}
                  radius={a.radius_meters ?? 100}
                  pathOptions={{
                    fillColor: theme.primary,
                    fillOpacity: 0.12,
                    color: theme.primary,
                    weight: 2,
                  }}
                />,
              ]
            }
            if (a.shape === 'polygon' && a.boundaryRing) {
              const open = openRing(a.boundaryRing)
              return [
                <Polygon
                  key={a.clientId}
                  positions={open.map(([ln, la]) => [la, ln])}
                  pathOptions={{
                    fillColor: theme.highlight,
                    fillOpacity: 0.15,
                    color: theme.highlight,
                    weight: 2,
                  }}
                />,
              ]
            }
            return []
          })}

          {addMode === 'pin' && (
            <>
              <Marker
                position={[pinLat, pinLng]}
                draggable
                ref={pinMarkerRef}
                eventHandlers={{
                  dragend() {
                    const m = pinMarkerRef.current
                    if (!m) return
                    const ll = m.getLatLng()
                    setPinLat(ll.lat)
                    setPinLng(ll.lng)
                  },
                }}
              />
              <Circle
                center={[pinLat, pinLng]}
                radius={pinRadius}
                pathOptions={{
                  fillColor: theme.success,
                  fillOpacity: 0.15,
                  color: theme.success,
                  weight: 2,
                  dashArray: '4 4',
                }}
              />
            </>
          )}

          {addMode === 'draw' && draft.length >= 2 && (
            <Polyline positions={draft} pathOptions={{ color: theme.highlight, weight: 2, dashArray: '6 6' }} />
          )}
          {addMode === 'draw' &&
            draft.map(([la, ln], i) => (
              <Marker key={`d-${i}`} position={[la, ln]} icon={vertexIcon(i === 0 ? theme.highlight : theme.primary)} />
            ))}
        </MapContainer>
      </div>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, mapCenter, areas, addMode, pinLat, pinLng, pinRadius, draft])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: theme.text }}>
          Multiple completion areas
        </p>
        <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: 12 }}>
          Player can complete at any listed area. Add via search, drop pin, or draw a zone.
        </p>
      </div>

      {/* Add mode toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(
          [
            ['search', 'Search'],
            ['pin', 'Drop pin'],
            ['draw', 'Draw zone'],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setAddMode(mode)}
            style={{
              border: addMode === mode ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
              background: addMode === mode ? theme.primarySoft : 'transparent',
              color: addMode === mode ? theme.primaryLight : theme.textMuted,
              borderRadius: 999,
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {addMode === 'search' && (
        <div className="admin-card" style={{ background: theme.bgElevated, border: `1px solid ${theme.border}`, padding: 14 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {Object.entries(CATEGORY_SEARCH).map(([key, hint]) => (
              <button
                key={key}
                type="button"
                className="admin-btn admin-btn-ghost"
                style={{ fontSize: 11, padding: '4px 8px', textTransform: 'capitalize' }}
                onClick={() => setQuery(hint)}
              >
                {key}
              </button>
            ))}
            {PLACE_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className="admin-btn admin-btn-ghost"
                style={{ fontSize: 11, padding: '4px 8px' }}
                onClick={() => addCatalogCategory(c.id)}
                title={`Add all curated ${c.label}`}
              >
                + All {c.label}
              </button>
            ))}
          </div>
          <input
            className="admin-input"
            placeholder="Search Victoria — coffee, pizza, Habit Coffee…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching && <p style={{ margin: '8px 0 0', fontSize: 12, color: theme.textMuted }}>Searching…</p>}
          {searchError && <p style={{ margin: '8px 0 0', fontSize: 12, color: theme.danger }}>{searchError}</p>}
          {results.length > 0 && (
            <>
              <div style={{ marginTop: 10, maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {results.map((r) => (
                  <label
                    key={r.id}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'flex-start',
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: selectedIds.has(r.id) ? theme.primarySoft : 'transparent',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleResult(r.id)}
                      style={{ marginTop: 2, accentColor: theme.primary }}
                    />
                    <span>
                      <strong style={{ color: theme.text }}>{r.name}</strong>
                      <span style={{ color: theme.textDim, display: 'block', lineHeight: 1.3 }}>
                        {r.displayName}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  style={{ fontSize: 12 }}
                  disabled={selectedIds.size === 0}
                  onClick={addSelectedResults}
                >
                  Add selected ({selectedIds.size})
                </button>
                <button type="button" className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }} onClick={addAllResults}>
                  Add all results
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {addMode === 'pin' && (
        <div className="admin-card" style={{ background: theme.bgElevated, border: `1px solid ${theme.border}`, padding: 14 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: theme.textMuted }}>
            Click the map or drag the green pin. Set radius, name it, then add.
          </p>
          <div className="admin-field">
            <label className="admin-label">Label</label>
            <input className="admin-input" value={pinLabel} onChange={(e) => setPinLabel(e.target.value)} placeholder="e.g. Sidewalk Cafe" />
          </div>
          <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Radius: <strong>{pinRadius}m</strong></span>
          </label>
          <input
            type="range"
            min={50}
            max={2000}
            step={10}
            value={pinRadius}
            onChange={(e) => setPinRadius(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: theme.primary, marginBottom: 8 }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {RADIUS_PRESETS.map((p) => (
              <button key={p} type="button" className="admin-btn admin-btn-ghost" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => setPinRadius(p)}>
                {p}m
              </button>
            ))}
          </div>
          <button type="button" className="admin-btn admin-btn-primary" style={{ fontSize: 12 }} onClick={addPin}>
            Add pin to list
          </button>
        </div>
      )}

      {addMode === 'draw' && (
        <div className="admin-card" style={{ background: theme.bgElevated, border: `1px solid ${theme.border}`, padding: 14 }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: theme.textMuted }}>
            Tap the map to add vertices (≥{POLYGON_MIN_VERTICES}). Finish to add the zone to the list, then draw another if needed.
          </p>
          <div className="admin-field">
            <label className="admin-label">Zone label</label>
            <input className="admin-input" value={zoneLabel} onChange={(e) => setZoneLabel(e.target.value)} placeholder="e.g. Beacon Hill lawn" />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              style={{ fontSize: 12 }}
              disabled={draft.length < POLYGON_MIN_VERTICES}
              onClick={finishZone}
            >
              Add zone ({draft.length} pts)
            </button>
            <button type="button" className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }} disabled={draft.length === 0} onClick={() => setDraft((d) => d.slice(0, -1))}>
              Undo point
            </button>
            <button type="button" className="admin-btn admin-btn-ghost" style={{ fontSize: 12 }} disabled={draft.length === 0} onClick={() => setDraft([])}>
              Clear draft
            </button>
          </div>
        </div>
      )}

      {mapEl}

      {/* Area list */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="admin-label" style={{ margin: 0 }}>
            Areas ({areas.length})
          </span>
          {selectedAreaIds.size > 0 && (
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              style={{ fontSize: 11, color: theme.danger }}
              onClick={() => removeAreas(selectedAreaIds)}
            >
              Remove selected ({selectedAreaIds.size})
            </button>
          )}
        </div>
        {areas.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: theme.textDim }}>No areas yet — search, drop a pin, or draw a zone.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {areas.map((a, i) => (
              <div
                key={a.clientId}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: 10,
                  borderRadius: 10,
                  border: `1px solid ${theme.border}`,
                  background: theme.bgElevated,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedAreaIds.has(a.clientId)}
                  onChange={() => {
                    setSelectedAreaIds((prev) => {
                      const n = new Set(prev)
                      if (n.has(a.clientId)) n.delete(a.clientId)
                      else n.add(a.clientId)
                      return n
                    })
                  }}
                  style={{ marginTop: 4, accentColor: theme.primary }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    className="admin-input"
                    value={a.label}
                    onChange={(e) => updateArea(a.clientId, { label: e.target.value })}
                    style={{ fontSize: 13, marginBottom: 6 }}
                  />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 11, color: theme.textMuted }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: a.shape === 'circle' ? theme.primaryLight : theme.highlight,
                        textTransform: 'uppercase',
                      }}
                    >
                      {a.shape === 'circle' ? 'Circle' : 'Zone'}
                    </span>
                    {a.shape === 'circle' && (
                      <>
                        <span>
                          {a.lat?.toFixed(4)}, {a.lng?.toFixed(4)}
                        </span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          r=
                          <input
                            type="number"
                            min={50}
                            max={2000}
                            value={a.radius_meters ?? 100}
                            onChange={(e) =>
                              updateArea(a.clientId, { radius_meters: parseInt(e.target.value, 10) || 100 })
                            }
                            style={{
                              width: 64,
                              background: theme.surface,
                              border: `1px solid ${theme.border}`,
                              borderRadius: 6,
                              color: theme.text,
                              padding: '2px 6px',
                              fontSize: 11,
                            }}
                          />
                          m
                        </label>
                      </>
                    )}
                    {a.shape === 'polygon' && (
                      <span>{openRing(a.boundaryRing ?? []).length} vertices</span>
                    )}
                    <span style={{ color: theme.textDim }}>#{i + 1}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  style={{ fontSize: 11, color: theme.danger, flexShrink: 0 }}
                  onClick={() => removeAreas(new Set([a.clientId]))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
