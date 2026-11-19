import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Package, SlidersHorizontal, Pencil, Trash2, AlertTriangle,
  Boxes, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { money } from '@/lib/format'
import type { Product } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { Badge, ConfirmDialog, EmptyState, Modal, PageHeader, PageLoader, Pagination } from '@/components/ui'
import ProductForm from '@/components/forms/ProductForm'

export default function ProductsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')
  const [category, setCategory] = useState(params.get('category') ?? '')
  const [lowStock, setLowStock] = useState(params.get('lowStock') === 'true')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get, staleTime: Infinity })
  const currency = company?.currency ?? 'FCFA'

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, category, lowStock, page],
    queryFn: () => api.products.list({ search, category, lowStock: lowStock || undefined, page, limit: 12 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.products.remove(id),
    onSuccess: () => {
      toast.success('Produit désactivé')
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleting(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const applyFilters = () => {
    setPage(1)
    const next: Record<string, string> = {}
    if (search) next.search = search
    if (category) next.category = category
    if (lowStock) next.lowStock = 'true'
    setParams(next)
  }

  const resetFilters = () => {
    setSearch(''); setCategory(''); setLowStock(false); setPage(1); setParams({})
  }

  return (
    <div className="animate-in">
      <PageHeader
        title="Produits & Stock"
        subtitle="Gérez votre catalogue et suivez vos niveaux de stock."
        actions={
          <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus size={17} /> Nouveau produit
          </button>
        }
      />

      <div className="card mb-5">
        <div className="p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input !pl-11"
              placeholder="Rechercher un produit, une référence..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
          <select className="input lg:w-52" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}>
            <option value="">Toutes les catégories</option>
            {data?.categories?.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className={`btn ${lowStock ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setLowStock(!lowStock); setPage(1) }}>
            <AlertTriangle size={16} /> Stock faible
          </button>
          <button className="btn-secondary" onClick={applyFilters}><SlidersHorizontal size={16} /> Filtrer</button>
          {(search || category || lowStock) && (
            <button className="btn-ghost !px-3" onClick={resetFilters} title="Réinitialiser"><X size={17} /></button>
          )}
        </div>

        {isLoading ? <PageLoader /> : !data?.items.length ? (
          <EmptyState
            icon={<Boxes size={26} />}
            title="Aucun produit trouvé"
            description="Ajustez vos filtres ou ajoutez votre premier produit au catalogue."
            action={<button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Ajouter un produit</button>}
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Catégorie</th>
                    <th>Prix achat</th>
                    <th>Prix vente</th>
                    <th>Stock</th>
                    <th>Statut</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((p) => {
                    const isLow = p.quantity <= p.alertThreshold
                    return (
                      <tr key={p.id}>
                        <td>
                          <Link to={`/products/${p.id}`} className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                              <Package size={18} />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 group-hover:text-brand-600">{p.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono">{p.sku}</div>
                            </div>
                          </Link>
                        </td>
                        <td>{p.category ? <Badge color="slate">{p.category}</Badge> : <span className="text-slate-300">—</span>}</td>
                        <td className="text-slate-500">{money(p.purchasePrice, currency)}</td>
                        <td className="font-bold text-slate-800">{money(p.sellingPrice, currency)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-700'}`}>{p.quantity}</span>
                            <span className="text-[11px] text-slate-400">{p.unit}</span>
                            {isLow && <AlertTriangle size={14} className="text-rose-500" />}
                          </div>
                        </td>
                        <td>
                          <Badge color={p.isActive ? 'green' : 'slate'}>{p.isActive ? 'Actif' : 'Inactif'}</Badge>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button className="btn-ghost !p-2" onClick={() => { setEditing(p); setShowForm(true) }} title="Modifier"><Pencil size={16} /></button>
                            {isAdmin && (
                              <button className="btn-ghost !p-2 hover:!text-rose-600" onClick={() => setDeleting(p)} title="Désactiver"><Trash2 size={16} /></button>
                            )}
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

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Modifier le produit' : 'Nouveau produit'}
        description={editing ? `Référence ${editing.sku}` : 'Ajoutez un article à votre catalogue.'}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>Annuler</button>
            <button type="submit" form="product-form" className="btn-primary">
              {editing ? 'Enregistrer' : 'Créer le produit'}
            </button>
          </>
        }
      >
        <ProductForm
          key={editing?.id ?? 'new'}
          product={editing}
          categories={data?.categories ?? []}
          currency={currency}
          onSuccess={() => {
            setShowForm(false)
            queryClient.invalidateQueries({ queryKey: ['products'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard'] })
            queryClient.invalidateQueries({ queryKey: ['product-options'] })
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        title="Désactiver ce produit ?"
        message={`« ${deleting?.name} » sera masqué du catalogue. L'historique des factures reste intact.`}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
