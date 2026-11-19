import cron from 'node-cron'
import { createApp } from './app'
import { env } from './config/env'
import { prisma } from './lib/prisma'
import { sendDailyReport } from './services/notification.service'

const app = createApp()

async function main() {
  try {
    await prisma.$connect()
    console.log('✅ Connecté à PostgreSQL')
  } catch (error) {
    console.error('❌ Impossible de se connecter à la base de données:', error)
    process.exit(1)
  }

  const server = app.listen(env.port, () => {
    console.log(`🚀 StockFlow API → http://localhost:${env.port}`)
    console.log(`   Health check → http://localhost:${env.port}/api/health`)
  })

  if (cron.validate(env.dailyReportCron)) {
    cron.schedule(env.dailyReportCron, async () => {
      try {
        await sendDailyReport()
      } catch (error) {
        console.error('❌ Erreur rapport quotidien:', error)
      }
    })
    console.log(`⏰ Rapport quotidien planifié : ${env.dailyReportCron}`)
  }

  const shutdown = () => {
    console.log('\nArrêt du serveur...')
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()
