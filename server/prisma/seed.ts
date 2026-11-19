import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Initialisation de la base StockFlow...')

  // Suppression des données de démonstration. Les comptes utilisateurs sont conservés.
  await prisma.stockMovement.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.product.deleteMany()

  // Configuration boutique neutre (à compléter dans les paramètres)
  await prisma.company.upsert({
    where: { id: 'company-stockflow' },
    update: {
      name: 'Ma Boutique',
      address: null,
      city: null,
      phone: null,
      email: null,
      taxId: null,
      footerNote: null,
      notificationEmail: null,
    },
    create: {
      id: 'company-stockflow',
      name: 'Ma Boutique',
      currency: 'FCFA',
      invoicePrefix: 'FAC',
    },
  })

  // Seuls les acteurs sont conservés
  const adminHash = await bcrypt.hash('Admin123!', 10)
  const sellerHash = await bcrypt.hash('Vendeur123!', 10)

  await prisma.user.upsert({
    where: { email: 'admin@stockflow.local' },
    update: { passwordHash: adminHash, role: Role.ADMIN, isActive: true, name: 'Koffi Admin' },
    create: { name: 'Koffi Admin', email: 'admin@stockflow.local', passwordHash: adminHash, role: Role.ADMIN },
  })

  await prisma.user.upsert({
    where: { email: 'vendeur@stockflow.local' },
    update: { passwordHash: sellerHash, role: Role.VENDEUR, isActive: true, name: 'Awa Vendeuse' },
    create: { name: 'Awa Vendeuse', email: 'vendeur@stockflow.local', passwordHash: sellerHash, role: Role.VENDEUR },
  })

  console.log('✅ Base prête :')
  console.log('   👤 admin@stockflow.local / Admin123! (ADMIN)')
  console.log('   👤 vendeur@stockflow.local / Vendeur123! (VENDEUR)')
  console.log(`   🧾 ${await prisma.invoice.count()} ventes · 📦 ${await prisma.product.count()} produits · 🔔 ${await prisma.notification.count()} notifications`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
