import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Download, Pencil, CheckCircle2, Send, XCircle, FileText,
  Calendar, User, Receipt, RotateCcw, Printer, Banknote, Store,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api, downloadInvoicePdf, printReceipt } from '@/lib/api'
import { dateFR, money, statusLabels } from '@/lib/format'
import type { InvoiceStatus } from '@/types'
import { PageLoader, Spinner, StatusBadge } from '@/components/ui'

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [busy, setBusy] = useState<string | null>(null)

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get, staleTime: Infinity })
  const currency = company?.currency ?? 'FCFA'
  const { data: invoice, isLoading } = useQuery({ queryKey: ['invoice', id], queryFn: () => api.invoices.get(id!) })

  const statusMutation = useMutation({
    mutationFn: (status: InvoiceStatus) => api.invoices.changeStatus(id!, status),
    onSuccess: (_d, status) => {
      toast.success(`Vente ${statusLabels[status]?.toLowerCase() ?? status}`)
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const handleAction = async (action: 'pdf' | 'print') => {
    if (!invoice) return
    setBusy(action)
    try {
      if (action === 'pdf') { await downloadInvoicePdf(invoice.id, invoice.number); toast.success('PDF téléchargé') }
      else { await printReceipt(invoice.id); toast.success('Ticket envoyé à l\'imprimante') }
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Échec') }
    finally { setBusy(null) }
  }

  if (isLoading) return <PageLoader />
  if (!invoice) return <div className="card p-8 text-center">Vente introuvable.</div>

  const paid = invoice.cashReceived || invoice.amountPaid
  const change = Math.max(0, paid - invoice.total)

  return (
    <div className="animate-in max-w-5xl mx-auto">
      <button onClick={() => navigate('/invoices')} className="btn-ghost !px-0 mb-4"><ArrowLeft size={17} /> Retour aux ventes</button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><Receipt size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{invoice.number}</h1>
            <div className="flex items-center gap-2 mt-1"><StatusBadge status={invoice.status} /><span className="text-sm text-slate-500">Vendue le {dateFR(invoice.issueDate)}</span></div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => handleAction('print')} disabled={!!busy}>
            {busy === 'print' ? <Spinner className="w-4 h-4" /> : <Printer size={16} />} Imprimer le ticket
          </button>
          <button className="btn-secondary" onClick={() => handleAction('pdf')} disabled={!!busy}>
            {busy === 'pdf' ? <Spinner className="w-4 h-4" /> : <Download size={16} />} PDF
          </button>
          {invoice.status === 'DRAFT' && <button className="btn-secondary" onClick={() => statusMutation.mutate('SENT')} disabled={statusMutation.isPending}><Send size={16} /> Envoyer</button>}
          {(invoice.status === 'DRAFT' || invoice.status === 'SENT') && <button className="btn-primary" onClick={() => statusMutation.mutate('PAID')} disabled={statusMutation.isPending}><CheckCircle2 size={16} /> Marquer payée</button>}
          {invoice.status === 'PAID' && <button className="btn-secondary" onClick={() => statusMutation.mutate('SENT')} disabled={statusMutation.isPending}><RotateCcw size={16} /> Revenir envoyée</button>}
          {invoice.status !== 'CANCELLED' && <button className="btn-ghost !text-slate-500" onClick={() => statusMutation.mutate('CANCELLED')} disabled={statusMutation.isPending}><XCircle size={16} /> Annuler</button>}
          <Link to={`/invoices/${invoice.id}/edit`} className="btn-secondary"><Pencil size={16} /> Modifier</Link>
        </div>
      </div>

      <div className="card overflow-hidden mb-5">
        {/* En-tête : boutique + paiement */}
        <div className="p-6 sm:p-8 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2 flex items-center gap-1.5"><Store size={13} /> Vendu par</div>
            <div className="font-bold text-lg text-slate-800">{company?.name ?? 'Boutique'}</div>
            <div className="text-sm text-slate-500 mt-1 space-y-0.5">
              {company?.address && <div>{company.address}</div>}
              {company?.city && <div>{company.city}</div>}
              {company?.phone && <div>Tél : {company.phone}</div>}
              {company?.taxId && <div>{company.taxId}</div>}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Détails de la vente</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex sm:justify-end gap-2"><span className="text-slate-400">Numéro :</span><span className="font-semibold font-mono">{invoice.number}</span></div>
              <div className="flex sm:justify-end gap-2"><Calendar size={14} className="text-slate-400" /><span className="text-slate-400">Date :</span><span className="font-semibold">{dateFR(invoice.issueDate)}</span></div>
              <div className="flex sm:justify-end gap-2"><User size={14} className="text-slate-400" /><span className="text-slate-400">Caissier :</span><span className="font-semibold">{invoice.user?.name ?? '—'}</span></div>
            </div>
          </div>
        </div>

        {/* Lignes */}
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Désignation</th><th>Qté</th><th>P.U.</th><th>TVA</th><th className="text-right">Montant</th></tr></thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td><div className="font-semibold text-slate-800">{item.productName}</div>{item.sku && <div className="font-mono text-[11px] text-slate-400">{item.sku}</div>}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unitPrice, currency)}</td>
                  <td>{item.taxRate}%</td>
                  <td className="text-right font-bold">{money(item.lineTotal, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux + paiement */}
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 sm:justify-end border-t border-slate-100">
          <div className="w-full sm:w-80 space-y-2.5">
            <div className="flex justify-between text-sm text-slate-500"><span>Sous-total</span><span>{money(invoice.subtotal, currency)}</span></div>
            {invoice.discount > 0 && <div className="flex justify-between text-sm text-slate-500"><span>Remise</span><span>- {money(invoice.discount, currency)}</span></div>}
            {invoice.taxRate > 0 && <div className="flex justify-between text-sm text-slate-500"><span>TVA ({invoice.taxRate}%)</span><span>{money(invoice.taxAmount, currency)}</span></div>}
            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="font-bold text-slate-700">Total TTC</span>
              <span className="text-2xl font-extrabold text-brand-600">{money(invoice.total, currency)}</span>
            </div>
            {paid > 0 && (
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                <div className="flex justify-between items-center text-emerald-800"><span className="flex items-center gap-2 text-sm font-semibold"><Banknote size={16} /> Montant payé</span><span className="text-lg font-extrabold">{money(paid, currency)}</span></div>
                {change > 0 && <div className="flex justify-between items-center text-emerald-700 text-sm border-t border-emerald-200 pt-2"><span>Monnaie rendue</span><span className="font-bold">{money(change, currency)}</span></div>}
              </div>
            )}
          </div>
        </div>

        {invoice.notes && <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 text-sm text-slate-600"><span className="font-semibold">Note :</span> {invoice.notes}</div>}
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
        <FileText size={15} /> Ticket généré par StockFlow · {company?.name}
      </div>
    </div>
  )
}
