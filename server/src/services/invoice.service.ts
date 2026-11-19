import { InvoiceStatus, Prisma, type Invoice } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { ApiError } from '../lib/http'
import { z } from 'zod'
import type { invoiceSchema } from '../utils/validators'

type InvoiceInput = z.infer<typeof invoiceSchema>
type ItemInput = InvoiceInput['items'][number]

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const affectsStock = (status: InvoiceStatus) => status === InvoiceStatus.SENT || status === InvoiceStatus.PAID

function computeTotals(items: ItemInput[], discount: number, taxRate: number) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))
  const taxable = Math.max(0, round2(subtotal - discount))
  const taxAmount = round2((taxable * taxRate) / 100)
  const total = round2(taxable + taxAmount)
  return { subtotal, taxable, taxAmount, total }
}

async function nextNumber(tx: Prisma.TransactionClient): Promise<string> {
  const company = await tx.company.findFirst()
  const prefix = company?.invoicePrefix ?? 'FAC'
  const year = new Date().getFullYear()
  const last = await tx.invoice.findFirst({
    where: { number: { startsWith: `${prefix}-${year}-` } },
    orderBy: { number: 'desc' },
    select: { number: true },
  })
  const seq = last ? parseInt(last.number.split('-').pop() ?? '0', 10) + 1 : 1
  return `${prefix}-${year}-${String(seq).padStart(4, '0')}`
}

/** Applique (+/-) l'effet des lignes sur le stock et écrit les mouvements. */
async function applyStock(
  tx: Prisma.TransactionClient,
  items: Array<{ productId: string | null; productName: string; quantity: number }>,
  invoiceId: string,
  reference: string,
  userId: string,
  direction: 1 | -1,
) {
  for (const item of items) {
    if (!item.productId) continue
    const product = await tx.product.findUnique({ where: { id: item.productId } })
    if (!product) continue

    if (direction === -1 && product.quantity < item.quantity) {
      throw new ApiError(
        400,
        `Stock insuffisant pour « ${item.productName} » (disponible : ${product.quantity}, demandé : ${item.quantity})`,
      )
    }

    await tx.product.update({
      where: { id: item.productId },
      data: { quantity: { increment: direction * item.quantity } },
    })
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantity: direction * item.quantity,
        type: direction === -1 ? 'VENTE' : 'ANNULATION',
        reference,
        userId,
        invoiceId,
      },
    })
  }
}

export async function createInvoice(input: InvoiceInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const { subtotal, taxAmount, total } = computeTotals(input.items, input.discount, input.taxRate)
    const number = await nextNumber(tx)
    const issueDate = input.issueDate ? new Date(input.issueDate) : new Date()

    const invoice = await tx.invoice.create({
      data: {
        number,
        userId,
        status: input.status as InvoiceStatus,
        issueDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        subtotal,
        discount: input.discount,
        taxRate: input.taxRate,
        taxAmount,
        total,
        amountPaid: input.status === InvoiceStatus.PAID ? total : Math.min(input.amountPaid, total),
        cashReceived: input.cashReceived,
        notes: input.notes,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId || null,
            productName: item.productName,
            sku: item.sku || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            lineTotal: round2(item.quantity * item.unitPrice),
          })),
        },
      },
      include: { items: true, user: true },
    })

    if (affectsStock(invoice.status)) {
      await applyStock(
        tx,
        invoice.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })),
        invoice.id,
        invoice.number,
        userId,
        -1,
      )
    }
    return invoice
  })
}

export async function updateInvoice(id: string, input: InvoiceInput, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.invoice.findUnique({ where: { id }, include: { items: true } })
    if (!existing) throw new ApiError(404, 'Facture introuvable')

    // Restaure l'ancien stock si la facture l'avait consommé
    if (affectsStock(existing.status)) {
      await applyStock(
        tx,
        existing.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })),
        existing.id,
        existing.number,
        userId,
        1,
      )
      await tx.stockMovement.deleteMany({ where: { invoiceId: existing.id } })
    }

    const { subtotal, taxAmount, total } = computeTotals(input.items, input.discount, input.taxRate)

    const invoice = await tx.invoice.update({
      where: { id },
      data: {
        status: input.status as InvoiceStatus,
        issueDate: input.issueDate ? new Date(input.issueDate) : existing.issueDate,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        subtotal,
        discount: input.discount,
        taxRate: input.taxRate,
        taxAmount,
        total,
        amountPaid: input.status === InvoiceStatus.PAID ? total : Math.min(input.amountPaid, total),
        cashReceived: input.cashReceived,
        notes: input.notes,
        items: {
          deleteMany: {},
          create: input.items.map((item) => ({
            productId: item.productId || null,
            productName: item.productName,
            sku: item.sku || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            lineTotal: round2(item.quantity * item.unitPrice),
          })),
        },
      },
      include: { items: true, user: true },
    })

    if (affectsStock(invoice.status)) {
      await applyStock(
        tx,
        invoice.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })),
        invoice.id,
        invoice.number,
        userId,
        -1,
      )
    }
    return invoice
  })
}

export async function changeStatus(id: string, status: InvoiceStatus, userId: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id }, include: { items: true } })
    if (!invoice) throw new ApiError(404, 'Facture introuvable')

    if (affectsStock(invoice.status) && !affectsStock(status)) {
      await applyStock(
        tx,
        invoice.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })),
        invoice.id,
        invoice.number,
        userId,
        1,
      )
      await tx.stockMovement.deleteMany({ where: { invoiceId: invoice.id } })
    } else if (!affectsStock(invoice.status) && affectsStock(status)) {
      await applyStock(
        tx,
        invoice.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })),
        invoice.id,
        invoice.number,
        userId,
        -1,
      )
    }

    return tx.invoice.update({
      where: { id },
      data: {
        status,
        amountPaid: status === InvoiceStatus.PAID ? invoice.total : status === InvoiceStatus.DRAFT ? 0 : invoice.amountPaid,
      },
      include: { items: true, user: true },
    })
  })
}

export async function deleteInvoice(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id }, include: { items: true } })
    if (!invoice) throw new ApiError(404, 'Facture introuvable')
    if (affectsStock(invoice.status)) {
      await applyStock(
        tx,
        invoice.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity })),
        invoice.id,
        invoice.number,
        userId,
        1,
      )
    }
    await tx.stockMovement.deleteMany({ where: { invoiceId: invoice.id } })
    await tx.invoice.delete({ where: { id } })
  })
}

export type { Invoice }
