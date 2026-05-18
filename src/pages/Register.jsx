import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User as UserIcon, AlertCircle, Map } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nom: '',
    email: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: null })
  }

  const validate = () => {
    const e = {}
    if (form.nom.trim().length < 2) e.nom = 'Au moins 2 caracteres'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email invalide'
    if (form.password.length < 6) e.password = 'Au moins 6 caracteres'
    if (form.password !== form.confirm) e.confirm = 'Les mots de passe ne correspondent pas'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setGlobalError(null)
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setLoading(true)
    try {
      await register(form.email, form.password, form.nom)
      navigate('/map', { replace: true })
    } catch (err) {
      setGlobalError(err.message || 'Erreur lors de l inscription')
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
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Creer un compte</h1>
          <p className="mt-1 text-sm text-slate-500">
            Profitez de toutes les fonctionnalites de Sérénité Mobilité
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {globalError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          <Input
            label="Nom complet"
            name="nom"
            required
            autoComplete="name"
            placeholder="Marie Dupont"
            icon={<UserIcon size={16} />}
            value={form.nom}
            onChange={handleChange}
            error={errors.nom}
          />

          <Input
            label="Adresse email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.fr"
            icon={<Mail size={16} />}
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />

          <Input
            label="Mot de passe"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            placeholder="6 caracteres minimum"
            icon={<Lock size={16} />}
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />

          <Input
            label="Confirmer le mot de passe"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            placeholder="Retapez votre mot de passe"
            icon={<Lock size={16} />}
            value={form.confirm}
            onChange={handleChange}
            error={errors.confirm}
          />

          <Button type="submit" loading={loading} className="w-full">
            Creer mon compte
          </Button>

          <div className="text-center text-sm text-slate-500 pt-2">
            Deja inscrit.e ?{' '}
            <Link to="/login" className="text-calm-600 hover:text-calm-700 font-medium">
              Se connecter
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
