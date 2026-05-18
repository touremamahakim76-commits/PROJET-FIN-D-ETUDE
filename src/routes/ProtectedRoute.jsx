import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/ui/Loader'

/**
 * Wrapper pour les routes necessitant une connexion.
 * Redirige vers /login en conservant la destination initiale.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loader fullscreen />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
