export type Role = 'ADMIN' | 'VENDEUR'
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  createdAt: string
}

export interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  category: string | null
  unit: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  alertThreshold: number
  isActive: boolean
  createdAt: string
}

export interface InvoiceItem {
  id: string
  productId: string | null
  productName: string
  sku: string | null
  quantity: number
  unitPrice: number
  taxRate: number
  lineTotal: number
}

export interface Invoice {
  id: string
  number: string
  userId: string
  user?: { id: string; name: string }
  status: InvoiceStatus
  issueDate: string
  dueDate: string | null
  subtotal: number
  discount: number
  taxRate: number
  taxAmount: number
  total: number
  amountPaid: number
  cashReceived: number
  notes: string | null
  items: InvoiceItem[]
  createdAt: string
}

export interface Company {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  taxId: string | null
  currency: string
  invoicePrefix: string
  footerNote: string | null
  notificationEmail: string | null
}

export type NotificationType = 'LOW_STOCK' | 'NEW_SALE' | 'DAILY_REPORT' | 'SYSTEM'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  reference: string | null
  isRead: boolean
  createdAt: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pages: number
  limit?: number
  categories?: string[]
  summary?: { total: number; paid: number }
}

export interface DashboardData {
  kpis: {
    revenue: number
    paid: number
    outstanding: number
    monthRevenue: number
    yearRevenue: number
    invoicesCount: number
    monthInvoicesCount: number
    productsCount: number
    lowStockCount: number
    averageInvoice: number
  }
  monthly: Array<{ month: string; label: string; revenue: number; count: number }>
  byStatus: Record<string, { count: number; total: number }>
  topProducts: Array<{ name: string; revenue: number; quantity: number }>
  lowStock: Product[]
  recentInvoices: Invoice[]
  recentMovements: Array<{ id: string; quantity: number; type: string; reference: string | null; createdAt: string; productId: string }>
}

export interface ProductInput {
  name: string
  sku: string
  description?: string | null
  category?: string | null
  unit: string
  purchasePrice: number
  sellingPrice: number
  quantity: number
  alertThreshold: number
  isActive: boolean
}

export interface InvoiceInput {
  status: InvoiceStatus
  issueDate?: string
  dueDate?: string | null
  discount: number
  taxRate: number
  notes?: string | null
  amountPaid: number
  cashReceived: number
  items: Array<{
    productId?: string | null
    productName: string
    sku?: string | null
    quantity: number
    unitPrice: number
    taxRate: number
  }>
}
