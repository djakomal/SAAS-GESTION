import type { Company, Invoice, InvoiceItem } from '@prisma/client'

type FullInvoice = Invoice & { items: InvoiceItem[]; user?: { name: string } | null }

const esc = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const money = (value: unknown, currency: string) =>
  `${new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(value))} ${currency}`

const dateFR = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

/** Génère un ticket de caisse 80 mm prêt pour l'impression (imprimante thermique). */
export function generateReceiptHtml(invoice: FullInvoice, company: Company, autoprint: boolean): string {
  const currency = company.currency || 'FCFA'
  const paid = Number(invoice.cashReceived) > 0 ? Number(invoice.cashReceived) : Number(invoice.amountPaid)
  const change = Math.max(0, paid - Number(invoice.total))
  const statusLabel: Record<string, string> = {
    PAID: 'PAYÉ', SENT: 'ENVOYÉE', DRAFT: 'BROUILLON', CANCELLED: 'ANNULÉE',
  }

  const rows = invoice.items
    .map(
      (item) => `
        <div class="item">
          <div class="item-name">${esc(item.productName)}</div>
          <div class="item-detail">${item.quantity} x ${money(item.unitPrice, currency)}</div>
          <div class="item-total">${money(item.lineTotal, currency)}</div>
        </div>`,
    )
    .join('')

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Ticket ${esc(invoice.number)}</title>
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 3mm 3mm 5mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      line-height: 1.3;
      color: #000;
    }
    .center { text-align: center; }
    .shop { font-size: 15pt; font-weight: 900; text-transform: uppercase; letter-spacing: -0.3px; }
    .shop-info { font-size: 8.5pt; margin-top: 1mm; }
    .sep { border-top: 1px dashed #000; margin: 3mm 0; }
    .sep-solid { border-top: 1px solid #000; margin: 2.5mm 0; }
    .meta { font-size: 9pt; display: flex; justify-content: space-between; }
    .item { margin: 2.5mm 0; }
    .item-name { font-weight: bold; font-size: 10pt; }
    .item-detail { font-size: 8.5pt; padding-left: 3mm; }
    .item-total { text-align: right; font-size: 9.5pt; }
    .line { display: flex; justify-content: space-between; font-size: 9pt; margin: 1mm 0; }
    .total-row { display: flex; justify-content: space-between; font-size: 13pt; font-weight: 900; margin-top: 2mm; }
    .paid-box { border: 2px solid #000; padding: 2.5mm; margin-top: 3mm; text-align: center; }
    .paid-label { font-size: 8pt; text-transform: uppercase; }
    .paid-value { font-size: 16pt; font-weight: 900; }
    .footer { text-align: center; font-size: 8pt; margin-top: 4mm; }
    .barcode {
      height: 12mm;
      margin: 4mm auto 1mm;
      width: 90%;
      background-image: repeating-linear-gradient(90deg, #000 0 1px, #fff 1px 3px, #000 3px 5px, #fff 5px 6px, #000 6px 9px, #fff 9px 11px);
    }
    .barcode-text { text-align: center; font-size: 8pt; letter-spacing: 1px; }
    .no-print { position: fixed; top: 6mm; right: 6mm; }
    .no-print button {
      font-family: Arial, sans-serif; font-size: 12px; padding: 8px 14px;
      border: 0; border-radius: 6px; background: #1e4238; color: #fff; cursor: pointer;
    }
    @media print {
      .no-print { display: none !important; }
      body { width: 80mm; }
    }
  </style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">🖨️ Imprimer le ticket</button></div>

  <div class="center shop">${esc(company.name)}</div>
  <div class="center shop-info">
    ${company.address ? `${esc(company.address)}<br />` : ''}
    ${company.city ? `${esc(company.city)}<br />` : ''}
    ${company.phone ? `Tél : ${esc(company.phone)}<br />` : ''}
    ${company.taxId ? `${esc(company.taxId)}<br />` : ''}
  </div>

  <div class="sep"></div>

  <div class="meta"><span>${esc(invoice.number)}</span><span>${dateFR(invoice.issueDate)}</span></div>
  <div class="meta"><span>Statut : ${statusLabel[invoice.status] ?? esc(invoice.status)}</span><span>${esc(invoice.user?.name ?? '')}</span></div>

  <div class="sep"></div>

  ${rows}

  <div class="sep"></div>

  <div class="line"><span>Sous-total</span><span>${money(invoice.subtotal, currency)}</span></div>
  ${Number(invoice.discount) > 0 ? `<div class="line"><span>Remise</span><span>- ${money(invoice.discount, currency)}</span></div>` : ''}
  ${Number(invoice.taxRate) > 0 ? `<div class="line"><span>TVA (${Number(invoice.taxRate)}%)</span><span>${money(invoice.taxAmount, currency)}</span></div>` : ''}
  <div class="total-row"><span>TOTAL TTC</span><span>${money(invoice.total, currency)}</span></div>

  ${paid > 0 ? `
  <div class="paid-box">
    <div class="paid-label">Montant payé</div>
    <div class="paid-value">${money(paid, currency)}</div>
    ${change > 0 ? `<div class="paid-label">Monnaie rendue : ${money(change, currency)}</div>` : ''}
  </div>` : ''}

  ${invoice.notes ? `<div class="center" style="margin-top:3mm;font-size:8pt;">${esc(invoice.notes)}</div>` : ''}

  <div class="footer">${esc(company.footerNote || 'Merci pour votre visite !')}</div>

  <div class="barcode"></div>
  <div class="barcode-text">${esc(invoice.number)}</div>

  ${autoprint ? '<script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 250); });</script>' : ''}
</body>
</html>`
}
