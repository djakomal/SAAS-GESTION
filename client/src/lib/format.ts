import { format, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

export function money(value: number, currency = 'FCFA'): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(value) || 0)} ${currency}`
}

export function compactMoney(value: number, currency = 'FCFA'): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value / 1_000_000)} M ${currency}`
  }
  if (Math.abs(value) >= 1000) {
    return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value / 1000)} k ${currency}`
  }
  return money(value, currency)
}

export function dateFR(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return '—'
  return format(new Date(value), withTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy', { locale: fr })
}

export function timeAgo(value: string | Date): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: fr })
}

export const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PAID: 'Payée',
  CANCELLED: 'Annulée',
}

export const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-200',
  SENT: 'bg-amber-50 text-amber-700 ring-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 ring-rose-200',
}

export const movementLabels: Record<string, string> = {
  VENTE: 'Vente',
  ANNULATION: 'Annulation',
  ENTREE: 'Entrée de stock',
  SORTIE: 'Sortie de stock',
}
