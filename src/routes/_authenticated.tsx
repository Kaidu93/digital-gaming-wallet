import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuth } from '@/stores/auth'
import AppShell from '@/components/AppShell'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!useAuth.getState().token) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <AppShell />
}
