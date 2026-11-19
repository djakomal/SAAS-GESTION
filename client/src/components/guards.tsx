import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Layout } from '@/components/Layout'
import { PageLoader } from '@/components/ui'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return <Layout><Outlet /></Layout>
}

export function AdminRoute() {
  const { user } = useAuth()
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
