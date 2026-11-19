'use client'
import { demoEnabled } from '@/lib/demo-session'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, useUIStore } from '@/store'
import Topbar from '@/components/layout/Topbar'
import Sidebar, { canAccessRoute, defaultRouteForRole } from '@/components/layout/Sidebar'
import Subbar from '@/components/layout/Subbar'
import { ConfirmModal, KeyboardShortcuts } from '@/components/layout/GlobalModals'
import { clsx } from 'clsx'
import { authApi } from '@/lib/api'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const token = useAuthStore(s => s.token)
  const user = useAuthStore(s => s.user)
  const hydrated = useAuthStore(s => s.hydrated)
  const setDrawerOpen = useUIStore(s => s.setDrawerOpen)
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState(false)
  const [attempt, retry] = useState(0)
  const authChecked = Boolean(token && verifiedToken === token)

  useEffect(() => {
    if (!hydrated) useAuthStore.setState({ hydrated: true })
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated || !token) {
      setDrawerOpen(false)
      router.replace('/login')
      return
    }
    if (token.startsWith('demo-')) {
      if (!demoEnabled) {
        useAuthStore.getState().logout()
        setVerifiedToken(null)
        router.replace('/login')
        return
      }
      setVerifiedToken(token)
      return
    }
    let active = true
    setSessionError(false)
    authApi.me()
      .then(({ data }) => {
        if (!active) return
        useAuthStore.setState({ user: data })
        setVerifiedToken(token)
      })
      .catch(error => {
        if (!active) return
        if (error.response?.status !== 401) { setSessionError(true); return }
        useAuthStore.getState().logout()
        setVerifiedToken(null)
        router.replace('/login')
      })
    return () => { active = false }
  }, [hydrated, isAuthenticated, token, router, setDrawerOpen, attempt])

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname, setDrawerOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setDrawerOpen])

  useEffect(() => {
    if (hydrated && isAuthenticated && authChecked && !canAccessRoute(user?.rol, pathname)) {
      router.replace(defaultRouteForRole(user?.rol))
    }
  }, [hydrated, isAuthenticated, authChecked, user?.rol, pathname, router])

  if (sessionError && isAuthenticated) return <div role="alert">No se pudo verificar la sesión. <button onClick={() => retry(n => n + 1)}>Reintentar</button></div>
  if (!hydrated || !isAuthenticated || !authChecked || !canAccessRoute(user?.rol, pathname)) return null

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-b from-[#f7fbff] via-[#eef4fb] to-[#e8f0f8]">
      <Topbar/>
      <Subbar/>
      <KeyboardShortcuts/>
      <ConfirmModal/>
      <div className="flex flex-1 overflow-hidden mt-[92px]">
        <Sidebar currentPath={pathname}/>
        <main key={user?.id} className={clsx(
          'flex-1 min-w-0 overflow-y-auto p-5 content-transition'
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}
