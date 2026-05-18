import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Bookmark, LogOut, Map, Menu, Route, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import BrandLogo from './BrandLogo'

/**
 * Barre haute + liste deroulante de navigation.
 */
export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-calm-50 text-calm-700'
        : 'text-slate-600 hover:text-calm-700 hover:bg-slate-50'
    }`

  return (
    <header className="sticky top-0 z-[2000] border-b border-slate-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="relative flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-12 z-[2100] w-64 rounded-xl border border-slate-100 bg-white p-2 shadow-lg">
                <div className="mb-1 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Navigation
                </div>
                <NavLink to="/map" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                  <Map size={17} /> Carte
                </NavLink>
                <NavLink to="/trajet" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                  <Route size={17} /> Trajet
                </NavLink>
                <NavLink to="/donnees" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                  <ShieldCheck size={17} /> Donnees
                </NavLink>

                {isAuthenticated && (
                  <>
                    <div className="my-2 border-t border-slate-100" />
                    <NavLink to="/mes-trajets" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                      <Bookmark size={17} /> Mes trajets
                    </NavLink>
                    <NavLink to="/profil" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                      <User size={17} /> Profil
                    </NavLink>
                  </>
                )}
              </div>
            )}

            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <BrandLogo className="h-9 w-9" />
              <span className="hidden bg-gradient-to-r from-calm-700 to-indigo-600 bg-clip-text text-transparent sm:inline">
                Sérénité Mobilité
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/profil" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                  <div className="h-7 w-7 rounded-full bg-calm-100 flex items-center justify-center text-calm-700 font-medium text-xs">
                    {user?.nom?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className="text-sm text-slate-700">{user?.nom?.split(' ')[0]}</span>
                </Link>
                <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={handleLogout}>
                  Deconnexion
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">Connexion</Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">Creer un compte</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
