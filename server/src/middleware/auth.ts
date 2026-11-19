import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { ApiError } from '../lib/http'
import { asyncHandler } from '../lib/http'
import { prisma } from '../lib/prisma'

export interface JwtPayload {
  sub: string
  email: string
  role: 'ADMIN' | 'VENDEUR'
}

export function signToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { email: user.email, role: user.role },
    env.jwtSecret,
    { subject: user.id, expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  )
}

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentification requise')
  }
  const token = header.slice(7).trim()
  let payload: JwtPayload
  try {
    payload = jwt.verify(token, env.jwtSecret) as JwtPayload
  } catch {
    throw new ApiError(401, 'Session expirée ou invalide, veuillez vous reconnecter')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Compte introuvable ou désactivé')
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role }
  next()
})

/** Restreint l'accès aux rôles donnés. */
export function authorize(...roles: Array<'ADMIN' | 'VENDEUR'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, 'Authentification requise'))
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Vous n'avez pas les droits pour cette action"))
    }
    next()
  }
}

export const adminOnly = authorize('ADMIN')
