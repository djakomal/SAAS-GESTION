import type { Company, Invoice, InvoiceItem, Product, StockMovement, User } from '@prisma/client'

const num = (value: unknown): number => Number(value ?? 0)

export const serializeUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  createdAt: u.createdAt,
})

export const serializeProduct = (p: Product) => ({
  id: p.id,
  name: p.name,
  sku: p.sku,
  description: p.description,
  category: p.category,
  unit: p.unit,
  purchasePrice: num(p.purchasePrice),
  sellingPrice: num(p.sellingPrice),
  quantity: p.quantity,
  alertThreshold: p.alertThreshold,
  isActive: p.isActive,
  imageUrl: p.imageUrl,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
})

const serializeItem = (i: InvoiceItem) => ({
  id: i.id,
  productId: i.productId,
  productName: i.productName,
  sku: i.sku,
  quantity: i.quantity,
  unitPrice: num(i.unitPrice),
  taxRate: num(i.taxRate),
  lineTotal: num(i.lineTotal),
})

export function serializeInvoice(
  inv: Invoice & { items?: InvoiceItem[]; user?: User | null },
) {
  return {
    id: inv.id,
    number: inv.number,
    userId: inv.userId,
    user: inv.user ? { id: inv.user.id, name: inv.user.name } : undefined,
    status: inv.status,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    subtotal: num(inv.subtotal),
    discount: num(inv.discount),
    taxRate: num(inv.taxRate),
    taxAmount: num(inv.taxAmount),
    total: num(inv.total),
    amountPaid: num(inv.amountPaid),
    cashReceived: num(inv.cashReceived),
    notes: inv.notes,
    items: inv.items?.map(serializeItem),
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  }
}

export const serializeCompany = (c: Company) => ({
  id: c.id,
  name: c.name,
  address: c.address,
  city: c.city,
  phone: c.phone,
  email: c.email,
  taxId: c.taxId,
  currency: c.currency,
  invoicePrefix: c.invoicePrefix,
  footerNote: c.footerNote,
  notificationEmail: c.notificationEmail,
})

export const serializeMovement = (m: StockMovement) => ({
  id: m.id,
  productId: m.productId,
  quantity: m.quantity,
  type: m.type,
  reference: m.reference,
  createdAt: m.createdAt,
})
