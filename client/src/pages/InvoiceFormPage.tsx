import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, FileText, Store, Banknote } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { money } from '@/lib/format'
import type { InvoiceInput, InvoiceStatus } from '@/types'
import { PageLoader, Spinner } from '@/components/ui'

interface Row {
  key: string
  productId: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  taxRate: number
}

const newRow = (): Row => ({ key: Math.random().toString(36).slice(2), productId: '', productName: '', sku: '', quantity: 1, unitPrice: 0, taxRate: 0 })

export default function InvoiceFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get, staleTime: Infinity })
  const currency = company?.currency ?? 'FCFA'
  const { data: productsData } = useQuery({ queryKey: ['product-options'], queryFn: () => api.products.list({ limit: 100 }) })
  const products = productsData?.items ?? []
  const { data: existing, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => api.invoices.get(id!),
    enabled: isEdit,
  })

  const [status, setStatus] = useState<InvoiceStatus>('PAID')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [discount, setDiscount] = useState(0)
  const [taxRate, setTaxRate] = useState(0)
  const [notes, setNotes] = useState('')
  const [cashReceived, setCashReceived] = useState(0)
  const [rows, setRows] = useState<Row[]>([newRow()])

  useEffect(() => {
    if (existing) {
      setStatus(existing.status)
      setIssueDate(existing.issueDate.slice(0, 10))
      setDiscount(existing.discount)
      setTaxRate(existing.taxRate)
      setNotes(existing.notes ?? '')
      setCashReceived(existing.cashReceived ?? existing.amountPaid ?? 0)
      setRows(existing.items.map((i) => ({
        key: i.id, productId: i.productId ?? '', productName: i.productName, sku: i.sku ?? '',
        quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate,
      })))
    }
  }, [existing])

  const totals = useMemo(() => {
    const subtotal = rows.reduce((s, r) => s + r.quantity * r.unitPrice, 0)
    const taxable = Math.max(0, subtotal - discount)
    const taxAmount = (taxable * taxRate) / 100
    return { subtotal, taxable, taxAmount, total: taxable + taxAmount }
  }, [rows, discount, taxRate])
  const change = Math.max(0, cashReceived - totals.total)

  const mutation = useMutation({
    mutationFn: (data: InvoiceInput) => isEdit ? api.invoices.update(id!, data) : api.invoices.create(data),
    onSuccess: (invoice) => {
      toast.success(isEdit ? 'Vente mise à jour' : 'Vente enregistrée')
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      navigate(`/invoices/${invoice.id}`)
    },
    onError: (e) => toast.error(e.message),
  })

  const updateRow = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => r.key === key ? { ...r, ...patch } : r))

  const selectProduct = (key: string, productId: string) => {
    const p = products.find((x) => x.id === productId)
    if (!p) return updateRow(key, { productId: '', productName: '', sku: '', unitPrice: 0 })
    updateRow(key, { productId: p.id, productName: p.name, sku: p.sku, unitPrice: p.sellingPrice, taxRate })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (rows.some((r) => !r.productName.trim())) return toast.error('Chaque ligne doit avoir un produit')
    if (rows.some((r) => r.quantity <= 0)) return toast.error('Les quantités doivent être positives')
    mutation.mutate({
      status,
      issueDate: new Date(issueDate).toISOString(),
      dueDate: null,
      discount, taxRate, notes,
      amountPaid: status === 'PAID' ? totals.total : existing?.amountPaid ?? 0,
      cashReceived: status === 'PAID' ? (cashReceived || totals.total) : cashReceived,
      items: rows.map((r) => ({
        productId: r.productId || null,
        productName: r.productName,
        sku: r.sku || null,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        taxRate: r.taxRate,
      })),
    })
  }

  if (isEdit && loadingInvoice) return <PageLoader />

  return (
    <div className="animate-in max-w-5xl mx-auto">
      <button onClick={() => navigate('/invoices')} className="btn-ghost !px-0 mb-4"><ArrowLeft size={17} /> Retour aux ventes</button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? `Modifier ${existing?.number ?? ''}` : 'Nouvelle vente'}</h1>
        <p className="text-sm text-slate-500 mt-1">{isEdit ? 'Modifiez les détails de la vente.' : 'Enregistrez une vente directe — aucun client à renseigner.'}</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="card p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><Store size={18} className="text-brand-600" /> {company?.name ?? 'Boutique'}</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Statut</label>
              <select className="input !w-auto !py-2" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
                <option value="PAID">Payée (vente directe)</option>
                <option value="SENT">Envoyée</option>
                <option value="DRAFT">Brouillon</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date de vente</label>
              <input type="date" className="input" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Notes (optionnel)</label>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Précision sur la vente..." />
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={17} className="text-brand-600" /> Articles achetés</h2>
            <button type="button" className="btn-secondary !py-2" onClick={() => setRows((rs) => [...rs, newRow()])}><Plus size={16} /> Ajouter un article</button>
          </div>
          <div className="table-wrap">
            <table className="table !min-w-[760px]">
              <thead><tr><th className="w-[38%]">Produit</th><th>Qté</th><th>Prix unitaire</th><th>TVA %</th><th className="text-right">Total</th><th></th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td>
                      <select className="input !py-2" value={r.productId} onChange={(e) => selectProduct(r.key, e.target.value)}>
                        <option value="">— Produit libre —</option>
                        {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({money(p.sellingPrice, currency)})</option>)}
                      </select>
                      <input className="input !py-1.5 !mt-1.5 !text-xs" value={r.productName} onChange={(e) => updateRow(r.key, { productName: e.target.value })} placeholder=" ou saisissez un nom libre" />
                    </td>
                    <td><input type="number" min="1" className="input !py-2 w-20" value={r.quantity} onChange={(e) => updateRow(r.key, { quantity: Number(e.target.value) })} /></td>
                    <td><input type="number" min="0" step="0.01" className="input !py-2 w-32" value={r.unitPrice} onChange={(e) => updateRow(r.key, { unitPrice: Number(e.target.value) })} /></td>
                    <td><input type="number" min="0" max="100" className="input !py-2 w-20" value={r.taxRate} onChange={(e) => updateRow(r.key, { taxRate: Number(e.target.value) })} /></td>
                    <td className="text-right font-bold text-slate-800">{money(r.quantity * r.unitPrice, currency)}</td>
                    <td><button type="button" className="btn-ghost !p-2 hover:!text-rose-600" disabled={rows.length === 1} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-4 content-start">
              <div>
                <label className="label">Remise ({currency})</label>
                <input type="number" min="0" className="input" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">TVA globale (%)</label>
                <input type="number" min="0" max="100" className="input" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
              </div>
              <div className="col-span-2">
                <label className="label flex items-center gap-2"><Banknote size={14} /> Montant remis par le client</label>
                <div className="flex gap-2">
                  <input type="number" min="0" className="input" value={cashReceived} onChange={(e) => setCashReceived(Number(e.target.value))} placeholder="Espèces reçues" />
                  <button type="button" className="btn-secondary !px-3 whitespace-nowrap" onClick={() => setCashReceived(Math.round(totals.total))}>Exact</button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-500"><span>Sous-total</span><span>{money(totals.subtotal, currency)}</span></div>
              {discount > 0 && <div className="flex justify-between text-slate-500"><span>Remise</span><span>- {money(discount, currency)}</span></div>}
              {taxRate > 0 && <div className="flex justify-between text-slate-500"><span>TVA ({taxRate}%)</span><span>{money(totals.taxAmount, currency)}</span></div>}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700">Total à payer</span>
                <span className="text-xl font-extrabold text-brand-600">{money(totals.total, currency)}</span>
              </div>
              {status === 'PAID' && cashReceived > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-slate-300">
                  <span className="font-semibold text-slate-600">Monnaie rendue</span>
                  <span className={`text-lg font-extrabold ${change > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>{money(change, currency)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 sticky bottom-4">
          <Link to="/invoices" className="btn-secondary">Annuler</Link>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? <Spinner className="w-5 h-5" /> : <Save size={17} />}
            {isEdit ? 'Enregistrer' : 'Enregistrer la vente'}
          </button>
        </div>
      </form>
    </div>
  )
}
