import { Link } from 'react-router-dom'
import { Home, Map } from 'lucide-react'
import Button from '../components/ui/Button'

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl font-bold bg-gradient-to-r from-calm-400 to-calm-700 bg-clip-text text-transparent">
          404
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Page introuvable</h1>
        <p className="mt-2 text-slate-500">
          Cette page n existe pas ou a ete deplacee.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/">
            <Button variant="secondary" icon={<Home size={14} />}>Accueil</Button>
          </Link>
          <Link to="/map">
            <Button icon={<Map size={14} />}>Voir la carte</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
