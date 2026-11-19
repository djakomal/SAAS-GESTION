import type { ReactNode } from 'react'
import { X, ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react'
import { statusColors, statusLabels } from '@/lib/format'

export function Spinner({ className = 'w-5 h-5' }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner className="w-8 h-8 text-brand-600" />
    </div>
  )
}

export function Badge({ children, color = 'slate', className = '' }: { children: ReactNode; color?: string; className?: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 ring-slate-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    red: 'bg-rose-50 text-rose-700 ring-rose-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  }
  return <span className={`badge ${colors[color] ?? colors.slate} ${className}`}>{children}</span>
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusColors[status] ?? statusColors.DRAFT}`}>{statusLabels[status] ?? status}</span>
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
        {icon ?? <Inbox size={26} />}
      </div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!open) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative flex flex-col w-full ${sizes[size]} max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] bg-white rounded-2xl shadow-2xl animate-in overflow-hidden`}>
        <div className="shrink-0 flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition" aria-label="Fermer">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="shrink-0 flex justify-end gap-2 px-6 py-4 bg-slate-50/80 border-t border-slate-100">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Supprimer',
  loading = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-danger" onClick={onConfirm} disabled={loading}>
            {loading && <Spinner className="w-4 h-4" />} {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  )
}

export function Pagination({ page, pages, total, onChange }: { page: number; pages: number; total: number; onChange: (p: number) => void }) {
  if (pages <= 1) {
    return <div className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100">{total} résultat{total > 1 ? 's' : ''}</div>
  }
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <span className="text-xs text-slate-500">
        {total} résultat{total > 1 ? 's' : ''} · page {page}/{pages}
      </span>
      <div className="flex items-center gap-1">
        <button className="btn-ghost !p-2" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Précédent">
          <ChevronLeft size={18} />
        </button>
        <span className="px-2 text-sm font-medium text-slate-700">{page}</span>
        <button className="btn-ghost !p-2" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Suivant">
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}
