import { z } from 'zod'
import { ApiError } from '../lib/http'

const optionalText = (max = 500) => z.string().trim().max(max).optional().nullable().transform((v) => v || null)

export const loginSchema = z.object({
  email: z.string().trim().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Nom trop court').max(100),
  email: z.string().trim().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
  role: z.enum(['ADMIN', 'VENDEUR']).default('VENDEUR'),
})

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(['ADMIN', 'VENDEUR']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, '8 caractères minimum'),
})

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Nom trop court').max(150),
  sku: z.string().trim().min(1, 'Référence requise').max(50).transform((v) => v.toUpperCase()),
  description: optionalText(1000),
  category: optionalText(100),
  unit: z.string().trim().min(1).max(30).default('pièce'),
  purchasePrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().int().min(0).default(0),
  alertThreshold: z.coerce.number().int().min(0).default(5),
  isActive: z.boolean().default(true),
})

export const updateStockSchema = z.object({
  quantity: z.coerce.number().int().min(0),
  reason: z.string().trim().max(200).optional(),
})

export const invoiceItemSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().trim().min(1, 'Produit requis').max(150),
  sku: optionalText(50),
  quantity: z.coerce.number().int().positive('Quantité > 0'),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
})

export const invoiceSchema = z.object({
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'CANCELLED']).default('PAID'),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  discount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  notes: optionalText(2000),
  amountPaid: z.coerce.number().min(0).default(0),
  cashReceived: z.coerce.number().min(0).default(0),
  items: z.array(invoiceItemSchema).min(1, 'Au moins une ligne est requise'),
})

export const companySchema = z.object({
  name: z.string().trim().min(2).max(150),
  address: optionalText(300),
  city: optionalText(100),
  phone: optionalText(50),
  email: z.string().trim().email().optional().nullable().transform((v) => v || null),
  taxId: optionalText(100),
  currency: z.string().trim().min(1).max(10).default('FCFA'),
  invoicePrefix: z.string().trim().min(1).max(10).transform((v) => v.toUpperCase()),
  footerNote: optionalText(500),
  notificationEmail: z.string().trim().email('Email invalide').optional().nullable().transform((v) => v || null),
})

export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.') || 'champ'}: ${i.message}`).join('; ')
    throw new ApiError(400, message)
  }
  return result.data
}
