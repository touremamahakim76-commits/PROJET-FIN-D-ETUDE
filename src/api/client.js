import axios from 'axios'

/**
 * Instance axios partagee.
 * - baseURL pointe vers Laravel (ex. http://127.0.0.1:8000/api)
 * - intercepteur ajoute le token JWT s il existe
 * - intercepteur de reponse gere les 401 globalement
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('calmpath_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // token invalide -> on nettoie
      localStorage.removeItem('calmpath_token')
      localStorage.removeItem('calmpath_user')
    }
    if (error.code === 'ECONNABORTED') {
      error.message = 'Le calcul prend trop de temps. Reessayez avec une autre heure ou relancez le serveur.'
    }
    return Promise.reject(error)
  },
)

export default apiClient
