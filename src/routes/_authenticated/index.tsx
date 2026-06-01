import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { memo } from 'react'
import { getBets } from '@/features/bets/api'
import { getTransactions } from '@/features/wallet/api'
import { type Bet, type BetStatus } from '@/features/bets/schemas'
import { type Transaction } from '@/features/wallet/schemas'
import { PlaceBetForm } from '@/features/bets/components/PlaceBetForm'
import { QueryErrorCard } from '@/components/ui/QueryErrorCard'
import { useAuth } from '@/stores/auth'
import { formatEuro } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isApiError } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

const STATUS_LABELS: Record<BetStatus, string> = {
  win: 'Win',
  lost: 'Lost',
  canceled: 'Cancelled',
}

const STATUS_BADGE_CLASSES: Record<BetStatus, string> = {
  win: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  canceled: 'bg-gray-100 text-gray-600',
}

const TYPE_LABELS: Record<string, string> = {
  bet: 'Bet',
  win: 'Prize',
  cancel: 'Cancelled',
}

const TYPE_BADGE_CLASSES: Record<string, string> = {
  bet: 'bg-blue-100 text-blue-700',
  win: 'bg-green-100 text-green-700',
  cancel: 'bg-gray-100 text-gray-600',
}

function StatusBadge({ status }: { status: BetStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        STATUS_BADGE_CLASSES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        TYPE_BADGE_CLASSES[type] ?? 'bg-gray-100 text-gray-600',
      )}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  )
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded border border-gray-100 bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-20 shrink-0 rounded bg-gray-200" />
            <div className="h-4 w-14 shrink-0 rounded bg-gray-200" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="h-3 flex-1 rounded bg-gray-200" />
            <div className="h-3 w-12 shrink-0 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  )
}


const BetRow = memo(function BetRow({ bet }: { bet: Bet }) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-gray-500">{bet.id.slice(0, 8)}&hellip;</span>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">
        {bet.createdAt.toLocaleDateString('en-IE')}
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
        {formatEuro(bet.amount)}
      </td>
      <td className="px-3 py-2">
        <StatusBadge status={bet.status} />
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-500">
        {bet.winAmount !== null ? formatEuro(bet.winAmount) : '—'}
      </td>
    </tr>
  )
})

const TxRow = memo(function TxRow({ tx }: { tx: Transaction }) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-gray-500">{tx.id.slice(0, 8)}&hellip;</span>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">
        {tx.createdAt.toLocaleDateString('en-IE')}
      </td>
      <td className="px-3 py-2">
        <TypeBadge type={tx.type} />
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
        {formatEuro(tx.amount)}
      </td>
    </tr>
  )
})

const BetMiniCard = memo(function BetMiniCard({ bet }: { bet: Bet }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-500">{bet.id.slice(0, 8)}&hellip;</span>
          <StatusBadge status={bet.status} />
        </div>
        <span className="mt-0.5 block text-xs text-gray-400">{bet.createdAt.toLocaleDateString('en-IE')}</span>
      </div>
      <div className="shrink-0 text-right">
        <span className="block text-sm font-medium text-gray-900">{formatEuro(bet.amount)}</span>
        {bet.winAmount !== null && (
          <span className="block text-xs text-green-600">{formatEuro(bet.winAmount)}</span>
        )}
      </div>
    </div>
  )
})

const TxMiniCard = memo(function TxMiniCard({ tx }: { tx: Transaction }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2.5 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-500">{tx.id.slice(0, 8)}&hellip;</span>
          <TypeBadge type={tx.type} />
        </div>
        <span className="mt-0.5 block text-xs text-gray-400">{tx.createdAt.toLocaleDateString('en-IE')}</span>
      </div>
      <span className="shrink-0 text-sm font-medium text-gray-900">{formatEuro(tx.amount)}</span>
    </div>
  )
})

function BalanceCard() {
  const balance = useAuth((s) => s.balance)
  const user = useAuth((s) => s.user)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Balance</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{formatEuro(balance)}</p>
      {user && <p className="mt-1 text-sm text-gray-500">Welcome back, {user.name}!</p>}
    </div>
  )
}

const RECENT_PARAMS = { page: 1, limit: 5 }

function RecentBets() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-bets', RECENT_PARAMS],
    queryFn: () => getBets(RECENT_PARAMS),
  })

  function getErrorMessage() {
    if (isApiError(error)) return error.message
    if (error instanceof Error) return error.message
    return 'Failed to load bets.'
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Recent bets</h2>
        <Link
          to="/bets"
          search={{ page: 1, limit: 10 }}
          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          View all
        </Link>
      </div>
      <div className="p-4">
        {isLoading ? (
          <SectionSkeleton />
        ) : isError ? (
          <QueryErrorCard message={getErrorMessage()} onRetry={refetch} />
        ) : data?.data.length === 0 ? (
          <p className="text-sm text-gray-500">No bets yet — use the form above to place your first!</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th scope="col" className="px-3 pb-2">ID</th>
                    <th scope="col" className="px-3 pb-2">Date</th>
                    <th scope="col" className="px-3 pb-2 text-right">Amount</th>
                    <th scope="col" className="px-3 pb-2">Status</th>
                    <th scope="col" className="px-3 pb-2 text-right">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((bet) => (
                    <BetRow key={bet.id} bet={bet} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-1 md:hidden">
              {data?.data.map((bet) => (
                <BetMiniCard key={bet.id} bet={bet} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function RecentTransactions() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-transactions', RECENT_PARAMS],
    queryFn: () => getTransactions(RECENT_PARAMS),
  })

  function getErrorMessage() {
    if (isApiError(error)) return error.message
    if (error instanceof Error) return error.message
    return 'Failed to load transactions.'
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Recent transactions</h2>
        <Link
          to="/transactions"
          search={{ page: 1, limit: 10 }}
          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          View all
        </Link>
      </div>
      <div className="p-4">
        {isLoading ? (
          <SectionSkeleton />
        ) : isError ? (
          <QueryErrorCard message={getErrorMessage()} onRetry={refetch} />
        ) : data?.data.length === 0 ? (
          <p className="text-sm text-gray-500">No transactions yet — place a bet to see activity here.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th scope="col" className="px-3 pb-2">ID</th>
                    <th scope="col" className="px-3 pb-2">Date</th>
                    <th scope="col" className="px-3 pb-2">Type</th>
                    <th scope="col" className="px-3 pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((tx) => (
                    <TxRow key={tx.id} tx={tx} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-1 md:hidden">
              {data?.data.map((tx) => (
                <TxMiniCard key={tx.id} tx={tx} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BalanceCard />
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Place a bet</h2>
          <PlaceBetForm />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentBets />
        <RecentTransactions />
      </div>
    </div>
  )
}
