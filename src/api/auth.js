import apiClient, { USE_MOCK } from './client'
import { mockUsers } from '../mocks/users'

/**
 * Simule une latence reseau pour rendre les appels mock realistes
 */
const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms))

export const authApi = {
  /** POST /api/auth/login */
  async login(email, password) {
    if (USE_MOCK) {
      await delay()
      const user = mockUsers.find(
        (u) => u.email === email && u.password === password,
      )
      if (!user) {
        const err = new Error('Email ou mot de passe incorrect')
        err.code = 'INVALID_CREDENTIALS'
        throw err
      }
      // Pas de vrai JWT en mock, on cree un faux token
      const token = `mock-token-${user.id}-${Date.now()}`
      const { password: _pw, ...safeUser } = user
      return { user: safeUser, token }
    }
    const { data } = await apiClient.post('/auth/login', { email, password })
    return data
  },

  /** POST /api/auth/register */
  async register(email, password, nom) {
    if (USE_MOCK) {
      await delay()
      if (mockUsers.find((u) => u.email === email)) {
        const err = new Error('Cet email est deja utilise')
        err.code = 'EMAIL_TAKEN'
        throw err
      }
      const newUser = {
        id: Date.now(),
        email,
        password,
        nom,
        avatar: null,
        preferences: {
          sensibilite: 'moyenne',
          eviter_metro_heures_pointe: true,
          mode_sombre: false,
        },
      }
      mockUsers.push(newUser)
      const token = `mock-token-${newUser.id}-${Date.now()}`
      const { password: _pw, ...safeUser } = newUser
      return { user: safeUser, token }
    }
    const { data } = await apiClient.post('/auth/register', {
      email,
      password,
      name: nom,
    })
    return data
  },

  /** GET /api/auth/me */
  async me() {
    if (USE_MOCK) {
      await delay(200)
      const userJson = localStorage.getItem('calmpath_user')
      if (!userJson) throw new Error('Non authentifie')
      return JSON.parse(userJson)
    }
    const { data } = await apiClient.get('/auth/me')
    return data
  },

  /** POST /api/auth/logout */
  async logout() {
    if (USE_MOCK) {
      await delay(150)
      return { success: true }
    }
    const { data } = await apiClient.post('/auth/logout')
    return data
  },
}
