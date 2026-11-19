import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) throw new Error(`Variable d'environnement manquante: ${name}`)
  return value
}

export const env = {
  port: Number(required('PORT', '4000')),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  clientUrl: required('CLIENT_URL', 'http://localhost:5173'),
  clientOrigins: (process.env.CLIENT_ORIGINS ?? process.env.CLIENT_URL ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'StockFlow <no-reply@stockflow.local>',
  },
  notifyEmails: (process.env.NOTIFY_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  dailyReportCron: process.env.DAILY_REPORT_CRON ?? '0 20 * * *',
}
