import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { KeyRound, UserCircle, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { dateFR } from '@/lib/format'
import type { User } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { Badge, Spinner } from '@/components/ui'

export default function ProfilePage() {
  const { user, refresh } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.auth.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Mot de passe modifié')
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      refresh()
    },
    onError: (e) => toast.error(e.message),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) return toast.error('Les mots de passe ne correspondent pas')
    if (newPassword.length < 8) return toast.error('8 caractères minimum')
    mutation.mutate()
  }

  if (!user) return null
  const u = user as User

  return (
    <div className="animate-in max-w-3xl">
      <div className="mb-6"><h1 className="text-2xl font-bold text-slate-900">Mon profil</h1><p className="text-sm text-slate-500 mt-1">Vos informations personnelles et sécurité.</p></div>

      <div className="card p-5 sm:p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-extrabold text-2xl">{u.name.charAt(0).toUpperCase()}</div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{u.name}</h2>
            <p className="text-sm text-slate-500">{u.email}</p>
            <div className="flex gap-2 mt-2">
              <Badge color={u.role === 'ADMIN' ? 'brand' : 'slate'}><Shield size={12} /> {u.role === 'ADMIN' ? 'Administrateur' : 'Vendeur'}</Badge>
              <Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? 'Compte actif' : 'Compte inactif'}</Badge>
            </div>
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Membre depuis</div><div className="text-slate-700 mt-1">{dateFR(u.createdAt)}</div></div>
          <div><div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Identifiant</div><div className="text-slate-700 mt-1 font-mono text-xs">{u.id}</div></div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2"><KeyRound size={18} className="text-brand-600" /> Modifier le mot de passe</h2>
        <form onSubmit={submit} className="space-y-4 max-w-md">
          <div><label className="label">Mot de passe actuel</label><input type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></div>
          <div><label className="label">Nouveau mot de passe</label><input type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8 caractères minimum" required /></div>
          <div><label className="label">Confirmer le nouveau mot de passe</label><input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>{mutation.isPending ? <Spinner className="w-5 h-5" /> : <><UserCircle size={17} /> Mettre à jour</>}</button>
        </form>
      </div>
    </div>
  )
}
