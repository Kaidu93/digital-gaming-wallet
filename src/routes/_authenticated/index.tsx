import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({
  component: () => <div>Digital Gaming Wallet</div>,
})
