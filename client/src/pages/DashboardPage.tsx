import { useQuery } from '@tanstack/react-query'
import {
  Wallet, CheckCircle2, Clock3, Package, FileText, AlertTriangle, TrendingUp, ShoppingCart,
} from 'lucide-react'
import { api } from '@/lib/api'
import { compactMoney, money } from '@/lib/format'
import { PageHeader, PageLoader } from '@/components/ui'
import {
  KpiCard, RevenueChart, StatusChart, TopProductsChart, RecentInvoices, AlertsPanel,
} from '@/components/dashboard/DashboardWidgets'
import { useAuth } from '@/context/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: company } = useQuery({ queryKey: ['company'], queryFn: api.company.get, staleTime: Infinity })
  const currency = company?.currency ?? 'FCFA'
  const { data, isLoading, isError } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard.get })

  if (isLoading) return <PageLoader />
  if (isError || !data) return <div className="card p-8 text-center text-rose-600">Impossible de charger le tableau de bord.</div>

  const { kpis } = data
  const monthDelta = kpis.monthInvoicesCount
    ? ((kpis.monthRevenue / kpis.monthInvoicesCount - kpis.averageInvoice) / (kpis.averageInvoice || 1)) * 100
    : 0

  return (
    <div className="animate-in">
      <PageHeader
        title={`Bonjour, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Voici ce qui se passe dans votre boutique aujourd'hui."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Chiffre d'affaires total"
          value={compactMoney(kpis.revenue, currency)}
          icon={<Wallet size={21} />}
          tone="brand"
          footnote={`${money(kpis.revenue, currency)} cumulés`}
        />
        <KpiCard
          label="Ce mois-ci"
          value={compactMoney(kpis.monthRevenue, currency)}
          icon={<TrendingUp size={21} />}
          tone="emerald"
          change={monthDelta}
          footnote={`${kpis.monthInvoicesCount} facture(s) émise(s)`}
        />
        <KpiCard
          label="Encaissé"
          value={compactMoney(kpis.paid, currency)}
          icon={<CheckCircle2 size={21} />}
          tone="blue"
          footnote={`${money(kpis.outstanding, currency)} en attente`}
        />
        <KpiCard
          label="Impayés"
          value={compactMoney(kpis.outstanding, currency)}
          icon={<Clock3 size={21} />}
          tone="amber"
          footnote="Solde des factures non réglées"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Ventes', value: kpis.invoicesCount, icon: FileText, color: 'text-brand-600 bg-brand-50', to: '/invoices' },
          { label: 'Panier moyen', value: money(kpis.averageInvoice, currency), icon: ShoppingCart, color: 'text-violet-600 bg-violet-50', to: '/invoices' },
          { label: 'Produits actifs', value: kpis.productsCount, icon: Package, color: 'text-blue-600 bg-blue-50', to: '/products' },
          { label: 'Stock faible', value: kpis.lowStockCount, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50', to: '/products?lowStock=true' },
        ].map(({ label, value, icon: Icon, color, to }) => (
          <a key={label} href={to} className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon size={19} /></div>
            <div>
              <div className="text-xl font-extrabold text-slate-900">{value}</div>
              <div className="text-[11px] text-slate-400 font-medium">{label}</div>
            </div>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <div className="xl:col-span-2"><RevenueChart data={data.monthly} currency={currency} /></div>
        <StatusChart byStatus={data.byStatus} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <div className="xl:col-span-2"><TopProductsChart data={data.topProducts} currency={currency} /></div>
        <AlertsPanel data={data} />
      </div>

      <RecentInvoices invoices={data.recentInvoices} currency={currency} />
    </div>
  )
}
