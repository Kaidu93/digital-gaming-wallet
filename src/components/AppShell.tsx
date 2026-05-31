import { Outlet } from '@tanstack/react-router'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main>
        <Outlet />
      </main>
    </div>
  )
}
