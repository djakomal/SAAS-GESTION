import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, Package, FileText, Settings, LogOut, Menu, X,
  ShoppingBag, ChevronDown, Shield, UserCircle, KeyRound, Bell,
  AlertTriangle, Receipt, ClipboardList, CheckCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import type { NotificationType } from '@/types'

const navItems = [
  { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/products', label: 'Produits & Stock', icon: Package },
  { to: '/invoices', label: 'Ventes & Factures', icon: FileText },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

const adminItems = [
  { to: '/users', label: 'Utilisateurs', icon: Shield },
  { to: '/settings', label: 'Paramètres', icon: Settings },
]

const notificationIcons: Record<NotificationType, typeof Bell> = {
  LOW_STOCK: AlertTriangle,
  NEW_SALE: Receipt,
  DAILY_REPORT: ClipboardList,
  SYSTEM: Bell,
}

function NotificationBell() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications.list(8),
    refetchInterval: 60_000,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
  const markAll = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Toutes les notifications sont lues')
    },
  })

  const unread = data?.unread ?? 0
  const items = data?.items ?? []

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
        title="Notifications"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-slate-200 shadow-xl z-40 animate-in overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                <p className="text-[11px] text-slate-400">{unread} non lue{unread > 1 ? 's' : ''}</p>
              </div>
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} className="text-[11px] font-semibold text-brand-600 hover:underline flex items-center gap-1">
                  <CheckCheck size={13} /> Tout lire
                </button>
              )}
            </div>
            <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100">
              {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">Aucune notification</p>}
              {items.map((n) => {
                const Icon = notificationIcons[n.type] ?? Bell
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id)
                      setOpen(false)
                      if (n.reference && n.type === 'LOW_STOCK') navigate(`/products/${n.reference}`)
                      else if (n.reference && n.type === 'NEW_SALE') navigate(`/invoices/${n.reference}`)
                      else navigate('/notifications')
                    }}
                    className={`w-full flex gap-3 px-4 py-3 text-left hover:bg-slate-50 transition ${!n.isRead ? 'bg-brand-50/40' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'LOW_STOCK' ? 'bg-amber-50 text-amber-600' : n.type === 'NEW_SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">{n.title}</span>
                        {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <Link to="/notifications" onClick={() => setOpen(false)} className="block text-center py-2.5 text-xs font-semibold text-brand-600 hover:bg-slate-50 border-t border-slate-100">
              Voir toutes les notifications
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Déconnecté')
    navigate('/login')
  }

  const renderLinks = (items: typeof navItems) =>
    items.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            isActive ? 'bg-brand-600/15 text-white shadow-inner' : 'text-brand-100/70 hover:bg-white/10 hover:text-white'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon size={19} className={isActive ? 'text-brand-300' : ''} />
            <span>{label}</span>
            {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-300" />}
          </>
        )}
      </NavLink>
    ))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 h-[72px] border-b border-white/10">
        <div className="w-10 h-10 bg-gradient-to-br from-brand-300 to-brand-500 rounded-xl flex items-center justify-center shadow-lg">
          <ShoppingBag size={22} className="text-white" />
        </div>
        <div>
          <div className="text-white font-extrabold text-lg tracking-tight leading-none">StockFlow</div>
          <div className="text-brand-200/60 text-[10px] uppercase tracking-widest mt-1">Gestion commerciale</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-brand-200/40">Menu principal</div>
        {renderLinks(navItems)}
        {user?.role === 'ADMIN' && (
          <>
            <div className="px-3 pt-6 pb-2 text-[10px] font-bold uppercase tracking-widest text-brand-200/40">Administration</div>
            {renderLinks(adminItems)}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/10">
        <NavLink to="/profile" onClick={onNavigate} className={({ isActive }) => `flex items-center gap-3 px-2.5 py-2 rounded-lg transition ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}>
          <div className="w-9 h-9 rounded-full bg-brand-500/40 border border-brand-400/30 flex items-center justify-center text-brand-100 font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
            <div className="text-[11px] text-brand-200/60">{user?.role === 'ADMIN' ? 'Administrateur' : 'Vendeur'}</div>
          </div>
          <ChevronDown size={15} className="text-brand-200/50" />
        </NavLink>
        <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 mt-1 rounded-lg text-sm font-medium text-brand-100/60 hover:bg-rose-500/15 hover:text-rose-200 transition">
          <LogOut size={18} /> Déconnexion
        </button>
      </div>
    </div>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const titles: Record<string, string> = {
    '/dashboard': 'Tableau de bord',
    '/products': 'Produits & Stock',
    '/invoices': 'Ventes & Factures',
    '/notifications': 'Notifications',
    '/users': 'Utilisateurs',
    '/settings': 'Paramètres',
    '/profile': 'Mon profil',
  }
  const title = titles[location.pathname] ?? 'StockFlow'

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[260px] bg-[#1e4238] z-30 flex-col">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[270px] bg-[#1e4238] animate-in">
            <button className="absolute top-4 right-3 p-2 text-white/70" onClick={() => setMobileOpen(false)}><X size={20} /></button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 h-[72px] bg-white/90 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-7">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100" onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
            <div>
              <h2 className="font-bold text-slate-800 text-base sm:text-lg">{title}</h2>
              <p className="hidden sm:block text-[11px] text-slate-400">Bienvenue, {user?.name?.split(' ')[0]} 👋</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Système opérationnel
            </div>
            <NotificationBell />
            <div className="relative">
              <button onClick={() => setUserMenu((v) => !v)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              {userMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 animate-in">
                  <button onClick={() => { setUserMenu(false); navigate('/profile') }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><UserCircle size={16} /> Mon profil</button>
                  <button onClick={() => { setUserMenu(false); navigate('/settings') }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-slate-600 hover:bg-slate-50"><KeyRound size={16} /> Paramètres</button>
                  <div className="my-1 border-t border-slate-100" />
                  <button onClick={() => { logout(); navigate('/login') }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-rose-600 hover:bg-rose-50"><LogOut size={16} /> Déconnexion</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-7 max-w-[1500px] mx-auto">{children}</main>
      </div>
    </div>
  )
}
