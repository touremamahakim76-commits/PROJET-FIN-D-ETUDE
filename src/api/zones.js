import apiClient, { USE_MOCK } from './client'
import {
  zones as mockZones,
  getDensityAtHour,
  getDensityLevel,
} from '../mocks/zones'

const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms))

export const zonesApi = {
  /**
   * GET /api/zones?hour=18
   * Renvoie toutes les zones avec densite calculee pour l heure donnee.
   */
  async list(hour = new Date().getHours(), dayType = 'JOHV') {
    if (USE_MOCK) {
      await delay()
      return mockZones.map((z) => {
        const value = getDensityAtHour(z, hour)
        return {
          id: z.id,
          nom: z.nom,
          type: z.type,
          latitude: z.latitude,
          longitude: z.longitude,
          radius: z.radius,
          description: z.description,
          densite: {
            value,
            level: getDensityLevel(value),
          },
        }
      })
    }
    const { data } = await apiClient.get(
      `/zones?hour=${hour}&day_type=${dayType}`,
    )
    return data
  },

  /**
   * GET /api/zones/:id/predict?hour=18
   * Prediction IA de la densite a une heure future.
   * En mock on prend simplement la courbe horaire avec un peu de bruit.
   */
  async predict(zoneId, hour, dayType = 'JOHV') {
    if (USE_MOCK) {
      await delay(500)
      const z = mockZones.find((zone) => zone.id === zoneId)
      if (!z) throw new Error('Zone introuvable')
      const value = getDensityAtHour(z, hour)
      // Marge d incertitude simulee
      const uncertainty = 8
      return {
        zone_id: zoneId,
        hour,
        day_type: dayType,
        prediction: value,
        level: getDensityLevel(value),
        confidence: 0.87,
        interval: [
          Math.max(0, value - uncertainty),
          Math.min(100, value + uncertainty),
        ],
        message:
          value >= 65
            ? `A ${hour}h cette zone sera tres frequentee`
            : value >= 35
              ? `A ${hour}h affluence moderee attendue`
              : `A ${hour}h zone calme prevue`,
      }
    }
    const { data } = await apiClient.get(
      `/zones/${zoneId}/predict?hour=${hour}&day_type=${dayType}`,
    )
    return data
  },
}
