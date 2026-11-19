import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Plus, Search, FileText, Download, Eye, Trash2, CheckCircle2, Send, XCircle,
  Receipt, Clock3, Printer,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api, printReceipt, downloadInvoicePdf } from '@/lib/api'
import { dateFR, money } from '@/lib/format'
import type { Invoice, InvoiceStatus } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { ConfirmDialog, EmptyState, PageHeader, PageLoader, Pagination, StatusBadge, Spinner } from '@/components/ui'

const statusTabs: Array<{ key: string; label: string }> = [
  { key: 'ALL', label: 'Toutes' },
  { key: 'DRAFT', label: 'Brouillons' },
  { key: 'SENT', label: 'Envoyées' },
  { key: 'PAID', label: 'Payées' },
  { key: 'CANCELLED', label: 'Annulées' },
]

export default function InvoicesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<Invoice | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get, staleTime: Infinity })
  const currency = company?.currency ?? 'FCFA'
  const { data, isLoading } = useQuery({
    queryKey: ['invoices', search, status, page],
    queryFn: () => api.invoices.list({ search, status, page, limit: 12 }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status: s }: { id: string; status: InvoiceStatus }) => api.invoices.changeStatus(id, s),
    onSuccess: (_data, variables) => {
      toast.success(variables.status === 'PAID' ? 'Vente marquée comme payée' : 'Statut mis à jour')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.invoices.remove(id),
    onSuccess: () => { toast.success('Vente supprimée'); qc.invalidateQueries({ queryKey: ['invoices'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDeleting(null) },
    onError: (e) => toast.error(e.message),
  })

  const handleAction = async (inv: Invoice, action: 'pdf' | 'print') => {
    setBusy(`${inv.id}-${action}`)
    try {
      if (action === 'pdf') { await downloadInvoicePdf(inv.id, inv.number); toast.success('PDF téléchargé') }
      else { await printReceipt(inv.id); toast.success('Ticket envoyé à l\'imprimante') }
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Action impossible') }
    finally { setBusy(null) }
  }

  return (
    <div className="animate-in">
      <PageHeader
        title="Ventes & Factures"
        subtitle="Enregistrez vos ventes, imprimez les tickets et suivez les encaissements."
        actions={<Link to="/invoices/new" className="btn-primary"><Plus size={17} /> Nouvelle vente</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Total vendu', value: data?.summary?.total ?? 0, icon: Receipt, color: 'brand' },
          { label: 'Encaissé', value: data?.summary?.paid ?? 0, icon: CheckCircle2, color: 'emerald' },
          { label: 'Brouillons', value: data?.items.filter((i) => i.status === 'DRAFT').length ?? 0, icon: FileText, color: 'slate' },
          { label: 'En attente', value: data?.items.filter((i) => i.status === 'SENT').length ?? 0, icon: Clock3, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : color === 'amber' ? 'bg-amber-50 text-amber-600' : color === 'brand' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-500'}`}><Icon size={19} /></div>
            <div className="min-w-0">
              <div className="text-lg font-extrabold text-slate-900 truncate">{color === 'brand' || color === 'emerald' ? money(value, currency) : value}</div>
              <div className="text-[11px] text-slate-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-5">
        <div className="p-4 flex gap-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input !pl-11" placeholder="Numéro de vente, article..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-4 pt-3 border-b border-slate-100">
          {statusTabs.map((tab) => (
            <button key={tab.key} onClick={() => { setStatus(tab.key); setPage(1) }}
              className={`px-3.5 py-2.5 text-sm font-semibold border-b-2 transition whitespace-nowrap ${status === tab.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? <PageLoader /> : !data?.items.length ? (
          <EmptyState icon={<FileText size={26} />} title="Aucune vente" description="Enregistrez votre première vente pour commencer." action={<Link to="/invoices/new" className="btn-primary"><Plus size={16} /> Nouvelle vente</Link>} />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Vente</th><th>Date</th><th>Articles</th><th>Statut</th><th>Montant</th><th>Payé</th><th className="text-right">Actions</th></tr></thead>
                <tbody>
                  {data.items.map((inv) => {
                    const paid = inv.cashReceived || inv.amountPaid
                    return (
                      <tr key={inv.id}>
                        <td>
                          <Link to={`/invoices/${inv.id}`} className="font-mono font-semibold text-brand-600 hover:underline">{inv.number}</Link>
                          <div className="text-[11px] text-slate-400 mt-0.5">{company?.name}</div>
                        </td>
                        <td className="text-slate-500 text-xs">{dateFR(inv.issueDate)}</td>
                        <td className="text-slate-600 text-xs max-w-[220px] truncate">{inv.items?.map((i) => i.productName).join(', ') ?? '—'}</td>
                        <td><StatusBadge status={inv.status} /></td>
                        <td className="font-bold text-slate-800">{money(inv.total, currency)}</td>
                        <td className="text-emerald-600 font-semibold">{paid > 0 ? money(paid, currency) : '—'}</td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button className="btn-ghost !p-2 text-brand-600" title="Imprimer le ticket" onClick={() => handleAction(inv, 'print')} disabled={!!busy}>
                              {busy === `${inv.id}-print` ? <Spinner className="w-4 h-4" /> : <Printer size={16} />}
                            </button>
                            <button className="btn-ghost !p-2" title="Télécharger le PDF" onClick={() => handleAction(inv, 'pdf')} disabled={!!busy}>
                              {busy === `${inv.id}-pdf` ? <Spinner className="w-4 h-4" /> : <Download size={16} />}
                            </button>
                            {inv.status === 'DRAFT' && (
                              <button className="btn-ghost !p-2 text-amber-600" title="Marquer envoyée" onClick={() => statusMutation.mutate({ id: inv.id, status: 'SENT' })}><Send size={16} /></button>
                            )}
                            {(inv.status === 'SENT' || inv.status === 'DRAFT') && (
                              <button className="btn-ghost !p-2 text-emerald-600" title="Marquer payée" onClick={() => statusMutation.mutate({ id: inv.id, status: 'PAID' })}><CheckCircle2 size={16} /></button>
                            )}
                            {inv.status === 'PAID' && (
                              <button className="btn-ghost !p-2 text-slate-500" title="Annuler" onClick={() => statusMutation.mutate({ id: inv.id, status: 'CANCELLED' })}><XCircle size={16} /></button>
                            )}
                            <Link to={`/invoices/${inv.id}`} className="btn-ghost !p-2" title="Voir"><Eye size={16} /></Link>
                            {isAdmin && <button className="btn-ghost !p-2 hover:!text-rose-600" title="Supprimer" onClick={() => setDeleting(inv)}><Trash2 size={16} /></button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} pages={data.pages} total={data.total} onChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Supprimer cette vente ?" message={`La vente « ${deleting?.number} » sera définitivement supprimée et le stock restauré.`} loading={deleteMutation.isPending} />
    </div>
  )
}
