import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Save, FileText, Mail, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import type { Company } from '@/types'
import { PageLoader, Spinner } from '@/components/ui'

const empty: Partial<Company> = {
  name: '', address: '', city: '', phone: '', email: '', taxId: '',
  currency: 'FCFA', invoicePrefix: 'FAC', footerNote: '', notificationEmail: '',
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const { data: company, isLoading } = useQuery({ queryKey: ['company'], queryFn: api.company.get })
  const [form, setForm] = useState<Partial<Company>>(empty)

  useEffect(() => { if (company) setForm(company) }, [company])

  const mutation = useMutation({
    mutationFn: (data: Partial<Company>) => api.company.update(data),
    onSuccess: () => {
      toast.success('Paramètres enregistrés')
      qc.invalidateQueries({ queryKey: ['company'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const [testEmail, setTestEmail] = useState('')
  const testMutation = useMutation({
    mutationFn: (to: string) => api.notifications.testEmail(to),
    onSuccess: (r) => toast[r.sent ? 'success' : 'error'](r.sent ? 'Email de test envoyé' : 'SMTP non configuré : aperçu affiché dans les logs du serveur'),
    onError: (e) => toast.error(e.message),
  })

  const set = (key: keyof Company, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name?.trim()) return toast.error('Le nom de la société est requis')
    mutation.mutate(form)
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="animate-in max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Paramètres de la société</h1>
        <p className="text-sm text-slate-500 mt-1">Ces informations apparaissent sur vos factures et documents.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="card p-5 sm:p-6">
          <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2"><Building2 size={18} className="text-brand-600" /> Identité de la société</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="label">Nom de la société *</label><input className="input" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="label">Adresse</label><input className="input" value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} placeholder="12 avenue..." /></div>
            <div><label className="label">Ville</label><input className="input" value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} /></div>
            <div><label className="label">Téléphone</label><input className="input" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
            <div><label className="label">Email</label><input type="email" className="input" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></div>
            <div><label className="label">NIF / SIRET / Taxe ID</label><input className="input" value={form.taxId ?? ''} onChange={(e) => set('taxId', e.target.value)} /></div>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="font-bold text-slate-800 mb-5 flex items-center gap-2"><FileText size={18} className="text-brand-600" /> Facturation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="label">Devise</label>
              <select className="input" value={form.currency ?? 'FCFA'} onChange={(e) => set('currency', e.target.value)}>
                {['FCFA', 'XOF', 'EUR', 'USD', 'MAD', 'CDF', 'GNF'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="label">Préfixe des factures</label><input className="input font-mono uppercase" value={form.invoicePrefix ?? 'FAC'} onChange={(e) => set('invoicePrefix', e.target.value.toUpperCase())} placeholder="FAC" /></div>
            <div className="sm:col-span-2"><label className="label">Message en pied de facture</label><textarea className="input resize-none" rows={2} value={form.footerNote ?? ''} onChange={(e) => set('footerNote', e.target.value)} placeholder="Merci pour votre confiance !" /></div>
          </div>
          <p className="text-xs text-slate-400 mt-3">Le prochain numéro sera : <span className="font-mono font-semibold text-slate-600">{form.invoicePrefix ?? 'FAC'}-{new Date().getFullYear()}-XXXX</span></p>
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Mail size={18} className="text-brand-600" /> Notifications par email</h2>
          <p className="text-sm text-slate-500 mb-5">
            Les alertes (stock faible, nouvelle vente, rapport quotidien) sont envoyées à cette adresse en plus des notifications intégrées. Les comptes administrateurs la reçoivent aussi.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Email de réception des alertes</label>
              <input type="email" className="input" value={form.notificationEmail ?? ''} onChange={(e) => set('notificationEmail', e.target.value)} placeholder="patron@boutique.local" />
            </div>
            <div>
              <label className="label">Tester l'envoi</label>
              <div className="flex gap-2">
                <input type="email" className="input" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="destinataire@exemple.com" />
                <button type="button" className="btn-secondary !px-3" disabled={!testEmail || testMutation.isPending} onClick={() => testMutation.mutate(testEmail)}>
                  {testMutation.isPending ? <Spinner className="w-4 h-4" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            ⚙️ SMTP à configurer dans <code className="font-mono">server/.env</code> (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS). Sans configuration, les emails sont affichés en aperçu dans les logs du serveur.
          </p>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="w-5 h-5" /> : <Save size={17} />} Enregistrer les paramètres
          </button>
        </div>
      </form>
    </div>
  )
}
