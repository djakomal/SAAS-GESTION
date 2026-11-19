import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Package, Pencil, TrendingDown, TrendingUp, AlertTriangle, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { dateFR, money } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import { Badge, PageLoader, Spinner } from '@/components/ui'
import { movementLabels } from '@/lib/format'
import ProductForm from '@/components/forms/ProductForm'
import { Modal } from '@/components/ui'

interface Movement { id: string; quantity: number; type: string; reference: string | null; createdAt: string }

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [stockQty, setStockQty] = useState('')
  const [reason, setReason] = useState('')

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get, staleTime: Infinity })
  const currency = company?.currency ?? 'FCFA'
  const { data: product, isLoading } = useQuery({ queryKey: ['product', id], queryFn: () => api.products.get(id!) })
  const movements = (product?.movements ?? []) as Movement[]

  const stockMutation = useMutation({
    mutationFn: () => api.products.setStock(id!, Number(stockQty), reason),
    onSuccess: () => {
      toast.success('Stock ajusté')
      qc.invalidateQueries({ queryKey: ['product', id] })
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setStockQty(''); setReason('')
    },
    onError: (e) => toast.error(e.message),
  })

  if (isLoading) return <PageLoader />
  if (!product) return <div className="card p-8 text-center">Produit introuvable. <Link to="/products" className="text-brand-600">Retour</Link></div>

  const isLow = product.quantity <= product.alertThreshold
  const margin = product.sellingPrice - product.purchasePrice

  return (
    <div className="animate-in">
      <button onClick={() => navigate('/products')} className="btn-ghost !px-0 mb-4"><ArrowLeft size={17} /> Retour aux produits</button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center"><Package size={28} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-slate-500">{product.sku}</span>
              {product.category && <Badge color="brand">{product.category}</Badge>}
              <Badge color={product.isActive ? 'green' : 'slate'}>{product.isActive ? 'Actif' : 'Inactif'}</Badge>
            </div>
          </div>
        </div>
        <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil size={16} /> Modifier</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Stock disponible', value: `${product.quantity} ${product.unit}`, tone: isLow ? 'text-rose-600' : 'text-slate-900', icon: Package },
            { label: "Prix de vente", value: money(product.sellingPrice, currency), tone: 'text-brand-600', icon: TrendingUp },
            { label: 'Marge unitaire', value: money(margin, currency), tone: 'text-emerald-600', icon: TrendingDown },
          ].map(({ label, value, tone, icon: Icon }) => (
            <div key={label} className="card p-5">
              <div className="w-9 h-9 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center mb-3"><Icon size={18} /></div>
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
              <div className={`text-xl font-extrabold mt-1 ${tone}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2"><Activity size={17} className="text-brand-600" /> Ajustement du stock</h3>
          <p className="text-xs text-slate-400 mb-4">Définissez une nouvelle quantité en stock.</p>
          {user?.role === 'ADMIN' ? (
            <div className="space-y-3">
              <input type="number" min="0" className="input" placeholder="Nouvelle quantité" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
              <input className="input" placeholder="Motif (optionnel)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button className="btn-primary w-full" disabled={!stockQty || stockMutation.isPending} onClick={() => stockMutation.mutate()}>
                {stockMutation.isPending ? <Spinner className="w-4 h-4" /> : 'Appliquer'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Seul un administrateur peut ajuster le stock manuellement.</p>
          )}
          {isLow && (
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 text-amber-700 p-3 text-xs">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              Stock sous le seuil d'alerte ({product.alertThreshold}). Pensez à réapprovisionner.
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Historique des mouvements</h3>
          <p className="text-xs text-slate-400 mt-0.5">{movements.length} mouvement(s) récent(s)</p>
        </div>
        {movements.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">Aucun mouvement enregistré.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Date</th><th>Type</th><th>Référence</th><th className="text-right">Quantité</th></tr></thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className="text-slate-500">{dateFR(m.createdAt, true)}</td>
                    <td><Badge color={m.quantity > 0 ? 'green' : 'amber'}>{movementLabels[m.type] ?? m.type}</Badge></td>
                    <td className="font-mono text-xs text-slate-500">{m.reference ?? '—'}</td>
                    <td className={`text-right font-bold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Modifier le produit"
        size="lg"
        footer={<button type="submit" form="product-form-edit" className="btn-primary">Enregistrer</button>}
      >
        <ProductForm
          key={product.id}
          product={product}
          formId="product-form-edit"
          categories={[]}
          currency={currency}
          onSuccess={() => {
            setEditing(false)
            qc.invalidateQueries({ queryKey: ['product', id] })
            qc.invalidateQueries({ queryKey: ['products'] })
          }}
        />
      </Modal>
    </div>
  )
}
