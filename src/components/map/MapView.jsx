import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { DENSITY_COLORS, DENSITY_LABELS } from '../../mocks/zones'

// Fix d un bug connu : les icones Leaflet par defaut ne s affichent pas avec Vite.
// On reattribue manuellement les chemins d images.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Centre de Paris par defaut
const PARIS_CENTER = [48.8566, 2.3522]

/**
 * Petite helper qui force la carte a recalculer sa taille
 * (utile quand on l affiche dans un layout flex).
 */
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    // Leaflet a besoin que le DOM soit paint avant de calculer la taille
    const t1 = setTimeout(() => map.invalidateSize(), 100)
    const t2 = setTimeout(() => map.invalidateSize(), 400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [map])
  return null
}

function RouteBounds({ route }) {
  const map = useMap()

  useEffect(() => {
    const coordinates = route?.coordinates?.filter((coordinate) => (
      Array.isArray(coordinate)
      && Number.isFinite(Number(coordinate[0]))
      && Number.isFinite(Number(coordinate[1]))
    )) ?? []

    if (coordinates.length < 2) return

    const bounds = L.latLngBounds(coordinates)

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.16), { animate: true, maxZoom: 13 })
    }
  }, [map, route])

  return null
}

function ClusteredDensityLayer({ zones, onZoneClick }) {
  const map = useMap()
  const [zoom, setZoom] = useState(map.getZoom())

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })

  const clusters = useMemo(() => buildDensityClusters(zones, map, zoom), [zones, map, zoom])

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.count === 1) {
          const zone = cluster.zones[0]
          const color = DENSITY_COLORS[zone.densite.level]

          return (
            <CircleMarker
              key={`zone-${zone.id}-${zone.densite.level}-${zone.densite.value}`}
              center={[zone.latitude, zone.longitude]}
              radius={5}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.78,
                weight: 1.5,
              }}
              eventHandlers={{
                click: () => onZoneClick?.(zone),
              }}
            >
              <DensityPopup zone={zone} color={color} />
            </CircleMarker>
          )
        }

        return (
          <CircleMarker
            key={`cluster-${cluster.key}-${cluster.count}`}
            center={cluster.center}
            radius={Math.min(24, 9 + Math.log(cluster.count) * 5)}
            pathOptions={{
              color: cluster.color,
              fillColor: cluster.color,
              fillOpacity: 0.86,
              weight: 2,
            }}
            eventHandlers={{
              click: () => {
                const bounds = L.latLngBounds(cluster.zones.map((zone) => [zone.latitude, zone.longitude]))
                map.fitBounds(bounds.pad(0.25), { maxZoom: Math.min(16, zoom + 2) })
              },
            }}
          >
            <Popup>
              <div className="space-y-2">
                <div className="font-semibold text-slate-900">{cluster.count} stations regroupees</div>
                <div className="text-xs text-slate-500">
                  Cliquez sur le point pour zoomer et voir les stations.
                </div>
                <div className="space-y-1">
                  {cluster.zones.slice(0, 5).map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => onZoneClick?.(zone)}
                      className="block w-full rounded-md bg-slate-50 px-2 py-1 text-left text-xs hover:bg-slate-100"
                    >
                      <span className="font-medium text-slate-800">{zone.nom}</span>
                      <span className="ml-1 text-slate-500">({zone.densite.value}%)</span>
                    </button>
                  ))}
                </div>
              </div>
            </Popup>
            <Tooltip permanent direction="center" opacity={1} className="density-cluster-label">
              {cluster.count}
            </Tooltip>
          </CircleMarker>
        )
      })}
    </>
  )
}

function DensityPopup({ zone, color }) {
  return (
    <Popup>
      <div className="space-y-1">
        <div className="font-semibold text-slate-900">{zone.nom}</div>
        <div className="text-xs text-slate-500">{zone.description}</div>
        <div className="pt-1 flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-medium">
            Densite {DENSITY_LABELS[zone.densite.level]} ({zone.densite.value}%)
          </span>
        </div>
      </div>
    </Popup>
  )
}

