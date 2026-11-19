import type { ReactNode } from 'react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { TrendingUp, TrendingDown, ArrowUpRight, AlertTriangle, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DashboardData } from '@/types'
import { compactMoney, dateFR, money, statusLabels } from '@/lib/format'
import { Badge, StatusBadge } from '@/components/ui'

export function KpiCard({
  label, value, icon, tone = 'brand', change, footnote,
}: {
  label: string
  value: string
  icon: ReactNode
  tone?: 'brand' | 'emerald' | 'amber' | 'blue' | 'violet' | 'rose'
  change?: number
  footnote?: string
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tones[tone]}`}>{icon}</div>
        {change !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-full ${change >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
        <div className="text-[26px] font-extrabold text-slate-900 tracking-tight mt-1">{value}</div>
        {footnote && <div className="text-[11px] text-slate-400 mt-1.5">{footnote}</div>}
      </div>
    </div>
  )
}

const tooltipStyle = {
  contentStyle: { borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,.08)', fontSize: '12px' },
  cursor: { fill: 'rgba(44,102,82,0.05)' },
}

export function RevenueChart({ data, currency }: { data: DashboardData['monthly']; currency: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-slate-800">Évolution des ventes</h3>
          <p className="text-xs text-slate-400 mt-0.5">Chiffre d'affaires des 6 derniers mois</p>
        </div>
        <Badge color="green"><TrendingUp size={12} /> 6 mois</Badge>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3c8067" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3c8067" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f1" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => compactMoney(v, currency)} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [money(v, currency), 'CA']} />
            <Area type="monotone" dataKey="revenue" stroke="#2c6652" strokeWidth={2.5} fill="url(#revGrad)" activeDot={{ r: 5, fill: '#2c6652', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

const pieColors: Record<string, string> = {
  PAID: '#10b981', SENT: '#f59e0b', DRAFT: '#94a3b8', CANCELLED: '#f43f5e',
}

export function StatusChart({ byStatus }: { byStatus: DashboardData['byStatus'] }) {
  const data = Object.entries(byStatus).map(([name, v]) => ({ name: statusLabels[name] ?? name, value: v.count, key: name }))
  return (
    <div className="card p-5">
      <h3 className="font-bold text-slate-800">Répartition des factures</h3>
      <p className="text-xs text-slate-400 mt-0.5 mb-2">Par statut</p>
      <div className="h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} stroke="none">
              {data.map((entry) => <Cell key={entry.key} fill={pieColors[entry.key] ?? '#cbd5e1'} />)}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        {data.map((entry) => (
          <div key={entry.key} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: pieColors[entry.key] }} />
            <span className="text-slate-500 truncate">{entry.name}</span>
            <span className="ml-auto font-bold text-slate-700">{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TopProductsChart({ data, currency }: { data: DashboardData['topProducts']; currency: string }) {
  return (
    <div className="card p-5">
      <h3 className="font-bold text-slate-800">Produits les plus vendus</h3>
      <p className="text-xs text-slate-400 mt-0.5 mb-4">Top 5 par chiffre d'affaires</p>
      <div className="h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f1" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v) => compactMoney(v, currency)} />
            <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [money(v, currency), 'CA']} />
            <Bar dataKey="revenue" fill="#3c8067" radius={[0, 6, 6, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function RecentInvoices({ invoices, currency }: { invoices: DashboardData['recentInvoices']; currency: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800">Dernières factures</h3>
          <p className="text-xs text-slate-400 mt-0.5">Activité récente</p>
        </div>
        <Link to="/invoices" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
          Tout voir <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {invoices.map((inv) => (
          <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/70 transition">
            <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">
              {inv.number.slice(-2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800 truncate">{inv.items?.map((i) => i.productName).slice(0, 2).join(', ') || 'Vente'}{inv.items && inv.items.length > 2 ? '…' : ''}</div>
              <div className="text-[11px] text-slate-400">{inv.number} · {dateFR(inv.issueDate)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">{money(inv.total, currency)}</div>
              <StatusBadge status={inv.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AlertsPanel({ data }: { data: DashboardData }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle size={17} className="text-amber-500" /> Alertes stock
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{data.kpis.lowStockCount} produit(s) en stock faible</p>
        </div>
        <Link to="/products?lowStock=true" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
          Voir <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {data.lowStock.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <Package size={28} className="text-emerald-400" /> Tous les stocks sont normaux
          </div>
        )}
        {data.lowStock.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/70 transition">
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Package size={17} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-800 truncate">{p.name}</div>
              <div className="text-[11px] text-slate-400">{p.sku} · seuil {p.alertThreshold}</div>
            </div>
            <Badge color="red">{p.quantity} en stock</Badge>
          </Link>
        ))}
      </div>
    </div>
  )
}
