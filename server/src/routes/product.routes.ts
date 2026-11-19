import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { ApiError, asyncHandler, ok } from '../lib/http'
import { authenticate, authorize } from '../middleware/auth'
import { parseOrThrow, productSchema, updateStockSchema } from '../utils/validators'
import { serializeProduct, serializeMovement } from '../utils/serialize'
import { notifyLowStock } from '../services/notification.service'

export const productRouter = Router()
productRouter.use(authenticate)

/** GET /api/products — recherche, filtre catégorie, alerte stock, pagination */
productRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { search, category, lowStock, page = '1', limit = '20', active } = req.query
    const where: Prisma.ProductWhereInput = {}

    if (search) {
      const s = String(search)
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
        { category: { contains: s, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = String(category)
    if (lowStock === 'true') {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Product" WHERE quantity <= "alertThreshold" AND "isActive" = true
      `
      where.id = { in: rows.map((r) => r.id) }
    }
    if (active !== undefined) where.isActive = active === 'true'

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.product.count({ where }),
    ])

    const categories = await prisma.product.findMany({
      where: { category: { not: null } },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    })

    ok(res, {
      items: products.map(serializeProduct),
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
      categories: categories.map((c) => c.category).filter(Boolean),
    })
  }),
)

/** GET /api/products/:id */
productRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!product) throw new ApiError(404, 'Produit introuvable')
    ok(res, {
      ...serializeProduct(product),
      movements: product.stockMovements.map(serializeMovement),
    })
  }),
)

/** POST /api/products */
productRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(productSchema, req.body)
    const exists = await prisma.product.findUnique({ where: { sku: data.sku } })
    if (exists) throw new ApiError(409, `La référence « ${data.sku} » existe déjà`)

    const product = await prisma.product.create({
      data: { ...data, alertThreshold: data.alertThreshold ?? 5 },
    })
    await notifyLowStock(req.user!.name)
    ok(res, serializeProduct(product), 'Produit créé', 201)
  }),
)

/** PUT /api/products/:id */
productRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(productSchema.partial(), req.body)
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) throw new ApiError(404, 'Produit introuvable')

    if (data.sku && data.sku !== product.sku) {
      const duplicate = await prisma.product.findUnique({ where: { sku: data.sku } })
      if (duplicate) throw new ApiError(409, 'Cette référence existe déjà')
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { ...data, sku: data.sku ?? product.sku },
    })
    await notifyLowStock(req.user!.name)
    ok(res, serializeProduct(updated), 'Produit mis à jour')
  }),
)

/** PATCH /api/products/:id/stock — ajustement manuel (admin uniquement) */
productRouter.patch(
  '/:id/stock',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const { quantity, reason } = parseOrThrow(updateStockSchema, req.body)
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) throw new ApiError(404, 'Produit introuvable')

    const delta = quantity - product.quantity
    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: product.id },
        data: { quantity },
      })
      if (delta !== 0) {
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            quantity: delta,
            type: delta > 0 ? 'ENTREE' : 'SORTIE',
            reference: reason || 'Ajustement manuel',
            userId: req.user!.id,
          },
        })
      }
      return p
    })
    await notifyLowStock(req.user!.name)
    ok(res, serializeProduct(updated), 'Stock mis à jour')
  }),
)

/** DELETE /api/products/:id (admin uniquement) */
productRouter.delete(
  '/:id',
  authorize('ADMIN'),
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) throw new ApiError(404, 'Produit introuvable')
    await prisma.product.update({ where: { id: product.id }, data: { isActive: false } })
    ok(res, null, 'Produit désactivé')
  }),
)
