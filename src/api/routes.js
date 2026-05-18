import apiClient, { USE_MOCK } from './client'
import { mockSavedRoutes } from '../mocks/routes'
import { zones as mockZones, getDensityAtHour, getDensityLevel } from '../mocks/zones'

const delay = (ms = 400) => new Promise((res) => setTimeout(res, ms))

/**
 * Calcule un trajet "factice" entre deux zones :
 *  - rapide : ligne directe
 *  - calme  : passe par les zones les moins denses
 * En production le backend Laravel renvoie un polyline
 * issu d un algorithme Dijkstra pondere par la densite.
 */
function buildMockRoute(departId, arriveeId, hour) {
  const dep = mockZones.find((z) => z.id === departId)
  const arr = mockZones.find((z) => z.id === arriveeId)
  if (!dep || !arr) throw new Error('Zone(s) introuvable(s)')

  // Itineraires mock : rapide, equilibre, puis tres calme.
  const intermediates = mockZones
    .filter((z) => z.id !== departId && z.id !== arriveeId)
    .map((z) => ({ z, d: getDensityAtHour(z, hour) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2)
    .map((x) => x.z)

  const fastPath = [dep, arr]
  const balancedPath = [dep, intermediates[0], arr].filter(Boolean)
  const calmPath = [dep, ...intermediates, arr]

  return {
    fast: formatMockRoute('normale', fastPath, hour, 12),
    balanced: formatMockRoute('equilibree', balancedPath, hour, 13),
    calm: formatMockRoute('tres_calme', calmPath, hour, 15),
  }
}

// Distance haversine simplifiee
function haversine(a, b) {
  const R = 6371
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180
  const lat1 = (a.latitude * Math.PI) / 180
  const lat2 = (b.latitude * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(x)) * 10) / 10
}

function pathDistance(zonesArr) {
  let total = 0
  for (let i = 0; i < zonesArr.length - 1; i++) {
    total += haversine(zonesArr[i], zonesArr[i + 1])
  }
  return Math.round(total * 10) / 10
}

function getMaxDensiteOnPath(zonesArr, hour) {
  const max = Math.max(...zonesArr.map((z) => getDensityAtHour(z, hour)))
  return getDensityLevel(max)
}

function formatMockRoute(type, path, hour, durationFactor) {
  const values = path.map((z) => getDensityAtHour(z, hour))
  const distance = pathDistance(path)
  const duration = Math.max(1, Math.round(distance * durationFactor))

  return {
    type,
    coordinates: path.map((z) => [z.latitude, z.longitude]),
    stations: path.map((z) => z.nom),
    station_details: path.map((z) => {
      const intensity = getDensityAtHour(z, hour)
      return {
        id: z.id,
        nom: z.nom,
        ligne: z.description,
        mode: z.type,
        intensite: intensity,
        intensite_level: getDensityLevel(intensity),
      }
    }),
    segments: path.slice(1).map((z, index) => {
      const intensity = getDensityAtHour(z, hour)
      return {
        from: path[index].nom,
        to: z.nom,
        kind: 'mock',
        lines: [],
        distance_km: haversine(path[index], z),
        duree_min: Math.max(1, Math.round(haversine(path[index], z) * durationFactor)),
        intensite: intensity,
        intensite_level: getDensityLevel(intensity),
      }
    }),
    distance_km: distance,
    duree_min: duration,
    departure_time: `${String(hour).padStart(2, '0')}h00`,
    arrival_time: `${String((hour + Math.ceil(duration / 60)) % 24).padStart(2, '0')}h00`,
    intensite_moyenne: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100,
    intensite_max: Math.max(...values),
    intensite_label: getDensityLevel(values.reduce((sum, value) => sum + value, 0) / values.length),
    densite_max: getMaxDensiteOnPath(path, hour),
  }
}

export const routesApi = {
  /** POST /api/routes/calculate */
  async calculate(
    departId,
    arriveeId,
    hour = new Date().getHours(),
    timeMode = 'depart',
    dayType = 'JOHV',
  ) {
    if (USE_MOCK) {
      await delay(700)
      return buildMockRoute(departId, arriveeId, hour)
    }
    const { data } = await apiClient.post('/routes/calculate', {
      depart_id: departId,
      arrivee_id: arriveeId,
      hour,
      time_mode: timeMode,
      day_type: dayType,
    })
    return data
  },

  /** GET /api/routes/saved */
  async listSaved() {
    if (USE_MOCK) {
      await delay()
      return [...mockSavedRoutes]
    }
    const { data } = await apiClient.get('/routes/saved')
    return data
  },

  /** POST /api/routes/saved */
  async save(route) {
    if (USE_MOCK) {
      await delay()
      const newRoute = {
        ...route,
        id: Date.now(),
        cree_le: new Date().toISOString(),
      }
      mockSavedRoutes.unshift(newRoute)
      return newRoute
    }
    const { data } = await apiClient.post('/routes/saved', route)
    return data
  },

  /** DELETE /api/routes/saved/:id */
  async deleteSaved(id) {
    if (USE_MOCK) {
      await delay()
      const idx = mockSavedRoutes.findIndex((r) => r.id === id)
      if (idx >= 0) mockSavedRoutes.splice(idx, 1)
      return { success: true }
    }
    const { data } = await apiClient.delete(`/routes/saved/${id}`)
    return data
  },

  /** PATCH /api/routes/saved/:id */
  async toggleFavori(id) {
    if (USE_MOCK) {
      await delay(150)
      const r = mockSavedRoutes.find((x) => x.id === id)
      if (r) r.favori = !r.favori
      return r
    }
    const { data } = await apiClient.patch(`/routes/saved/${id}`, {
      action: 'toggle_favori',
    })
    return data
  },
}
