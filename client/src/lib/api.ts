import axios, { type AxiosRequestConfig } from 'axios'
import type {
  AppNotification,
  Company,
  DashboardData,
  Invoice,
  InvoiceInput,
  InvoiceStatus,
  Paginated,
  Product,
  ProductInput,
  User,
} from '@/types'

const TOKEN_KEY = 'stockflow_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message || error.message || 'Une erreur est survenue'
    if (status === 401 && !window.location.pathname.includes('/login')) {
      tokenStore.clear()
      window.location.assign('/login')
    }
    return Promise.reject(new Error(message))
  },
)

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<{ success: boolean; data: T; message?: string }>(config)
  return response.data.data
}

const qs = (params: Record<string, unknown>) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, String(value))
  })
  return search.toString()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: User }>({ url: '/auth/login', method: 'POST', data: { email, password } }),
    me: () => request<User>({ url: '/auth/me' }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<null>({ url: '/auth/change-password', method: 'POST', data: { currentPassword, newPassword } }),
  },
  dashboard: {
    get: () => request<DashboardData>({ url: '/dashboard' }),
  },
  products: {
    list: (params: Record<string, unknown> = {}) => request<Paginated<Product>>({ url: `/products?${qs(params)}` }),
    get: (id: string) => request<Product & { movements: unknown[] }>({ url: `/products/${id}` }),
    create: (data: ProductInput) => request<Product>({ url: '/products', method: 'POST', data }),
    update: (id: string, data: Partial<ProductInput>) => request<Product>({ url: `/products/${id}`, method: 'PUT', data }),
    setStock: (id: string, quantity: number, reason?: string) =>
      request<Product>({ url: `/products/${id}/stock`, method: 'PATCH', data: { quantity, reason } }),
    remove: (id: string) => request<null>({ url: `/products/${id}`, method: 'DELETE' }),
  },
  invoices: {
    list: (params: Record<string, unknown> = {}) => request<Paginated<Invoice>>({ url: `/invoices?${qs(params)}` }),
    get: (id: string) => request<Invoice>({ url: `/invoices/${id}` }),
    create: (data: InvoiceInput) => request<Invoice>({ url: '/invoices', method: 'POST', data }),
    update: (id: string, data: InvoiceInput) => request<Invoice>({ url: `/invoices/${id}`, method: 'PUT', data }),
    changeStatus: (id: string, status: InvoiceStatus) =>
      request<Invoice>({ url: `/invoices/${id}/status`, method: 'PATCH', data: { status } }),
    remove: (id: string) => request<null>({ url: `/invoices/${id}`, method: 'DELETE' }),
    pdfUrl: (id: string) => `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/invoices/${id}/pdf`,
    receiptUrl: (id: string, autoprint = false) =>
      `${import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}/invoices/${id}/receipt${autoprint ? '?autoprint=1' : ''}`,
  },
  users: {
    list: () => request<User[]>({ url: '/users' }),
    create: (data: { name: string; email: string; password: string; role: string }) =>
      request<User>({ url: '/users', method: 'POST', data }),
    update: (id: string, data: Partial<User & { password?: string }>) =>
      request<User>({ url: `/users/${id}`, method: 'PUT', data }),
    remove: (id: string) => request<null>({ url: `/users/${id}`, method: 'DELETE' }),
  },
  company: {
    get: () => request<Company>({ url: '/company' }),
    update: (data: Partial<Company>) => request<Company>({ url: '/company', method: 'PUT', data }),
  },
  notifications: {
    list: (limit = 50) => request<{ items: AppNotification[]; unread: number }>({ url: `/notifications?limit=${limit}` }),
    markRead: (id: string) => request<{ id: string; isRead: boolean }>({ url: `/notifications/${id}/read`, method: 'PATCH' }),
    markAllRead: () => request<{ updated: number }>({ url: '/notifications/read-all', method: 'POST' }),
    remove: (id: string) => request<null>({ url: `/notifications/${id}`, method: 'DELETE' }),
    testEmail: (to: string) => request<{ sent: boolean }>({ url: '/notifications/test-email', method: 'POST', data: { to } }),
    generateDailyReport: () => request<null>({ url: '/notifications/daily-report', method: 'POST' }),
  },
}

/** Envoie le ticket 80 mm à l'imprimante (imprimante thermique / de facturation). */
export async function printReceipt(id: string) {
  const response = await http.get<string>(`/invoices/${id}/receipt`, { responseType: 'text' })
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;left:-99999px;top:0;width:1px;height:1px;border:0;'
  document.body.appendChild(iframe)
  const frameWindow = iframe.contentWindow
  if (!frameWindow) throw new Error('Impossible d\'ouvrir le ticket')
  frameWindow.document.open()
  frameWindow.document.write(response.data)
  frameWindow.document.close()
  frameWindow.focus()
  frameWindow.print()
  frameWindow.addEventListener('afterprint', () => iframe.remove(), { once: true })
}

export async function downloadInvoicePdf(id: string, number: string) {
  const response = await http.get<Blob>(`/invoices/${id}/pdf`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = `facture-${number}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
