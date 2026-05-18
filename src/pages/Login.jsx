import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle, Map } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/map'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-calm-50 via-white to-slate-50">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-calm-600 text-white">
            <Map size={22} />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Bon retour parmi nous</h1>
          <p className="mt-1 text-sm text-slate-500">
            Connectez-vous pour acceder a vos trajets sauvegardes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Adresse email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.fr"
            icon={<Mail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Mot de passe"
            type="password"
            required
            autoComplete="current-password"
            placeholder="********"
            icon={<Lock size={16} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" loading={loading} className="w-full">
            Se connecter
          </Button>

          <div className="text-center text-sm text-slate-500 pt-2">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-calm-600 hover:text-calm-700 font-medium">
              Creer un compte
            </Link>
          </div>
        </form>

        {/* Hint demo */}
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <strong>Compte de demo :</strong> demo@calmpath.fr / demo1234
        </div>
      </div>
    </div>
  )
}
