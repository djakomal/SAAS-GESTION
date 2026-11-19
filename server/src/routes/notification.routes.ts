import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { ApiError, asyncHandler, ok } from '../lib/http'
import { authenticate, adminOnly } from '../middleware/auth'
import { parseOrThrow } from '../utils/validators'
import { sendTestEmail, sendDailyReport } from '../services/notification.service'

export const notificationRouter = Router()
notificationRouter.use(authenticate)

/** GET /api/notifications */
notificationRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take: limit }),
      prisma.notification.count({ where: { isRead: false } }),
    ])
    ok(res, {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        reference: n.reference,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      unread,
    })
  }),
)

/** PATCH /api/notifications/:id/read */
notificationRouter.patch(
  '/:id/read',
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
    if (!notification) throw new ApiError(404, 'Notification introuvable')
    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    })
    ok(res, { id: updated.id, isRead: true })
  }),
)

/** POST /api/notifications/read-all */
notificationRouter.post(
  '/read-all',
  asyncHandler(async (_req, res) => {
    const result = await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } })
    ok(res, { updated: result.count }, 'Notifications marquées comme lues')
  }),
)

/** DELETE /api/notifications/:id (admin uniquement) */
notificationRouter.delete(
  '/:id',
  adminOnly,
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({ where: { id: req.params.id } })
    if (!notification) throw new ApiError(404, 'Notification introuvable')
    await prisma.notification.delete({ where: { id: notification.id } })
    ok(res, null, 'Notification supprimée')
  }),
)

/** POST /api/notifications/daily-report — génère le rapport du jour (admin) */
notificationRouter.post(
  '/daily-report',
  adminOnly,
  asyncHandler(async (_req, res) => {
    await sendDailyReport()
    ok(res, null, 'Rapport quotidien généré')
  }),
)

/** POST /api/notifications/test-email — envoi d'un email de test (admin) */
notificationRouter.post(
  '/test-email',
  adminOnly,
  asyncHandler(async (req, res) => {
    const { to } = parseOrThrow(z.object({ to: z.string().trim().email('Email invalide') }), req.body)
    const sent = await sendTestEmail(to)
    ok(
      res,
      { sent },
      sent ? 'Email de test envoyé' : 'Email non envoyé (SMTP non configuré ou destinataires par défaut utilisés)',
    )
  }),
)
