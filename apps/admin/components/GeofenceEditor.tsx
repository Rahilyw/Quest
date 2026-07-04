'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { theme, VICTORIA_DEFAULT } from '@/lib/theme'
import { boundaryToLeafletCoords, VICTORIA_BOUNDARY } from '@/lib/cities'
import { formatGeofenceLabel, RADIUS_PRESETS, DEFAULT_CITY_ID } from '@quest/geofence'

import 'leaflet/dist/leaflet.css'

export type GeofenceType = 'none' | 'circle' | 'city'

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
  /** When true, emit hidden inputs for FormData (create form). When false, parent manages state only (edit form). */
  renderHiddenInputs?: boolean
}

// Dynamically load components on the client side
let MapContainer: any = null
let TileLayer: any = null
let Marker: any = null
let Circle: any = null
let Polygon: any = null
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
  renderHiddenInputs = false,
}: GeofenceEditorProps) {
  const [isMounted, setIsMounted] = useState(false)
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
    }
  }

  const handleResetToVictoria = () => {
    onLatLngChange(VICTORIA_DEFAULT.lat, VICTORIA_DEFAULT.lng)
  }

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

    return (
      <div
        style={{
          height: 320,
          borderRadius: 14,
          border: `1px solid ${theme.border}`,
          overflow: 'hidden',
          position: 'relative',
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
          <MapEvents onClick={onLatLngChange} />
          <Marker
            position={[lat, lng]}
            draggable={true}
            ref={markerRef}
            eventHandlers={eventHandlers}
          />
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
        </MapContainer>
      </div>
    )
  }, [isMounted, geofenceType, lat, lng, radiusMeters, eventHandlers, onLatLngChange])

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
      <div style={{ display: 'flex', gap: 8 }}>
        {(['none', 'circle', 'city'] as const).map((type) => {
          const active = geofenceType === type
          let label = 'Anywhere'
          if (type === 'circle') label = 'Radius'
          if (type === 'city') label = 'Victoria'

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
              {label}
            </button>
          )
        })}
      </div>

      {/* Map preview */}
      {mapContent}

      {/* Coordinate settings */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="admin-label" style={{ margin: 0 }}>Coordinates</span>
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
        Geofence type: <span style={{ color: theme.text, fontWeight: 600 }}>{formatGeofenceLabel({ geofence_type: geofenceType, lat, lng, radius_meters: radiusMeters, city_id: cityId }, 'Victoria, BC')}</span>
      </div>
    </div>
  )
}
