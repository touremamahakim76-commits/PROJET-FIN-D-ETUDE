import { Routes, Route } from 'react-router-dom'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ProtectedRoute from './routes/ProtectedRoute'

import Home            from './pages/Home'
import Login           from './pages/Login'
import Register        from './pages/Register'
import MapPage         from './pages/MapPage'
import RoutePlanner    from './pages/RoutePlanner'
import SavedRoutes     from './pages/SavedRoutes'
import Profile         from './pages/Profile'
import DataSovereignty from './pages/DataSovereignty'
import NotFound        from './pages/NotFound'

/**
 * Composant racine. Definit la structure principale (Navbar / contenu / Footer)
 * et l ensemble des routes.
 *
 * Routes publiques  : /, /map, /trajet, /donnees, /login, /register
 * Routes protegees  : /mes-trajets, /profil
 */
export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        <Routes>
          {/* Public */}
          <Route path="/"          element={<Home />} />
          <Route path="/map"       element={<MapPage />} />
          <Route path="/trajet"    element={<RoutePlanner />} />
          <Route path="/donnees"   element={<DataSovereignty />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<Register />} />

          {/* Protege */}
          <Route
            path="/mes-trajets"
            element={
              <ProtectedRoute>
                <SavedRoutes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profil"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
    </div>
  )
}
