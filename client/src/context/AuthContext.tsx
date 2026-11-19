import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from '@/lib/api'
import type { User } from '@/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = tokenStore.get()
    if (!token) {
      setLoading(false)
      return
    }
    api.auth
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { token, user: loggedIn } = await api.auth.login(email, password)
    tokenStore.set(token)
    setUser(loggedIn)
  }

  const logout = () => {
    tokenStore.clear()
    setUser(null)
  }

  const refresh = async () => {
    try {
      setUser(await api.auth.me())
    } catch {
      /* ignore */
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}
