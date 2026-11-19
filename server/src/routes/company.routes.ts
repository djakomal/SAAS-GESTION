import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { ApiError, asyncHandler, ok } from '../lib/http'
import { authenticate, adminOnly } from '../middleware/auth'
import { parseOrThrow, companySchema } from '../utils/validators'
import { serializeCompany } from '../utils/serialize'

export const companyRouter = Router()
companyRouter.use(authenticate)

/** GET /api/company */
companyRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const company = (await prisma.company.findFirst()) ?? (await prisma.company.create({
      data: { name: 'Ma Boutique' },
    }))
    ok(res, serializeCompany(company))
  }),
)

/** PUT /api/company (admin) */
companyRouter.put(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(companySchema, req.body)
    const existing = await prisma.company.findFirst()
    const company = existing
      ? await prisma.company.update({ where: { id: existing.id }, data })
      : await prisma.company.create({ data })
    ok(res, serializeCompany(company), 'Paramètres enregistrés')
  }),
)
