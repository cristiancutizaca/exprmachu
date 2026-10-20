'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore, useUIStore } from '@/store'
import Topbar from '@/components/layout/Topbar'
import Sidebar from '@/components/layout/Sidebar'
import Subbar from '@/components/layout/Subbar'
import { ConfirmModal, KeyboardShortcuts } from '@/components/layout/GlobalModals'
import { clsx } from 'clsx'
import { authApi } from '@/lib/api'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const token = useAuthStore(s => s.token)
  const hydrated = useAuthStore(s => s.hydrated)
  const setDrawerOpen = useUIStore(s => s.setDrawerOpen)
  const [authChecked, setAuthChecked] = useState(false)

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
      setAuthChecked(true)
      return
    }
    let active = true
    authApi.me()
      .then(() => { if (active) setAuthChecked(true) })
      .catch(() => {
        if (!active) return
        useAuthStore.getState().logout()
        setAuthChecked(false)
        router.replace('/login')
      })
    return () => { active = false }
  }, [hydrated, isAuthenticated, token, router, setDrawerOpen])

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

  if (!hydrated || !isAuthenticated || !authChecked) return null

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f0f2f5]">
      <Topbar/>
      <Subbar/>
      <KeyboardShortcuts/>
      <ConfirmModal/>
      <div className="flex flex-1 overflow-hidden mt-[92px]">
        <Sidebar currentPath={pathname}/>
        <main className={clsx(
          'flex-1 min-w-0 overflow-y-auto p-5 content-transition'
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}
