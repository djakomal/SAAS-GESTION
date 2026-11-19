import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell, AlertTriangle, Receipt, ClipboardList, CheckCheck, Trash2,
  Mail, Clock, Inbox, Settings,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { dateFR, timeAgo } from '@/lib/format'
import type { NotificationType } from '@/types'
import { Badge, EmptyState, PageHeader, PageLoader } from '@/components/ui'

const typeMeta: Record<NotificationType, { label: string; icon: typeof Bell; color: string; badge: string }> = {
  LOW_STOCK: { label: 'Stock faible', icon: AlertTriangle, color: 'bg-amber-50 text-amber-600', badge: 'amber' },
  NEW_SALE: { label: 'Nouvelle vente', icon: Receipt, color: 'bg-emerald-50 text-emerald-600', badge: 'green' },
  DAILY_REPORT: { label: 'Rapport quotidien', icon: ClipboardList, color: 'bg-brand-50 text-brand-600', badge: 'brand' },
  SYSTEM: { label: 'Système', icon: Bell, color: 'bg-slate-100 text-slate-500', badge: 'slate' },
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(100),
    refetchInterval: 60_000,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] })
  const markRead = useMutation({ mutationFn: (id: string) => api.notifications.markRead(id), onSuccess: invalidate })
  const markAll = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => { invalidate(); toast.success('Notifications marquées comme lues') },
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.notifications.remove(id),
    onSuccess: () => { invalidate(); toast.success('Notification supprimée') },
  })
  const report = useMutation({
    mutationFn: () => api.notifications.generateDailyReport(),
    onSuccess: () => { invalidate(); toast.success('Rapport quotidien généré') },
    onError: (e) => toast.error(e.message),
  })

  const items = (data?.items ?? []).filter((n) => filter === 'all' || !n.isRead)

  const target = (reference: string | null, type: NotificationType) => {
    if (!reference) return '/notifications'
    if (type === 'LOW_STOCK') return `/products/${reference}`
    if (type === 'NEW_SALE') return `/invoices/${reference}`
    return '/notifications'
  }

  return (
    <div className="animate-in">
      <PageHeader
        title="Notifications"
        subtitle="Alertes stock, nouvelles ventes et rapports quotidiens."
        actions={
          (data?.unread ?? 0) > 0 ? (
            <button className="btn-secondary" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <CheckCheck size={17} /> Tout marquer comme lu
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex gap-1 px-4 pt-3 border-b border-slate-100">
            {[
              { key: 'all' as const, label: `Toutes (${data?.items.length ?? 0})` },
              { key: 'unread' as const, label: `Non lues (${data?.unread ?? 0})` },
            ].map((tab) => (
              <button key={tab.key} onClick={() => setFilter(tab.key)}
                className={`px-3.5 py-2.5 text-sm font-semibold border-b-2 transition ${filter === tab.key ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {isLoading ? <PageLoader /> : items.length === 0 ? (
            <EmptyState icon={<Inbox size={26} />} title="Aucune notification" description="Les alertes apparaîtront ici automatiquement." />
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((n) => {
                const meta = typeMeta[n.type] ?? typeMeta.SYSTEM
                const Icon = meta.icon
                return (
                  <div key={n.id} className={`flex gap-4 px-5 py-4 ${!n.isRead ? 'bg-brand-50/30' : ''}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}><Icon size={19} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge color={meta.badge}>{meta.label}</Badge>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-500" />}
                      </div>
                      <Link to={target(n.reference, n.type)} onClick={() => !n.isRead && markRead.mutate(n.id)} className="block font-semibold text-slate-800 hover:text-brand-600 mt-2">{n.title}</Link>
                      <p className="text-sm text-slate-500 mt-1">{n.body}</p>
                      <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5"><Clock size={12} /> {dateFR(n.createdAt, true)} · {timeAgo(n.createdAt)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {!n.isRead && <button className="btn-ghost !p-2" title="Marquer comme lue" onClick={() => markRead.mutate(n.id)}><CheckCheck size={16} /></button>}
                      {isAdmin && <button className="btn-ghost !p-2 hover:!text-rose-600" title="Supprimer" onClick={() => remove.mutate(n.id)}><Trash2 size={16} /></button>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="space-y-5">
            <div className="card p-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Mail size={17} className="text-brand-600" /> Notifications par email</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Les alertes sont également envoyées par email aux administrateurs et à l'adresse définie dans les paramètres.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-slate-50 text-xs text-slate-500 space-y-1.5">
                <div className="flex justify-between"><span>Stock faible</span><span className="font-semibold text-slate-700">✅ Activé</span></div>
                <div className="flex justify-between"><span>Nouvelle vente</span><span className="font-semibold text-slate-700">✅ Activé</span></div>
                <div className="flex justify-between"><span>Rapport quotidien</span><span className="font-semibold text-slate-700">20:00</span></div>
              </div>
              <Link to="/settings" className="btn-secondary w-full mt-4"><Settings size={16} /> Configurer l'email</Link>
              <button className="btn-ghost w-full mt-2" onClick={() => report.mutate()} disabled={report.isPending}>
                <ClipboardList size={16} /> Générer le rapport maintenant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
