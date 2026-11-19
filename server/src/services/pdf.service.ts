import PDFDocument from 'pdfkit'
import type { Company, Invoice, InvoiceItem } from '@prisma/client'

type FullInvoice = Invoice & { items: InvoiceItem[]; user?: { name: string } | null }

const money = (value: unknown, currency: string) =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value))} ${currency}`

const dateFR = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d)) : '—'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'BROUILLON', SENT: 'ENVOYÉE', PAID: 'PAYÉE', CANCELLED: 'ANNULÉE',
}

export function generateInvoicePdf(invoice: FullInvoice, company: Company): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 48,
    bufferPages: true,
    info: { Title: `Vente ${invoice.number}`, Author: company.name, Subject: `Vente ${invoice.number}` },
  })

  const currency = company.currency || 'FCFA'
  const width = doc.page.width
  const left = 48
  const right = width - 48
  const contentWidth = right - left
  const paid = Number(invoice.cashReceived) > 0 ? Number(invoice.cashReceived) : Number(invoice.amountPaid)
  const change = Math.max(0, paid - Number(invoice.total))

  // ---- Bandeau d'en-tête : identité de la boutique ----
  doc.rect(0, 0, width, 118).fill('#1e4238')
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text(company.name.toUpperCase(), left, 34)
  doc.font('Helvetica').fontSize(9).fillColor('#d6ece1')
  const contact = [company.address, company.city, company.phone, company.email].filter(Boolean).join('  •  ')
  if (contact) doc.text(contact, left, 64, { width: contentWidth - 150 })
  if (company.taxId) doc.text(company.taxId, left, 80)
  doc.text('VENTE', right - 165, 34, { width: 165, align: 'right' })
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#ffffff').text(invoice.number, right - 165, 56, { width: 165, align: 'right' })

  let y = 142

  // ---- Détails de la vente + paiement ----
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#2c6652')
  doc.text('DÉTAILS DE LA VENTE', left, y)
  doc.text('PAIEMENT', right - 205, y)
  y += 18

  const details: Array<[string, string]> = [
    ['Date', dateFR(invoice.issueDate)],
    ['Caissier', invoice.user?.name ?? '—'],
    ['Statut', STATUS_LABEL[invoice.status] ?? invoice.status],
    ['Référence', invoice.number],
  ]
  details.forEach(([label, value], i) => {
    const dy = y + i * 17
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text(label, left, dy, { width: 75 })
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827').text(value, left + 78, dy, { width: 175 })
  })

  const payX = right - 205
  doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('Total TTC', payX, y, { width: 100 })
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(money(invoice.total, currency), payX + 100, y - 1, { width: 105, align: 'right' })
  if (paid > 0) {
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('Montant payé', payX, y + 20, { width: 100 })
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#059669').text(money(paid, currency), payX + 100, y + 19, { width: 105, align: 'right' })
  }
  if (change > 0) {
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('Monnaie rendue', payX, y + 40, { width: 100 })
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(money(change, currency), payX + 100, y + 39, { width: 105, align: 'right' })
  }

  y = Math.max(y + details.length * 17, paid > 0 ? y + (change > 0 ? 60 : 40) : y) + 22

  // ---- Tableau des lignes ----
  const col = { desc: left + 6, qty: left + contentWidth - 250, pu: left + contentWidth - 180, total: right - 6 }
  doc.rect(left, y, contentWidth, 26).fill('#f3f6f4')
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#2c6652')
  doc.text('DÉSIGNATION', col.desc, y + 8, { width: 240 })
  doc.text('QTÉ', col.qty, y + 8, { width: 50, align: 'center' })
  doc.text('P.U.', col.pu, y + 8, { width: 80, align: 'right' })
  doc.text('MONTANT', col.total - 90, y + 8, { width: 90, align: 'right' })
  y += 26

  invoice.items.forEach((item, index) => {
    if (index % 2 === 1) doc.rect(left, y, contentWidth, 26).fill('#fafbfa')
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#111827')
    doc.text(item.productName, col.desc, y + 7, { width: 235, ellipsis: true })
    if (item.sku) doc.font('Helvetica').fontSize(8).fillColor('#9ca3af').text(item.sku, col.desc, y + 17, { width: 235 })
    doc.font('Helvetica').fontSize(9.5).fillColor('#374151')
    doc.text(String(item.quantity), col.qty, y + 8, { width: 50, align: 'center' })
    doc.text(money(item.unitPrice, currency), col.pu - 10, y + 8, { width: 90, align: 'right' })
    doc.font('Helvetica-Bold').fillColor('#111827')
    doc.text(money(item.lineTotal, currency), col.total - 90, y + 8, { width: 90, align: 'right' })
    y += 26
  })

  doc.moveTo(left, y).lineTo(right, y).strokeColor('#d1d5db').lineWidth(1).stroke()
  y += 14

  // ---- Totaux ----
  const tx = right - 210
  const row = (label: string, value: string, bold = false, size = 10) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(bold ? '#111827' : '#4b5563')
    doc.text(label, tx, y, { width: 120, align: 'right' })
    doc.text(value, tx + 125, y, { width: 85, align: 'right' })
    y += 18
  }
  row('Sous-total', money(invoice.subtotal, currency))
  if (Number(invoice.discount) > 0) row('Remise', `- ${money(invoice.discount, currency)}`)
  if (Number(invoice.taxRate) > 0) row(`TVA (${Number(invoice.taxRate)} %)`, money(invoice.taxAmount, currency))
  y += 4
  doc.rect(tx - 6, y - 6, 216, 30).fill('#1e4238')
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#ffffff')
  doc.text('TOTAL TTC', tx, y + 2, { width: 120, align: 'right' })
  doc.text(money(invoice.total, currency), tx + 125, y + 2, { width: 85, align: 'right' })
  y += 44

  if (paid > 0) {
    row('Montant payé', money(paid, currency))
    if (change > 0) row('Monnaie rendue', money(change, currency), true)
  }

  // ---- Notes ----
  if (invoice.notes) {
    y += 14
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#2c6652').text('NOTES', left, y)
    doc.font('Helvetica').fontSize(9.5).fillColor('#4b5563').text(invoice.notes, left, y + 15, { width: contentWidth })
  }

  // ---- Pied de page ----
  const footerY = doc.page.height - 70
  doc.moveTo(left, footerY - 12).lineTo(right, footerY - 12).strokeColor('#e5e7eb').stroke()
  doc.font('Helvetica').fontSize(8).fillColor('#9ca3af')
  doc.text(company.footerNote || 'Merci pour votre visite !', left, footerY, { width: contentWidth, align: 'center' })
  doc.text(`Généré le ${dateFR(new Date())}  •  ${company.name}`, left, footerY + 14, { width: contentWidth, align: 'center' })

  doc.end()
  return doc
}