function buildDensityClusters(zones, map, zoom) {
  const gridSize = clusterGridSize(zoom)

  if (gridSize <= 1) {
    return zones.map((zone) => ({
      key: String(zone.id),
      count: 1,
      zones: [zone],
      center: [zone.latitude, zone.longitude],
      color: DENSITY_COLORS[zone.densite.level],
    }))
  }

  const buckets = new Map()

  zones.forEach((zone) => {
    if (!Number.isFinite(Number(zone.latitude)) || !Number.isFinite(Number(zone.longitude))) return

    const point = map.project(L.latLng(zone.latitude, zone.longitude), zoom)
    const key = `${Math.floor(point.x / gridSize)}:${Math.floor(point.y / gridSize)}`
    const bucket = buckets.get(key) ?? []
    bucket.push(zone)
    buckets.set(key, bucket)
  })

  return Array.from(buckets.entries()).map(([key, bucket]) => {
    const lat = bucket.reduce((sum, zone) => sum + Number(zone.latitude), 0) / bucket.length
    const lng = bucket.reduce((sum, zone) => sum + Number(zone.longitude), 0) / bucket.length

    return {
      key,
      count: bucket.length,
      zones: bucket.sort((a, b) => Number(b.densite.value) - Number(a.densite.value)),
      center: [lat, lng],
      color: clusterColor(bucket),
    }
  })
}

function clusterGridSize(zoom) {
  if (zoom >= 15) return 1
  if (zoom >= 13) return 34
  if (zoom >= 11) return 46
  return 60
}

function clusterColor(zones) {
  if (zones.some((zone) => zone.densite.level === 'high')) {
    return DENSITY_COLORS.high
  }

  if (zones.some((zone) => zone.densite.level === 'medium')) {
    return DENSITY_COLORS.medium
  }

  return DENSITY_COLORS.low
}

/**
 * MapView : la carte principale.
 *
 * Props :
 *  - zones : tableau de zones (avec densite calculee)
 *  - onZoneClick : (zone) => void
 *  - selectedRoute : trajet a afficher (optionnel)
 *  - center, zoom : position initiale
 *  - height : classe Tailwind pour la hauteur
 */
export default function MapView({
  zones = [],
  onZoneClick,
  selectedRoute = null,
  routeColor = '#0ea5e9',
  center = PARIS_CENTER,
  zoom = 12,
  height = 'h-[420px] sm:h-[520px] lg:h-[600px]',
}) {
  const singleRoute = selectedRoute?.coordinates ? selectedRoute : null
  const legacyRoute = selectedRoute?.fast || selectedRoute?.calm ? selectedRoute : null
  const endpointMarkers = singleRoute?.coordinates?.length >= 2
    ? [
        {
          key: 'depart',
          label: 'Depart',
          center: singleRoute.coordinates[0],
          station: singleRoute.station_details?.[0]?.nom ?? singleRoute.stations?.[0],
        },
        {
          key: 'arrivee',
          label: 'Arrivee',
          center: singleRoute.coordinates[singleRoute.coordinates.length - 1],
          station: singleRoute.station_details?.[singleRoute.station_details.length - 1]?.nom
            ?? singleRoute.stations?.[singleRoute.stations.length - 1],
        },
      ]
    : []

  return (
    <div className={`relative min-w-0 ${height} rounded-xl overflow-hidden shadow-sm border border-slate-100`}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <MapResizer />
        <RouteBounds route={singleRoute} />

        {/* Tuiles OpenStreetMap (gratuit, pas de cle API) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Points de densite regroupes */}
        <ClusteredDensityLayer zones={zones} onZoneClick={onZoneClick} />

        {/* Trajet selectionne */}
        {singleRoute && (
          <Polyline
            positions={singleRoute.coordinates}
            pathOptions={{
              color: routeColor,
              weight: 5,
              opacity: 0.9,
            }}
          />
        )}

        {endpointMarkers.map((marker) => (
          <CircleMarker
            key={marker.key}
            center={marker.center}
            radius={7}
            pathOptions={{
              color: routeColor,
              fillColor: '#ffffff',
              fillOpacity: 1,
              weight: 3,
            }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-slate-900">{marker.label}</div>
                <div className="text-xs text-slate-500">{marker.station}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Ancien format garde pour compatibilite */}
        {legacyRoute?.fast && (
          <Polyline
            positions={legacyRoute.fast.coordinates}
            pathOptions={{
              color: '#ef4444',
              weight: 4,
              dashArray: '8 8',
              opacity: 0.7,
            }}
          />
        )}
        {legacyRoute?.calm && (
          <Polyline
            positions={legacyRoute.calm.coordinates}
            pathOptions={{
              color: '#22c55e',
              weight: 5,
              opacity: 0.9,
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
