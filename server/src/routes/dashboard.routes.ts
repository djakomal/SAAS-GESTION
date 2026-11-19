import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { asyncHandler, ok } from '../lib/http'
import { authenticate } from '../middleware/auth'
import { serializeInvoice, serializeProduct } from '../utils/serialize'

export const dashboardRouter = Router()
dashboardRouter.use(authenticate)

/** GET /api/dashboard */
dashboardRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const notCancelled: Prisma.InvoiceWhereInput = { status: { not: 'CANCELLED' } }

    const [
      allInvoices,
      monthInvoices,
      productsCount,
      lowStockRaw,
      statusGroups,
      recentInvoices,
      topProducts,
      recentMovements,
    ] = await Promise.all([
      prisma.invoice.findMany({ where: notCancelled, include: { items: true } }),
      prisma.invoice.findMany({ where: { ...notCancelled, issueDate: { gte: startOfMonth } } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "Product" WHERE quantity <= "alertThreshold" AND "isActive" = true`,
      prisma.invoice.groupBy({ by: ['status'], where: notCancelled, _count: { _all: true }, _sum: { total: true } }),
      prisma.invoice.findMany({ orderBy: { issueDate: 'desc' }, take: 6 }),
      prisma.invoiceItem.groupBy({
        by: ['productName'],
        _sum: { lineTotal: true, quantity: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: 5,
      }),
      prisma.stockMovement.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
    ])

    const revenue = allInvoices.reduce((s, i) => s + Number(i.total), 0)
    const paid = allInvoices.reduce((s, i) => s + Number(i.amountPaid), 0)
    const monthRevenue = monthInvoices.reduce((s, i) => s + Number(i.total), 0)
    const yearRevenue = allInvoices
      .filter((i) => new Date(i.issueDate) >= startOfYear)
      .reduce((s, i) => s + Number(i.total), 0)

    // Ventes sur les 6 derniers mois
    const monthly: Array<{ month: string; label: string; revenue: number; count: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const inMonth = allInvoices.filter((inv) => {
        const date = new Date(inv.issueDate)
        return date >= d && date < next
      })
      monthly.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(d).replace('.', ''),
        revenue: inMonth.reduce((s, inv) => s + Number(inv.total), 0),
        count: inMonth.length,
      })
    }

    const lowStockProducts = lowStockRaw.length
      ? await prisma.product.findMany({ where: { id: { in: lowStockRaw.map((r) => r.id) } }, orderBy: { quantity: 'asc' }, take: 5 })
      : []

    const byStatus = Object.fromEntries(
      statusGroups.map((g) => [g.status, { count: g._count._all, total: Number(g._sum.total ?? 0) }]),
    )

    ok(res, {
      kpis: {
        revenue,
        paid,
        outstanding: Math.max(0, revenue - paid),
        monthRevenue,
        yearRevenue,
        invoicesCount: allInvoices.length,
        monthInvoicesCount: monthInvoices.length,
        productsCount,
        lowStockCount: lowStockRaw.length,
        averageInvoice: allInvoices.length ? revenue / allInvoices.length : 0,
      },
      monthly,
      byStatus,
      topProducts: topProducts.map((p) => ({
        name: p.productName,
        revenue: Number(p._sum.lineTotal ?? 0),
        quantity: p._sum.quantity ?? 0,
      })),
      lowStock: lowStockProducts.map(serializeProduct),
      recentInvoices: recentInvoices.map(serializeInvoice),
      recentMovements: recentMovements.map((m) => ({
        id: m.id,
        productId: m.productId,
        quantity: m.quantity,
        type: m.type,
        reference: m.reference,
        createdAt: m.createdAt,
      })),
    })
  }),
)
