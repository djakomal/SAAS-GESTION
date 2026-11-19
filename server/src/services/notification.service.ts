import { NotificationType, Prisma } from '@prisma/client'
import nodemailer from 'nodemailer'
import { env } from '../config/env'
import { prisma } from '../lib/prisma'

const money = (value: unknown, currency: string) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(value))} ${currency}`

type NotificationData = {
  type: NotificationType
  title: string
  body: string
  reference?: string | null
}

/** Destinataires : email configuré dans la société + emails des administrateurs. */
export async function getRecipients(): Promise<string[]> {
  const [company, admins] = await Promise.all([
    prisma.company.findFirst(),
    prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { email: true } }),
  ])
  const emails = [
    ...(company?.notificationEmail ?? '').split(',').map((s) => s.trim()),
    ...env.notifyEmails,
    ...admins.map((a) => a.email),
  ]
  return [...new Set(emails.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))]
}

/** Envoie un email. Sans SMTP configuré, affiche un aperçu dans la console (développement). */
export async function sendMail(subject: string, html: string): Promise<boolean> {
  const recipients = await getRecipients()
  if (!recipients.length) return false

  if (!env.smtp.host) {
    console.log(`\n📧 [APERÇU EMAIL] → ${recipients.join(', ')}`)
    console.log(`   Objet : ${subject}`)
    console.log(`   ${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220)}\n`)
    return false
  }

  try {
    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
    await transporter.sendMail({
      from: env.smtp.from,
      to: recipients.join(', '),
      subject,
      html,
    })
    console.log(`📧 Email envoyé à ${recipients.length} destinataire(s) : ${subject}`)
    return true
  } catch (error) {
    console.error('❌ Échec envoi email:', error)
    return false
  }
}

/** Normalise les caractères unicode spéciaux (espaces fines/fr-FR) pour l'encodage WIN1252 de la base. */
const dbText = (value: string) =>
  value.replace(/[\u202f\u00a0\u2009\u200a\u2028\u2029]/g, ' ').replace(/\u2011/g, '-')

async function create(data: NotificationData) {
  return prisma.notification.create({
    data: { ...data, title: dbText(data.title), body: dbText(data.body) },
  })
}

function mailTemplate(title: string, content: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1e293b">
    <div style="background:#1e4238;color:#fff;padding:20px;border-radius:10px 10px 0 0">
      <h1 style="margin:0;font-size:20px">StockFlow</h1>
    </div>
    <div style="padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px">
      <h2 style="margin-top:0;color:#2c6652">${title}</h2>
      <div style="font-size:14px;line-height:1.6">${content}</div>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="font-size:11px;color:#94a3b8">Notification automatique de StockFlow</p>
    </div>
  </div>`
}

/** Alerte stock faible (une seule notification non lue par produit). */
export async function notifyLowStock(actorName?: string) {
  const products = await prisma.product.findMany({ where: { isActive: true } })
  const low = products.filter((p) => p.quantity <= p.alertThreshold)
  if (!low.length) return

  const company = await prisma.company.findFirst()
  const currency = company?.currency ?? 'FCFA'
  let created = 0

  for (const product of low) {
    const existing = await prisma.notification.findFirst({
      where: { type: NotificationType.LOW_STOCK, reference: product.id, isRead: false },
    })
    if (existing) continue

    await create({
      type: NotificationType.LOW_STOCK,
      title: `Stock faible : ${product.name}`,
      body: `Il reste ${product.quantity} ${product.unit}(s) en stock (seuil d'alerte : ${product.alertThreshold}).${actorName ? ` Suite à l'action de ${actorName}.` : ''}`,
      reference: product.id,
    })
    created++
  }

  if (created > 0) {
    const list = low.map((p) => `<li><strong>${p.name}</strong> — ${p.quantity} ${p.unit} restants (seuil ${p.alertThreshold})</li>`).join('')
    await sendMail(
      `⚠️ ${created} produit(s) en stock faible`,
      mailTemplate('Alerte stock faible', `<p>Les produits suivants nécessitent un réapprovisionnement :</p><ul>${list}</ul>`),
    )
  }
}

/** Notification pour une nouvelle vente enregistrée. */
export async function notifyNewSale(invoice: {
  id: string
  number: string
  total: Prisma.Decimal | number
  items: Array<{ productName: string; quantity: number }>
}, actorName: string) {
  const company = await prisma.company.findFirst()
  const currency = company?.currency ?? 'FCFA'

  await create({
    type: NotificationType.NEW_SALE,
    title: `Nouvelle vente ${invoice.number}`,
    body: `Vendue par ${actorName} · ${invoice.items.length} article(s) · Total ${money(invoice.total, currency)}`,
    reference: invoice.id,
  })

  const articles = invoice.items.map((i) => `<li>${i.quantity} × ${i.productName}</li>`).join('')
  await sendMail(
    `🧾 Nouvelle vente ${invoice.number} — ${money(invoice.total, currency)}`,
    mailTemplate('Nouvelle vente enregistrée', `<p>Une vente vient d'être enregistrée par <strong>${actorName}</strong> :</p><ul>${articles}</ul><p><strong>Total : ${money(invoice.total, currency)}</strong></p>`),
  )
}

/** Rapport quotidien (appelé par le planificateur). */
export async function sendDailyReport() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)

  const [sales, company, lowCount] = await Promise.all([
    prisma.invoice.findMany({ where: { issueDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } } }),
    prisma.company.findFirst(),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint as count FROM "Product" WHERE quantity <= "alertThreshold" AND "isActive" = true`,
  ])

  const currency = company?.currency ?? 'FCFA'
  const total = sales.reduce((s, i) => s + Number(i.total), 0)
  const paid = sales.reduce((s, i) => s + Number(i.amountPaid) + Number(i.cashReceived), 0)
  const count = Number(lowCount[0]?.count ?? 0)

  await create({
    type: NotificationType.DAILY_REPORT,
    title: `Rapport du ${new Intl.DateTimeFormat('fr-FR').format(start)}`,
    body: `${sales.length} vente(s) · CA ${money(total, currency)} · Encaissé ${money(paid, currency)}`,
  })

  await sendMail(
    `📊 Rapport quotidien — ${money(total, currency)} de ventes`,
    mailTemplate('Rapport de la journée', `
      <p>Voici le résumé des ventes du ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(start)} :</p>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0">Nombre de ventes</td><td style="text-align:right"><strong>${sales.length}</strong></td></tr>
        <tr><td style="padding:8px 0">Chiffre d'affaires</td><td style="text-align:right"><strong>${money(total, currency)}</strong></td></tr>
        <tr><td style="padding:8px 0">Encaissé</td><td style="text-align:right"><strong>${money(paid, currency)}</strong></td></tr>
        <tr><td style="padding:8px 0">Produits en stock faible</td><td style="text-align:right"><strong>${count}</strong></td></tr>
      </table>`),
  )
}

/** Email de test envoyé depuis les paramètres. */
export async function sendTestEmail(to: string) {
  return sendMail(
    '✅ Test de notification StockFlow',
    mailTemplate('Test de notification', '<p>Si vous recevez cet email, la configuration SMTP est correcte. 🎉</p>'),
  )
}
