'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { theme, VICTORIA_DEFAULT } from '@/lib/theme'
import { boundaryToLeafletCoords, VICTORIA_BOUNDARY } from '@/lib/cities'
import {
  formatGeofenceLabel,
  RADIUS_PRESETS,
  DEFAULT_CITY_ID,
  validatePolygonRing,
  polygonAreaMeters,
  polygonCentroid,
  openRing,
  closeRing,
  POLYGON_MIN_VERTICES,
} from '@quest/geofence'
import MultiAreaEditor from '@/components/MultiAreaEditor'
import type { MultiArea } from '@/lib/multiAreas'

import 'leaflet/dist/leaflet.css'

export type GeofenceType = 'none' | 'circle' | 'city' | 'polygon' | 'multi'

interface GeofenceEditorProps {
  geofenceType: GeofenceType
  onGeofenceTypeChange: (type: GeofenceType) => void
  lat: number
  lng: number
  onLatLngChange: (lat: number, lng: number) => void
  radiusMeters: number
  onRadiusChange: (radius: number) => void
  cityId: string | null
  onCityIdChange: (cityId: string | null) => void
  /** Closed GeoJSON ring [lng, lat][] for polygon quests; null when not drawn. */
  boundaryRing: number[][] | null
  onBoundaryChange: (ring: number[][] | null) => void
  /** Child areas when geofenceType is multi */
  multiAreas?: MultiArea[]
  onMultiAreasChange?: (areas: MultiArea[]) => void
  /** When true, emit hidden inputs for FormData (create form). When false, parent manages state only (edit form). */
  renderHiddenInputs?: boolean
}

// Dynamically load components on the client side
let MapContainer: any = null
let TileLayer: any = null
let Marker: any = null
let Circle: any = null
let Polygon: any = null
let Polyline: any = null
let useMap: any = null
let useMapEvents: any = null
let L: any = null

function initLeaflet() {
  if (typeof window !== 'undefined' && !MapContainer) {
    L = require('leaflet')
    const reactLeaflet = require('react-leaflet')
    MapContainer = reactLeaflet.MapContainer
    TileLayer = reactLeaflet.TileLayer
    Marker = reactLeaflet.Marker
    Circle = reactLeaflet.Circle
    Polygon = reactLeaflet.Polygon
    Polyline = reactLeaflet.Polyline
    useMap = reactLeaflet.useMap
    useMapEvents = reactLeaflet.useMapEvents

    // Fix marker icon issue
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    })
  }
}

function vertexIcon(color: string, size = 14) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);cursor:grab"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function midpointIcon() {
  return L.divIcon({
    className: '',
    html: '<div style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.85);border:2px solid rgba(67,100,247,0.6);cursor:grab"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  })
}

function formatArea(m2: number): string {
  if (m2 < 10_000) return `${Math.round(m2)} m²`
  if (m2 < 1_000_000) return `${(m2 / 10_000).toFixed(1)} ha`
  return `${(m2 / 1_000_000).toFixed(1)} km²`
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lng])
  }, [lat, lng, map])
  return null
}

