import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { ApiError, asyncHandler, ok } from '../lib/http'
import { authenticate, adminOnly } from '../middleware/auth'
import { parseOrThrow, createUserSchema, updateUserSchema } from '../utils/validators'
import { serializeUser } from '../utils/serialize'

export const userRouter = Router()
userRouter.use(authenticate)

/** GET /api/users */
userRouter.get(
  '/',
  adminOnly,
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    ok(res, users.map(serializeUser))
  }),
)

/** POST /api/users */
userRouter.post(
  '/',
  adminOnly,
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(createUserSchema, req.body)
    const email = data.email.toLowerCase()
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) throw new ApiError(409, 'Cet email est déjà utilisé')

    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({
      data: { name: data.name, email, passwordHash, role: data.role },
    })
    ok(res, serializeUser(user), 'Utilisateur créé', 201)
  }),
)

/** PUT /api/users/:id */
userRouter.put(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const data = parseOrThrow(updateUserSchema, req.body)
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) throw new ApiError(404, 'Utilisateur introuvable')

    if (data.email) {
      const duplicate = await prisma.user.findFirst({
        where: { email: data.email.toLowerCase(), id: { not: user.id } },
      })
      if (duplicate) throw new ApiError(409, 'Cet email est déjà utilisé')
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        email: data.email ? data.email.toLowerCase() : undefined,
        role: data.role,
        isActive: data.isActive,
        ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
      },
    })
    ok(res, serializeUser(updated), 'Utilisateur mis à jour')
  }),
)

/** DELETE /api/users/:id */
userRouter.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user!.id) throw new ApiError(400, 'Vous ne pouvez pas supprimer votre propre compte')
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) throw new ApiError(404, 'Utilisateur introuvable')
    await prisma.user.delete({ where: { id: user.id } })
    ok(res, null, 'Utilisateur supprimé')
  }),
)
