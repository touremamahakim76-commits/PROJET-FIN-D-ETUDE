import { User, Mail, Settings as SettingsIcon, Bell, Eye, Save } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

/**
 * Page profil : infos utilisateur + preferences (sensibilite, options).
 * Les preferences sont sauvegardees via le contexte (localStorage en mock).
 */
export default function Profile() {
  const { user, updatePreferences } = useAuth()
  const [prefs, setPrefs] = useState(user?.preferences ?? {})
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    updatePreferences(prefs)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Mon profil</h1>

      {/* Identite */}
      <Card title="Informations" icon={<User size={18} />}>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400 mb-0.5">Nom</div>
            <div className="font-medium text-slate-900">{user?.nom}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
              <Mail size={11} /> Email
            </div>
            <div className="font-medium text-slate-900">{user?.email}</div>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card
        title="Preferences"
        subtitle="Personnalisez votre experience"
        icon={<SettingsIcon size={18} />}
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="label">Sensibilite a l affluence</label>
            <p className="text-xs text-slate-400 mb-2">
              Influence le seuil a partir duquel une zone est consideree comme genante.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { v: 'faible',  label: 'Faible',  desc: 'Je tolere la foule' },
                { v: 'moyenne', label: 'Moyenne', desc: 'Equilibre' },
                { v: 'forte',   label: 'Forte',   desc: 'J evite tout' },
              ].map((opt) => {
                const active = prefs.sensibilite === opt.v
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setPrefs({ ...prefs, sensibilite: opt.v })}
                    className={`text-left rounded-lg border p-3 transition-all ${
                      active
                        ? 'border-calm-500 bg-calm-50 ring-1 ring-calm-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-slate-900">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2">
              <Bell size={16} className="text-slate-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900">
                  Eviter le metro aux heures de pointe
                </div>
                <div className="text-xs text-slate-500">
                  Penalise fortement les stations entre 7h-9h et 17h-19h.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.eviter_metro_heures_pointe || false}
              onChange={(e) =>
                setPrefs({ ...prefs, eviter_metro_heures_pointe: e.target.checked })
              }
              className="h-4 w-4 rounded accent-calm-600 mt-1"
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2">
              <Eye size={16} className="text-slate-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-slate-900">Mode sombre (a venir)</div>
                <div className="text-xs text-slate-500">
                  Bascule l interface en theme sombre. Disponible prochainement.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={prefs.mode_sombre || false}
              onChange={(e) => setPrefs({ ...prefs, mode_sombre: e.target.checked })}
              className="h-4 w-4 rounded accent-calm-600 mt-1"
              disabled
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" icon={<Save size={14} />}>
              Enregistrer
            </Button>
            {saved && (
              <span className="text-sm text-green-600 animate-fade-in">
                Preferences enregistrees
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  )
}
