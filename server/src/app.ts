import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env } from './config/env'
import { ApiError } from './lib/http'
import { authRouter } from './routes/auth.routes'
import { userRouter } from './routes/user.routes'
import { productRouter } from './routes/product.routes'
import { invoiceRouter } from './routes/invoice.routes'
import { dashboardRouter } from './routes/dashboard.routes'
import { companyRouter } from './routes/company.routes'
import { notificationRouter } from './routes/notification.routes'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({
    origin: (origin, callback) => {
      // Autorise les origines configurées, ainsi que toute origine localhost/127.0.0.1 en développement
      const allowed = env.clientOrigins
      if (!origin || allowed.includes(origin) || (env.nodeEnv === 'development' && /^https?:\/\/(localhost|127\.0\.0\.1|.*\.localhost)(:\d+)?$/.test(origin))) {
        return callback(null, true)
      }
      callback(new Error('Origine non autorisée par CORS'))
    },
    credentials: true,
  }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))
  if (env.nodeEnv === 'development') app.use(morgan('dev'))

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, message: 'Trop de requêtes, réessayez plus tard' },
    }),
  )

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, message: 'StockFlow API en ligne', timestamp: new Date().toISOString() })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/users', userRouter)
  app.use('/api/products', productRouter)
  app.use('/api/invoices', invoiceRouter)
  app.use('/api/dashboard', dashboardRouter)
  app.use('/api/company', companyRouter)
  app.use('/api/notifications', notificationRouter)

  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'Route introuvable')))

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json({
        success: false,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      })
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ success: false, message: 'JSON invalide' })
    }
    console.error('❌ Erreur serveur:', err)
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      ...(env.nodeEnv === 'development' ? { error: String(err) } : {}),
    })
  })

  return app
}
