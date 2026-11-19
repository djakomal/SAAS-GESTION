import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sparkles, TrendingUp, AlertTriangle, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { money } from '@/lib/format'
import type { Product, ProductInput } from '@/types'
import { Spinner } from '@/components/ui'

const empty: ProductInput = {
  name: '', sku: '', description: '', category: '', unit: 'pièce',
  purchasePrice: 0, sellingPrice: 0, quantity: 0, alertThreshold: 5, isActive: true,
}

const commonUnits = ['pièce', 'sac', 'kg', 'boîte', 'bouteille', 'L']

export default function ProductForm({
  product,
  onSuccess,
  formId = 'product-form',
  categories = [],
  currency = 'FCFA',
}: {
  product: Product | null
  onSuccess: () => void
  formId?: string
  categories?: string[]
  currency?: string
}) {
  const [form, setForm] = useState<ProductInput>(() => product ? {
    name: product.name, sku: product.sku, description: product.description ?? '', category: product.category ?? '',
    unit: product.unit, purchasePrice: product.purchasePrice, sellingPrice: product.sellingPrice,
    quantity: product.quantity, alertThreshold: product.alertThreshold, isActive: product.isActive,
  } : empty)
  const [newCategory, setNewCategory] = useState(false)

  const mutation = useMutation({
    mutationFn: (data: ProductInput) => product ? api.products.update(product.id, data) : api.products.create(data),
    onSuccess: () => { toast.success(product ? 'Produit mis à jour' : 'Produit créé'); onSuccess() },
    onError: (e) => toast.error(e.message),
  })

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const num = (key: keyof ProductInput) => (e: React.ChangeEvent<HTMLInputElement>) => set(key, Number(e.target.value) as never)

  const generateSku = () => {
    const words = form.name.trim().split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w))
    let base: string
    if (words.length >= 2) {
      base = words.slice(0, 3).map((w) => w.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase()).join('-')
    } else {
      base = (words[0] ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()
    }
    if (!base) return toast.error('Saisissez d\'abord le nom du produit')
    set('sku', base)
  }

  const margin = form.sellingPrice - form.purchasePrice
  const marginPct = form.sellingPrice > 0 ? (margin / form.sellingPrice) * 100 : 0
  const lowStock = form.quantity <= form.alertThreshold
  const categoryOptions = [...new Set([...(categories ?? []), form.category].filter((c): c is string => !!c))].sort()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (form.name.trim().length < 2) return toast.error('Le nom doit contenir au moins 2 caractères')
    if (!form.sku.trim()) return toast.error('La référence (SKU) est requise')
    if (form.sellingPrice < form.purchasePrice) return toast.error('Le prix de vente ne peut pas être inférieur au prix d\'achat')
    mutation.mutate({ ...form, category: form.category || null })
  }

  return (
    <form id={formId} onSubmit={submit} className="space-y-5">
      {/* Identification */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] flex items-center justify-center">1</span>
          Identification
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Nom du produit <span className="text-rose-500">*</span></label>
            <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="ex. Riz parfumé 5 kg" required autoFocus />
          </div>
          <div>
            <label className="label">Référence / SKU <span className="text-rose-500">*</span></label>
            <div className="flex gap-2">
              <input className="input font-mono uppercase" value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} placeholder="RIZ-005" required />
              <button type="button" onClick={generateSku} className="btn-secondary !px-3 shrink-0" title="Générer à partir du nom">
                <Sparkles size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="label">Catégorie</label>
            {newCategory ? (
              <div className="flex gap-2">
                <input className="input" autoFocus value={form.category ?? ''} onChange={(e) => set('category', e.target.value)} placeholder="Nouvelle catégorie" />
                <button type="button" className="btn-secondary !px-3" onClick={() => setNewCategory(false)} title="Choisir une catégorie existante">↩</button>
              </div>
            ) : (
              <select
                className="input"
                value={form.category ?? ''}
                onChange={(e) => {
                  if (e.target.value === '__new__') { setNewCategory(true); set('category', '') }
                  else set('category', e.target.value)
                }}
              >
                <option value="">— Aucune —</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__new__">+ Nouvelle catégorie</option>
              </select>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Unité de vente</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {commonUnits.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => set('unit', u)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${form.unit === u ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300 hover:text-brand-600'}`}
                >
                  {u}
                </button>
              ))}
            </div>
            <input className="input" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="pièce, sac, kg..." />
          </div>
        </div>
      </section>

      {/* Prix */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] flex items-center justify-center">2</span>
          Prix & marge
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Prix d'achat ({currency})</label>
            <input type="number" min="0" step="0.01" className="input" value={form.purchasePrice} onChange={num('purchasePrice')} />
          </div>
          <div>
            <label className="label">Prix de vente ({currency}) <span className="text-rose-500">*</span></label>
            <input type="number" min="0" step="0.01" className="input" value={form.sellingPrice} onChange={num('sellingPrice')} />
          </div>
          <div className="sm:col-span-2">
            <div className={`flex items-center justify-between rounded-lg px-4 py-3 ${margin < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <span className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp size={17} /> Marge unitaire
              </span>
              <span className="text-right">
                <span className="text-lg font-extrabold">{money(margin, currency)}</span>
                <span className="text-xs ml-2 opacity-80">({marginPct.toFixed(1)} %)</span>
              </span>
            </div>
            {margin < 0 && <p className="text-xs text-rose-600 mt-1.5 flex items-center gap-1"><AlertTriangle size={13} /> Le prix de vente est inférieur au prix d'achat.</p>}
          </div>
        </div>
      </section>

      {/* Stock */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-[10px] flex items-center justify-center">3</span>
          Stock
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Quantité en stock</label>
            <input type="number" min="0" className="input" value={form.quantity} onChange={num('quantity')} />
          </div>
          <div>
            <label className="label">Seuil d'alerte</label>
            <input type="number" min="0" className="input" value={form.alertThreshold} onChange={num('alertThreshold')} />
          </div>
          <div className="sm:col-span-2 flex items-start gap-2 text-xs text-slate-500">
            <Info size={15} className="shrink-0 mt-0.5 text-slate-400" />
            {lowStock ? (
              <span className="text-amber-600">Ce produit sera signalé comme <strong>stock faible</strong> avec la quantité actuelle.</span>
            ) : (
              <span>Une notification sera envoyée lorsque le stock atteindra {form.alertThreshold} {form.unit}(s).</span>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description (optionnel)</label>
            <textarea className="input resize-none" rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} placeholder="Détails du produit..." />
          </div>
          {product && (
            <label className="flex items-center gap-2.5 cursor-pointer sm:col-span-2">
              <input type="checkbox" className="w-4 h-4 accent-brand-600" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
              <span className="text-sm text-slate-600">Produit actif (visible dans le catalogue)</span>
            </label>
          )}
        </div>
      </section>

      {mutation.isPending && <div className="flex items-center gap-2 text-sm text-slate-500"><Spinner className="w-4 h-4" /> Enregistrement...</div>}
    </form>
  )
}
