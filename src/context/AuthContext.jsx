import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth'

const AuthContext = createContext(null)

const STORAGE_TOKEN = 'calmpath_token'
const STORAGE_USER  = 'calmpath_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Au montage : on tente de restaurer la session
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_TOKEN)
    const userJson = localStorage.getItem(STORAGE_USER)
    if (token && userJson) {
      try {
        setUser(JSON.parse(userJson))
      } catch {
        localStorage.removeItem(STORAGE_TOKEN)
        localStorage.removeItem(STORAGE_USER)
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const { user: u, token } = await authApi.login(email, password)
    localStorage.setItem(STORAGE_TOKEN, token)
    localStorage.setItem(STORAGE_USER, JSON.stringify(u))
    setUser(u)
    return u
  }

  const register = async (email, password, nom) => {
    const { user: u, token } = await authApi.register(email, password, nom)
    localStorage.setItem(STORAGE_TOKEN, token)
    localStorage.setItem(STORAGE_USER, JSON.stringify(u))
    setUser(u)
    return u
  }

  const logout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    localStorage.removeItem(STORAGE_TOKEN)
    localStorage.removeItem(STORAGE_USER)
    setUser(null)
  }

  const updatePreferences = (prefs) => {
    if (!user) return
    const updated = { ...user, preferences: { ...user.preferences, ...prefs } }
    setUser(updated)
    localStorage.setItem(STORAGE_USER, JSON.stringify(updated))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Hook simple pour consommer le contexte
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit etre utilise dans <AuthProvider>')
  return ctx
}
