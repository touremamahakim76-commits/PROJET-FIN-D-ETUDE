import { ShieldCheck, Database, ExternalLink, CheckCircle2, BarChart3 } from 'lucide-react'
import Card from '../components/ui/Card'
import { DAY_TYPES } from '../constants/dayTypes'

const dataSources = [
  {
    nom: "Gares et stations du reseau ferre d'Ile-de-France",
    usage: 'Positions geographiques des gares et stations, lignes, modes et exploitants.',
    licence: 'Open Data IDFM',
    url: 'https://data.iledefrance-mobilites.fr/explore/dataset/emplacement-des-gares-idf/table/',
  },
  {
    nom: 'Validations sur le reseau ferre : profils horaires par jour type',
    usage: 'Pourcentages de validations par station, tranche horaire et categorie de jour.',
    licence: 'Open Data IDFM',
    url: 'https://data.iledefrance-mobilites.fr/explore/dataset/validations-reseau-ferre-profils-horaires-par-jour-type-4eme-trimestre/table/',
  },
]

export default function DataSovereignty() {
  return (
    <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-calm-100 text-calm-600 mb-4">
          <ShieldCheck size={26} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Donnees utilisees</h1>
        <p className="mt-2 text-slate-500">
          La carte et les predictions s appuient uniquement sur les deux jeux de donnees
          listés ci-dessous. Aucune source fictive n est affichee.
        </p>
      </div>

      <Card title="Sources de donnees" icon={<Database size={18} />}>
        <div className="grid gap-3 md:grid-cols-2">
          {dataSources.map((src) => (
            <div
              key={src.nom}
              className="rounded-lg border border-slate-100 p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h3 className="font-semibold text-slate-900">{src.nom}</h3>
                <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                  {src.licence}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{src.usage}</p>
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs text-calm-600 hover:text-calm-700"
              >
                Ouvrir la source officielle
                <ExternalLink size={11} />
              </a>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Types de jour du modele" icon={<BarChart3 size={18} />}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {DAY_TYPES.map((type) => (
            <div key={type.value} className="rounded-lg bg-slate-50 p-3">
              <div className="font-mono text-sm font-semibold text-calm-700">{type.value}</div>
              <div className="mt-1 text-xs text-slate-600">{type.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Lecture des couleurs" icon={<CheckCircle2 size={18} />}>
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-lg border border-green-100 bg-green-50 p-4">
            <div className="font-semibold text-green-700">Faible</div>
            <p className="mt-1 text-green-900">Moins de 4% des validations quotidiennes.</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
            <div className="font-semibold text-amber-700">Moyenne</div>
            <p className="mt-1 text-amber-900">De 4% a moins de 9%.</p>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50 p-4">
            <div className="font-semibold text-red-700">Forte</div>
            <p className="mt-1 text-red-900">9% et plus.</p>
          </div>
        </div>
      </Card>

      <div className="card p-5 bg-calm-50 border-calm-100">
        <h3 className="font-semibold text-calm-900 mb-2">Note sur les predictions</h3>
        <p className="text-sm text-calm-800">
          Le pourcentage affiche correspond a la part des validations quotidiennes d une station
          observee sur une tranche horaire, pas au taux de remplissage physique de la gare.
          Les seuils sont donc calibres pour lire cette repartition horaire.
        </p>
      </div>
    </div>
  )
}
