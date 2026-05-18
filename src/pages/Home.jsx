import { Link } from 'react-router-dom'
import { Map, Brain, Route, ShieldCheck, Heart, Users, Sparkles } from 'lucide-react'
import Button from '../components/ui/Button'
import BrandLogo from '../components/layout/BrandLogo'

const features = [
  {
    icon: Map,
    title: 'Cartographie en temps reel',
    text: 'Visualisez instantanement les zones calmes et bondees autour de vous, avec un code couleur intuitif.',
  },
  {
    icon: Brain,
    title: 'Predictions intelligentes',
    text: 'Notre IA anticipe l affluence des prochaines heures pour vous aider a planifier sereinement.',
  },
  {
    icon: Route,
    title: 'Trajets optimises',
    text: 'Privilegiez les itineraires les moins frequentes grace a notre algorithme de chemin optimal.',
  },
  {
    icon: ShieldCheck,
    title: 'Donnees responsables',
    text: 'Sources publiques, ouvertes et tracables. Aucune donnee personnelle n est revendue.',
  },
]

const stats = [
  { value: '15+', label: 'zones surveillees' },
  { value: '24h/24', label: 'mise a jour' },
  { value: '4', label: 'sources fiables' },
]

export default function Home() {
  return (
    <div className="animate-fade-in">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-calm-50 via-white to-calm-50" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-calm-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-calm-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <div className="mb-6 flex justify-center">
              <BrandLogo className="h-16 w-16" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-calm-100 px-4 py-1.5 text-sm font-medium text-calm-700 mb-6">
              <Sparkles size={14} />
              Cartographie intelligente et bienveillante
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900">
              Sérénité Mobilité
            </h1>
            <h2 className="mt-4 text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
              Deplacez-vous en ville,{' '}
              <span className="bg-gradient-to-r from-calm-600 to-calm-400 bg-clip-text text-transparent">
                serein.e
              </span>
            </h2>
            <p className="mt-6 max-w-2xl mx-auto text-base text-slate-600 sm:text-lg">
              Sérénité Mobilité aide les personnes anxieuses ou souffrant de phobies sociales
              a eviter les zones surchargees grace a la donnee ouverte et a l intelligence artificielle.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/map" className="w-full sm:w-auto">
                <Button size="lg" icon={<Map size={18} />} className="w-full sm:w-auto">
                  Explorer la carte
                </Button>
              </Link>
              <Link to="/trajet" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" icon={<Route size={18} />} className="w-full sm:w-auto">
                  Calculer un trajet
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid max-w-lg grid-cols-1 gap-3 mx-auto sm:mt-16 sm:grid-cols-3 sm:gap-4">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-3xl font-bold text-calm-700">{s.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-14 bg-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-slate-900">
              Une approche bienveillante de la mobilite
            </h2>
            <p className="mt-4 text-slate-600">
              Quatre fonctionnalites cles pour reprendre confiance dans la ville.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className="card p-6 hover:shadow-md transition-shadow"
                >
                  <div className="h-12 w-12 rounded-xl bg-calm-100 flex items-center justify-center text-calm-600 mb-4">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{f.text}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="py-14 bg-slate-50 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-6">
            <Heart size={26} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Notre mission</h2>
          <p className="mt-6 text-base text-slate-600 sm:text-lg">
            En France, plus d 8 millions de personnes vivent avec un trouble anxieux.
            Pour beaucoup, prendre le metro a 18h ou traverser une foule peut etre une epreuve.
            Nous croyons que la donnee ouverte, combinee a une interface bienveillante,
            peut redonner de l autonomie et de la liberte.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm text-slate-500">
            <Users size={16} />
            Concu par des etudiants, pour la communaute.
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-gradient-to-br from-calm-600 to-calm-800 text-white sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold">
            Pret a explorer la ville autrement ?
          </h2>
          <p className="mt-4 text-calm-100">
            Creez un compte pour sauvegarder vos trajets et personnaliser votre experience.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Creer un compte gratuit
              </Button>
            </Link>
            <Link to="/map" className="w-full sm:w-auto">
              <Button size="lg" variant="ghost" className="w-full text-white hover:bg-white/10 sm:w-auto">
                Tester sans compte
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
