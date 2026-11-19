import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { ApiError, asyncHandler, ok } from '../lib/http'
import { authenticate, signToken } from '../middleware/auth'
import { parseOrThrow, loginSchema, changePasswordSchema } from '../utils/validators'
import { serializeUser } from '../utils/serialize'

export const authRouter = Router()

/** POST /api/auth/login */
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = parseOrThrow(loginSchema, req.body)
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !user.isActive) throw new ApiError(401, 'Email ou mot de passe incorrect')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new ApiError(401, 'Email ou mot de passe incorrect')

    const token = signToken(user)
    ok(res, { token, user: serializeUser(user) }, 'Connexion réussie')
  }),
)

/** GET /api/auth/me */
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw new ApiError(401, 'Compte introuvable')
    ok(res, serializeUser(user))
  }),
)

/** POST /api/auth/change-password */
authRouter.post(
  '/change-password',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = parseOrThrow(changePasswordSchema, req.body)
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
    if (!user) throw new ApiError(404, 'Utilisateur introuvable')

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) throw new ApiError(400, "Mot de passe actuel incorrect")

    const passwordHash = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
    ok(res, null, 'Mot de passe mis à jour')
  }),
)
