import { useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Shield, Pencil, Trash2, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { dateFR } from '@/lib/format'
import type { User } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { Badge, ConfirmDialog, Modal, PageHeader, PageLoader, Spinner } from '@/components/ui'

const emptyForm = { name: '', email: '', password: '', role: 'VENDEUR', isActive: true }

export default function UsersPage() {
  const { user: current } = useAuth()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleting, setDeleting] = useState<User | null>(null)

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: api.users.list })

  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => editing
      ? api.users.update(editing.id, { name: data.name, email: data.email, role: data.role as 'ADMIN' | 'VENDEUR', isActive: data.isActive, ...(data.password ? { password: data.password } : {}) })
      : api.users.create(data),
    onSuccess: () => { toast.success(editing ? 'Utilisateur mis à jour' : 'Utilisateur créé'); qc.invalidateQueries({ queryKey: ['users'] }); setShowForm(false) },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.remove(id),
    onSuccess: () => { toast.success('Utilisateur supprimé'); qc.invalidateQueries({ queryKey: ['users'] }); setDeleting(null) },
    onError: (e) => toast.error(e.message),
  })

  const toggleMutation = useMutation({
    mutationFn: (u: User) => api.users.update(u.id, { isActive: !u.isActive }),
    onSuccess: () => { toast.success('Statut modifié'); qc.invalidateQueries({ queryKey: ['users'] }) },
    onError: (e) => toast.error(e.message),
  })

  const openForm = (u?: User) => {
    setEditing(u ?? null)
    setForm(u ? { name: u.name, email: u.email, password: '', role: u.role, isActive: u.isActive } : emptyForm)
    setShowForm(true)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || (!editing && !form.password)) return toast.error('Renseignez tous les champs obligatoires')
    saveMutation.mutate(form)
  }

  return (
    <div className="animate-in">
      <PageHeader title="Utilisateurs" subtitle="Gérez les accès à votre espace StockFlow." actions={<button className="btn-primary" onClick={() => openForm()}><Plus size={17} /> Nouvel utilisateur</button>} />

      <div className="card">
        {isLoading ? <PageLoader /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Utilisateur</th><th>Rôle</th><th>Statut</th><th>Créé le</th><th className="text-right">Actions</th></tr></thead>
              <tbody>
                {users?.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">{u.name.charAt(0).toUpperCase()}</div>
                        <div><div className="font-semibold text-slate-800">{u.name}{u.id === current?.id && <span className="ml-2 text-[10px] text-brand-600">(vous)</span>}</div><div className="text-[11px] text-slate-400">{u.email}</div></div>
                      </div>
                    </td>
                    <td><Badge color={u.role === 'ADMIN' ? 'brand' : 'slate'} className="uppercase">{u.role === 'ADMIN' ? <><Shield size={12} /> Admin</> : 'Vendeur'}</Badge></td>
                    <td><Badge color={u.isActive ? 'green' : 'red'}>{u.isActive ? <><UserCheck size={12} /> Actif</> : <><UserX size={12} /> Inactif</>}</Badge></td>
                    <td className="text-slate-500 text-xs">{dateFR(u.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button className="btn-ghost !p-2" onClick={() => openForm(u)}><Pencil size={16} /></button>
                        <button className="btn-ghost !p-2 hover:!text-amber-600" title={u.isActive ? 'Désactiver' : 'Activer'} disabled={u.id === current?.id} onClick={() => toggleMutation.mutate(u)}>
                          {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button className="btn-ghost !p-2 hover:!text-rose-600" disabled={u.id === current?.id} onClick={() => setDeleting(u)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 card p-5">
        <h3 className="font-bold text-slate-800 mb-2">À propos des rôles</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-slate-600">
          <div className="p-3 rounded-lg bg-brand-50/60"><strong className="text-brand-700">Administrateur</strong><p className="mt-1 text-xs">Accès complet : utilisateurs, paramètres, suppression des données et ajustements de stock.</p></div>
          <div className="p-3 rounded-lg bg-slate-50"><strong className="text-slate-700">Vendeur</strong><p className="mt-1 text-xs">Gestion quotidienne : produits, ventes, tickets et suivi des stocks.</p></div>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        footer={<><button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button><button type="submit" form="user-form" className="btn-primary" disabled={saveMutation.isPending}>{saveMutation.isPending ? <Spinner className="w-4 h-4" /> : 'Enregistrer'}</button></>}>
        <form id="user-form" onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="label">Nom *</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">{editing ? 'Nouveau mot de passe (laisser vide)' : 'Mot de passe *'}</label><input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8 caractères min." /></div>
            <div><label className="label">Rôle</label><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="VENDEUR">Vendeur</option><option value="ADMIN">Administrateur</option></select></div>
            {editing && <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-brand-600" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /><span className="text-sm text-slate-600">Compte actif</span></label>}
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Supprimer cet utilisateur ?" message={`Le compte de « ${deleting?.name} » sera supprimé définitivement.`} loading={deleteMutation.isPending} />
    </div>
  )
}
