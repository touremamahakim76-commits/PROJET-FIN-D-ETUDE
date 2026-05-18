import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import BrandLogo from './BrandLogo'

export default function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <BrandLogo className="h-8 w-8" />
              <h4 className="font-semibold text-slate-900">Sérénité Mobilité</h4>
            </div>
            <p className="text-slate-500">
              Cartographie intelligente pour des mobilites sereines en ville.
              Projet d ecole 2026.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Navigation</h4>
            <ul className="space-y-1 text-slate-500">
              <li><Link to="/map" className="hover:text-calm-600">Carte</Link></li>
              <li><Link to="/trajet" className="hover:text-calm-600">Calculer un trajet</Link></li>
              <li><Link to="/donnees" className="hover:text-calm-600">Sources de donnees</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Equipe</h4>
            <ul className="space-y-1 text-slate-500">
              <li>Frontend : Touré Hakim</li>
              <li>Backend : Yoda Yasmine</li>
              <li>Data / IA : Brindou Kouakou</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
          Fait avec <Heart size={12} className="text-red-400" /> pour le projet 5
        </div>
      </div>
    </footer>
  )
}
