import { useEffect } from 'react'
import { Outlet, useRouter } from '@tanstack/react-router'
import { useAuth } from '@/stores/auth'
import { formatEuro } from '@/lib/format'
import { Button } from '@/components/ui/button'

export default function AppShell() {
  const user = useAuth((s) => s.user)
  const balance = useAuth((s) => s.balance)
  const token = useAuth((s) => s.token)
  const logout = useAuth((s) => s.logout)
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      router.navigate({ to: '/login' })
    }
  }, [token, router])

  function handleLogout() {
    logout()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <span className="min-w-0 truncate text-sm font-medium text-gray-700">{user?.name}</span>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-sm font-semibold text-gray-900" aria-live="polite" aria-atomic="true">
              <span className="hidden sm:inline">Balance: </span>
              {formatEuro(balance)}
            </span>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