function MapEvents({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: any) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function GeofenceEditor({
  geofenceType,
  onGeofenceTypeChange,
  lat,
  lng,
  onLatLngChange,
  radiusMeters,
  onRadiusChange,
  cityId,
  onCityIdChange,
  boundaryRing,
  onBoundaryChange,
  multiAreas = [],
  onMultiAreasChange,
  renderHiddenInputs = false,
}: GeofenceEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
  /** In-progress polygon vertices as [lat, lng] while drawing (not yet committed). */
  const [draft, setDraft] = useState<[number, number][]>([])
  const markerRef = useRef<any>(null)

  useEffect(() => {
    initLeaflet()
    setIsMounted(true)
  }, [])

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          const latLng = marker.getLatLng()
          onLatLngChange(latLng.lat, latLng.lng)
        }
      },
    }),
    [onLatLngChange]
  )

  const handleTypeChange = (type: GeofenceType) => {
    onGeofenceTypeChange(type)
    if (type === 'none') {
      onRadiusChange(0)
      onCityIdChange(null)
    } else if (type === 'circle') {
      if (radiusMeters === 0) {
        onRadiusChange(300)
      }
      onCityIdChange(null)
    } else if (type === 'city') {
      onCityIdChange(DEFAULT_CITY_ID)
      onRadiusChange(0)
    } else if (type === 'polygon') {
      onRadiusChange(0)
      onCityIdChange(null)
    } else if (type === 'multi') {
      onRadiusChange(0)
      onCityIdChange(null)
    }
    // Drawn boundary survives type switches so a mis-click doesn't destroy
    // work; the server clears it when a non-polygon quest is saved.
  }

  const handleResetToVictoria = () => {
    onLatLngChange(VICTORIA_DEFAULT.lat, VICTORIA_DEFAULT.lng)
  }

  // ─── Polygon drawing ───────────────────────────────────────────────────────

  const openBoundary = useMemo(
    () => (boundaryRing ? openRing(boundaryRing) : null),
    [boundaryRing]
  )

  function commitRing(open: number[][]) {
    const closed = closeRing(open)
    onBoundaryChange(closed)
    const centroid = polygonCentroid(closed)
    if (centroid) onLatLngChange(centroid.lat, centroid.lng)
  }

  function finishDraft() {
    if (draft.length < POLYGON_MIN_VERTICES) return
    commitRing(draft.map(([vLat, vLng]) => [vLng, vLat]))
    setDraft([])
  }

  function clearPolygon() {
    setDraft([])
    onBoundaryChange(null)
  }

  function updateVertex(index: number, vLat: number, vLng: number) {
    if (!openBoundary) return
    const next = openBoundary.map((v, i) => (i === index ? [vLng, vLat] : v))
    commitRing(next)
  }

  function deleteVertex(index: number) {
    if (!openBoundary || openBoundary.length <= POLYGON_MIN_VERTICES) return
    commitRing(openBoundary.filter((_, i) => i !== index))
  }

  function insertVertexAfter(index: number, vLat: number, vLng: number) {
    if (!openBoundary) return
    const next = [...openBoundary]
    next.splice(index + 1, 0, [vLng, vLat])
    commitRing(next)
  }

  function handleMapClick(clickLat: number, clickLng: number) {
    if (geofenceType === 'polygon') {
      // Clicks add vertices while drawing; a committed shape is edited via its
      // handles, so stray map clicks do nothing.
      if (!boundaryRing) setDraft((prev) => [...prev, [clickLat, clickLng]])
      return
    }
    onLatLngChange(clickLat, clickLng)
  }

  const polygonValidation = useMemo(
    () => (geofenceType === 'polygon' && boundaryRing ? validatePolygonRing(boundaryRing) : null),
    [geofenceType, boundaryRing]
  )

  const boundaryArea = useMemo(
    () => (boundaryRing ? polygonAreaMeters(boundaryRing) : 0),
    [boundaryRing]
  )

  const boundaryGeojsonValue =
    geofenceType === 'polygon' && boundaryRing
      ? JSON.stringify({ type: 'Polygon', coordinates: [boundaryRing] })
      : ''

  const mapContent = useMemo(() => {
    if (!isMounted || !MapContainer) {
      return (
        <div
          style={{
            height: 320,
            background: theme.bgElevated,
            borderRadius: 14,
            border: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.textMuted,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Loading map...
        </div>
      )
    }

    const drawing = geofenceType === 'polygon' && !boundaryRing

    return (
      <div
        style={{
          height: 320,
          borderRadius: 14,
          border: `1px solid ${theme.border}`,
          overflow: 'hidden',
          position: 'relative',
          cursor: drawing ? 'crosshair' : undefined,
        }}
      >
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter lat={lat} lng={lng} />
          <MapEvents onClick={handleMapClick} />
          {geofenceType !== 'polygon' && (
            <Marker
              position={[lat, lng]}
              draggable={true}
              ref={markerRef}
              eventHandlers={eventHandlers}
            />
          )}
          {geofenceType === 'circle' && (
            <Circle
              center={[lat, lng]}
              radius={radiusMeters}
              pathOptions={{
                fillColor: theme.primary,
                fillOpacity: 0.15,
                color: theme.primary,
                weight: 2,
              }}
            />
          )}
          {geofenceType === 'city' && (
            <Polygon
              positions={boundaryToLeafletCoords(VICTORIA_BOUNDARY)}
              pathOptions={{
                fillColor: theme.primary,
                fillOpacity: 0.1,
                color: theme.primary,
                weight: 2,
              }}
            />
          )}

          {/* Drawing in progress: dashed preview + numbered vertices */}
          {drawing && draft.length >= 2 && (
            <Polyline
              positions={draft}
              pathOptions={{ color: theme.primary, weight: 2, dashArray: '6 6' }}
            />
          )}
          {drawing &&
            draft.map(([vLat, vLng], i) => (
              <Marker
                key={`draft-${i}`}
                position={[vLat, vLng]}
                icon={vertexIcon(i === 0 ? theme.highlight ?? '#f59e0b' : theme.primary)}
                eventHandlers={
                  i === 0 && draft.length >= POLYGON_MIN_VERTICES
                    ? { click: () => finishDraft() }
                    : undefined
                }
              />
            ))}

          {/* Committed shape: polygon + draggable vertex/midpoint handles */}
          {geofenceType === 'polygon' && openBoundary && (
            <>
              <Polygon
                positions={openBoundary.map(([vLng, vLat]) => [vLat, vLng])}
                pathOptions={{
                  fillColor: theme.primary,
                  fillOpacity: 0.15,
                  color: theme.primary,
                  weight: 2,
                }}
              />
              {openBoundary.map(([vLng, vLat], i) => (
                <Marker
                  key={`vertex-${i}-${openBoundary.length}`}
                  position={[vLat, vLng]}
                  draggable={true}
                  icon={vertexIcon(theme.primary)}
                  eventHandlers={{
                    dragend: (e: any) => {
                      const p = e.target.getLatLng()
                      updateVertex(i, p.lat, p.lng)
                    },
                    contextmenu: () => deleteVertex(i),
                  }}
                />
              ))}
              {openBoundary.map(([vLng, vLat], i) => {
                const [nLng, nLat] = openBoundary[(i + 1) % openBoundary.length]
                return (
                  <Marker
                    key={`mid-${i}-${openBoundary.length}`}
                    position={[(vLat + nLat) / 2, (vLng + nLng) / 2]}
                    draggable={true}
                    icon={midpointIcon()}
                    eventHandlers={{
                      dragend: (e: any) => {
                        const p = e.target.getLatLng()
                        insertVertexAfter(i, p.lat, p.lng)
                      },
                    }}
                  />
                )
              })}
            </>
          )}
        </MapContainer>
      </div>
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, geofenceType, lat, lng, radiusMeters, eventHandlers, draft, boundaryRing, openBoundary])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Hidden inputs for FormData serialization */}
      {renderHiddenInputs && (
        <>
          <input type="hidden" name="geofence_type" value={geofenceType} />
          <input type="hidden" name="city_id" value={cityId ?? ''} />
          <input type="hidden" name="lat" value={lat} />
          <input type="hidden" name="lng" value={lng} />
          <input type="hidden" name="radius_meters" value={geofenceType === 'circle' ? radiusMeters : 0} />
          <input type="hidden" name="boundary_geojson" value={boundaryGeojsonValue} />
        </>
      )}

      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Geofence</h2>
        <p style={{ margin: '4px 0 0', color: theme.textMuted, fontSize: 13 }}>
          Where must the player be when they submit proof?
        </p>
      </div>

      {/* Type selection pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['none', 'circle', 'city', 'polygon', 'multi'] as const).map((type) => {
          const active = geofenceType === type
          let label = 'Anywhere'
          if (type === 'circle') label = 'Radius'
          if (type === 'city') label = 'Victoria'
          if (type === 'polygon') label = 'Draw'
          if (type === 'multi') label = 'Multiple'

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              style={{
                border: active ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                background: active ? theme.primarySoft : 'transparent',
                color: active ? theme.primaryLight : theme.textMuted,
                borderRadius: 999,
                padding: '8px 14px',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {type === 'none' && '📍 '}
              {type === 'circle' && '⭕ '}
              {type === 'city' && '🌆 '}
              {type === 'polygon' && '✏️ '}
              {type === 'multi' && '📌 '}
              {label}
            </button>
          )
        })}
      </div>

      {geofenceType === 'multi' && onMultiAreasChange ? (
        <MultiAreaEditor
          areas={multiAreas}
          onAreasChange={onMultiAreasChange}
          onRepresentativeLatLng={onLatLngChange}
        />
      ) : null}

      {geofenceType !== 'multi' && mapContent}

      {/* Conditional: Polygon draw controls */}
      {geofenceType === 'polygon' && (
        <div className="admin-card" style={{ background: theme.bgElevated, border: `1px solid ${theme.border}`, padding: 14 }}>
          {!boundaryRing ? (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: theme.textMuted }}>
                {draft.length === 0
                  ? 'Tap the map to add points. Add at least 3, then finish the shape.'
                  : `${draft.length} point${draft.length === 1 ? '' : 's'} — tap the first point or Finish to close the shape.`}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  style={{ fontSize: 12 }}
                  disabled={draft.length < POLYGON_MIN_VERTICES}
                  onClick={finishDraft}
                >
                  ✓ Finish shape ({draft.length})
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  style={{ fontSize: 12 }}
                  disabled={draft.length === 0}
                  onClick={() => setDraft((prev) => prev.slice(0, -1))}
                >
                  ↩ Undo point
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  style={{ fontSize: 12 }}
                  disabled={draft.length === 0}
                  onClick={clearPolygon}
                >
                  ✕ Clear
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: theme.textMuted }}>
                <strong style={{ color: theme.text }}>
                  {openBoundary?.length ?? 0} points · {formatArea(boundaryArea)}
                </strong>
                {' — '}drag points to adjust · drag a midpoint to add detail · right-click a point to remove it.
              </p>
              {polygonValidation && !polygonValidation.ok && (
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#fca5a5', fontWeight: 600 }}>
                  ⚠ {polygonValidation.error}
                </p>
              )}
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                style={{ fontSize: 12 }}
                onClick={clearPolygon}
              >
                ✕ Clear and redraw
              </button>
            </>
          )}
        </div>
      )}

      {/* Coordinate settings (single-area modes) */}
      {geofenceType !== 'multi' && (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="admin-label" style={{ margin: 0 }}>
            {geofenceType === 'polygon' ? 'Map pin (auto-set to zone centre)' : 'Coordinates'}
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            style={{ fontSize: 11, padding: '4px 8px' }}
            onClick={handleResetToVictoria}
          >
            Use Victoria centre
          </button>
        </div>
        <div className="admin-grid-2">
          <div className="admin-field">
            <label className="admin-label" style={{ fontSize: 12 }}>Latitude</label>
            <input
              className="admin-input"
              type="number"
              step="any"
              value={lat}
              onChange={(e) => onLatLngChange(parseFloat(e.target.value) || 0, lng)}
              required
            />
          </div>
          <div className="admin-field">
            <label className="admin-label" style={{ fontSize: 12 }}>Longitude</label>
            <input
              className="admin-input"
              type="number"
              step="any"
              value={lng}
              onChange={(e) => onLatLngChange(lat, parseFloat(e.target.value) || 0)}
              required
            />
          </div>
        </div>
      </div>
      )}

      {/* Conditional: Circle Radius Control */}
      {geofenceType === 'circle' && (
        <div className="admin-card" style={{ background: theme.bgElevated, border: `1px solid ${theme.border}`, padding: 14 }}>
          <label className="admin-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span>Radius: <strong>{radiusMeters}m</strong></span>
            <span style={{ color: theme.textMuted }}>Min 50m · Max 2000m</span>
          </label>
          <input
            type="range"
            min={50}
            max={2000}
            step={10}
            value={radiusMeters}
            onChange={(e) => onRadiusChange(parseInt(e.target.value, 10))}
            style={{ width: '100%', accentColor: theme.primary, marginBottom: 12 }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {RADIUS_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="admin-btn admin-btn-ghost"
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: radiusMeters === preset ? theme.primarySoft : undefined,
                  border: radiusMeters === preset ? `1px solid ${theme.primary}` : undefined,
                  color: radiusMeters === preset ? theme.primaryLight : undefined,
                }}
                onClick={() => onRadiusChange(preset)}
              >
                {preset}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conditional: City Select Control */}
      {geofenceType === 'city' && (
        <div className="admin-field">
          <label className="admin-label">Select City</label>
          <select
            className="admin-input"
            value={cityId ?? ''}
            onChange={(e) => onCityIdChange(e.target.value || null)}
            required
          >
            <option value="victoria-bc">Victoria, BC</option>
          </select>
        </div>
      )}

      {/* Live Preview description text */}
      <div style={{ fontSize: 13, color: theme.textMuted, fontStyle: 'italic', borderTop: `1px solid ${theme.border}`, paddingTop: 10 }}>
        Geofence type:{' '}
        <span style={{ color: theme.text, fontWeight: 600 }}>
          {formatGeofenceLabel(
            { geofence_type: geofenceType, lat, lng, radius_meters: radiusMeters, city_id: cityId },
            'Victoria, BC',
            multiAreas.length
          )}
        </span>
      </div>
    </div>
  )
}
