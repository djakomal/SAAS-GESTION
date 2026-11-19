import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ShoppingBag, Eye, EyeOff, Lock, Mail, ArrowRight, Boxes, FileBarChart2, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@stockflow.local')
  const [password, setPassword] = useState('Admin123!')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Renseignez l\'email et le mot de passe')
    setSubmitting(true)
    try {
      await login(email, password)
      toast.success('Connexion réussie 👋')
      navigate('/dashboard')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connexion échouée')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#1e4238] flex-col justify-between p-12 text-white">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-400/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 w-[500px] h-[500px] rounded-full bg-brand-300/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-brand-300 to-brand-500 rounded-xl flex items-center justify-center shadow-lg">
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="font-extrabold text-xl tracking-tight">StockFlow</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-brand-200/60">Gestion commerciale</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Votre commerce, <br />
            <span className="text-brand-300">sous contrôle.</span>
          </h1>
          <p className="text-brand-100/70 mt-5 leading-relaxed">
            Vendez, imprimez vos tickets et suivez vos stocks depuis une seule plateforme pensée pour les commerces locaux.
          </p>
          <div className="space-y-4 mt-10">
            {[
              { icon: Boxes, text: 'Suivi des stocks en temps réel avec alertes' },
              { icon: FileBarChart2, text: 'Facturation professionnelle et export PDF' },
              { icon: ShieldCheck, text: 'Accès sécurisé avec rôles admin / vendeur' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon size={18} className="text-brand-200" />
                </div>
                <span className="text-sm text-brand-50/90">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-brand-200/40">© 2026 StockFlow. Tous droits réservés.</p>
      </div>

      {/* Panneau droit */}
      <div className="flex-1 flex items-center justify-center px-5 py-10 bg-slate-50">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-[#1e4238] rounded-xl flex items-center justify-center">
              <ShoppingBag size={22} className="text-white" />
            </div>
            <span className="font-extrabold text-xl text-slate-800">StockFlow</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Bon retour 👋</h2>
            <p className="text-slate-500 mt-2">Connectez-vous à votre espace de travail.</p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-5">
            <div>
              <label className="label">Adresse email</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input !pl-11"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input !pl-11 !pr-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full !py-3" disabled={submitting}>
              {submitting ? <Spinner className="w-5 h-5" /> : <>Se connecter <ArrowRight size={17} /></>}
            </button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-500">
            <div className="font-semibold text-slate-700 mb-2">Comptes par défaut</div>
            <div className="space-y-1 font-mono">
              <div>👑 <span className="text-slate-700">admin@stockflow.local</span> / Admin123!</div>
              <div>🧑‍💼 <span className="text-slate-700">vendeur@stockflow.local</span> / Vendeur123!</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
