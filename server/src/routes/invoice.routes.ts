import { Router } from 'express'
import { InvoiceStatus, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { ApiError, asyncHandler, ok } from '../lib/http'
import { authenticate, authorize } from '../middleware/auth'
import { parseOrThrow, invoiceSchema } from '../utils/validators'
import { serializeInvoice } from '../utils/serialize'
import { createInvoice, updateInvoice, changeStatus, deleteInvoice } from '../services/invoice.service'
import { generateInvoicePdf } from '../services/pdf.service'
import { generateReceiptHtml } from '../services/receipt.service'
import { notifyNewSale, notifyLowStock } from '../services/notification.service'

export const invoiceRouter = Router()
invoiceRouter.use(authenticate)

const include = { items: true, user: true }

/** GET /api/invoices */
invoiceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, status, startDate, endDate, page = '1', limit = '20' } = req.query
    const where: Prisma.InvoiceWhereInput = {}

    if (search) {
      const s = String(search)
      where.OR = [
        { number: { contains: s, mode: 'insensitive' } },
        { items: { some: { productName: { contains: s, mode: 'insensitive' } } } },
      ]
    }
    if (status && status !== 'ALL') where.status = String(status) as InvoiceStatus
    if (startDate || endDate) {
      where.issueDate = {
        ...(startDate ? { gte: new Date(String(startDate)) } : {}),
        ...(endDate ? { lte: new Date(String(endDate) + 'T23:59:59.999Z') } : {}),
      }
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
    const [invoices, total, aggregates] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include,
        orderBy: { issueDate: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.invoice.count({ where }),
      prisma.invoice.aggregate({ where, _sum: { total: true, amountPaid: true } }),
    ])

    ok(res, {
      items: invoices.map(serializeInvoice),
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      summary: {
        total: Number(aggregates._sum.total ?? 0),
        paid: Number(aggregates._sum.amountPaid ?? 0),
      },
    })
  }),
)

/** GET /api/invoices/:id */
invoiceRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include })
    if (!invoice) throw new ApiError(404, 'Facture introuvable')
    ok(res, serializeInvoice(invoice))
  }),
)

/** GET /api/invoices/:id/pdf — export PDF A4 */
invoiceRouter.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include })
    if (!invoice) throw new ApiError(404, 'Facture introuvable')
    const company = await prisma.company.findFirst()
    if (!company) throw new ApiError(404, 'Configuration boutique introuvable')

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="facture-${invoice.number}.pdf"`)
    generateInvoicePdf(invoice as Parameters<typeof generateInvoicePdf>[0], company).pipe(res)
  }),
)

/** GET /api/invoices/:id/receipt — ticket imprimable (imprimante thermique 80mm) */
invoiceRouter.get(
  '/:id/receipt',
  asyncHandler(async (req, res) => {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, include })
    if (!invoice) throw new ApiError(404, 'Facture introuvable')
    const company = await prisma.company.findFirst()
    if (!company) throw new ApiError(404, 'Configuration boutique introuvable')

    const autoprint = req.query.autoprint === '1'
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.send(generateReceiptHtml(invoice as Parameters<typeof generateReceiptHtml>[0], company, autoprint))
  }),
)

/** POST /api/invoices */
invoiceRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(invoiceSchema, req.body)
    const invoice = await createInvoice(data, req.user!.id)
    await notifyNewSale(invoice, req.user!.name)
    await notifyLowStock(req.user!.name)
    ok(res, serializeInvoice(invoice), 'Vente enregistrée', 201)
  }),
)

/** PUT /api/invoices/:id */
invoiceRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(invoiceSchema, req.body)
    const invoice = await updateInvoice(req.params.id, data, req.user!.id)
    await notifyLowStock(req.user!.name)
    ok(res, serializeInvoice(invoice), 'Vente mise à jour')
  }),
)

/** PATCH /api/invoices/:id/status */
invoiceRouter.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const status = String(req.body?.status ?? '') as InvoiceStatus
    if (!Object.values(InvoiceStatus).includes(status)) throw new ApiError(400, 'Statut invalide')
    const invoice = await changeStatus(req.params.id, status, req.user!.id)
    await notifyLowStock(req.user!.name)
    ok(res, serializeInvoice(invoice), 'Statut mis à jour')
  }),
)

/** DELETE /api/invoices/:id (admin uniquement) */
invoiceRouter.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    await deleteInvoice(req.params.id, req.user!.id)
    ok(res, null, 'Vente supprimée')
  }),
)
