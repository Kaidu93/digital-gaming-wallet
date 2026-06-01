import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { memo, useState } from 'react'
import { z } from 'zod'
import { getTransactions } from '@/features/wallet/api'
import { transactionTypeSchema, type Transaction } from '@/features/wallet/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { QueryErrorCard } from '@/components/ui/QueryErrorCard'
import { formatEuro } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isApiError } from '@/lib/api'

const transactionSearchSchema = z.object({
  type: transactionTypeSchema.optional(),
  id: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
})

type TransactionSearch = z.infer<typeof transactionSearchSchema>

export const Route = createFileRoute('/_authenticated/transactions')({
  validateSearch: (search): TransactionSearch => transactionSearchSchema.parse(search),
  component: TransactionsPage,
})

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? 'Copied' : 'Copy ID'}
      title={copied ? 'Copied!' : 'Copy ID'}
      className="ml-1 rounded p-0.5 text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
    </button>
  )
}

const TransactionRow = memo(function TransactionRow({ tx }: { tx: Transaction }) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center">
          <span className="font-mono text-xs text-gray-600">{tx.id.slice(0, 8)}&hellip;</span>
          <CopyButton text={tx.id} />
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {tx.createdAt.toLocaleString('en-IE')}
      </td>
      <td className="px-4 py-3">
        <TypeBadge type={tx.type} />
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
        {formatEuro(tx.amount)}
      </td>
    </tr>
  )
})

const TransactionCard = memo(function TransactionCard({ tx }: { tx: Transaction }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center min-w-0">
          <span className="font-mono text-xs text-gray-500">{tx.id.slice(0, 8)}&hellip;</span>
          <CopyButton text={tx.id} />
        </div>
        <TypeBadge type={tx.type} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{tx.createdAt.toLocaleString('en-IE')}</span>
        <span className="text-sm font-semibold text-gray-900">{formatEuro(tx.amount)}</span>
      </div>
    </div>
  )
})

function SkeletonRows() {
  return (
    <>
      <div className="hidden animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3"><div className="h-3 w-6 rounded bg-gray-200" /></th>
              <th className="px-4 py-3"><div className="h-3 w-10 rounded bg-gray-200" /></th>
              <th className="px-4 py-3"><div className="h-3 w-8 rounded bg-gray-200" /></th>
              <th className="px-4 py-3"><div className="ml-auto h-3 w-14 rounded bg-gray-200" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200" /></td>
                <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200" /></td>
                <td className="px-4 py-3"><div className="h-5 w-16 rounded bg-gray-200" /></td>
                <td className="px-4 py-3"><div className="ml-auto h-4 w-16 rounded bg-gray-200" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="animate-pulse space-y-2 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-24 shrink-0 rounded bg-gray-200" />
              <div className="h-5 w-14 shrink-0 rounded bg-gray-200" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="h-4 w-16 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center">
        <p className="text-sm text-gray-500">No transactions match your filters.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">No transactions yet</p>
        <p className="mt-1 text-sm text-gray-500">Place a bet to generate your first transaction.</p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Place a bet
      </Link>
    </div>
  )
}

function TransactionsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [idInput, setIdInput] = useState(search.id ?? '')

  function updateSearch(updates: Partial<TransactionSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...updates }) })
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-transactions', search],
    queryFn: () => getTransactions(search),
  })

  const hasFilters = search.type !== undefined || !!search.id

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    updateSearch({
      type: val === '' ? undefined : (val as TransactionSearch['type']),
      page: 1,
    })
  }

  function handleIdSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateSearch({ id: idInput.trim() || undefined, page: 1 })
  }

  function getErrorMessage() {
    if (isApiError(error)) return error.message
    if (error instanceof Error) return error.message
    return 'Failed to load transactions.'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Transactions</h1>
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Back to dashboard"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="type-filter" className="text-xs font-medium text-gray-500">
            Type
          </label>
          <select
            id="type-filter"
            value={search.type ?? ''}
            onChange={handleTypeChange}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All types</option>
            <option value="bet">Bet</option>
            <option value="win">Prize</option>
            <option value="cancel">Cancelled</option>
          </select>
        </div>

        <form key={search.id ?? ''} onSubmit={handleIdSubmit} className="flex w-full flex-col gap-1 sm:w-auto">
          <label htmlFor="id-filter" className="text-xs font-medium text-gray-500">
            Transaction ID
          </label>
          <div className="flex gap-2">
            <Input
              id="id-filter"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="Filter by ID..."
              className="min-w-0 flex-1 sm:w-52 sm:flex-none"
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </div>
        </form>
      </div>

      {isLoading ? (
        <SkeletonRows />
      ) : isError ? (
        <QueryErrorCard message={getErrorMessage()} onRetry={refetch} />
      ) : data?.data.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {data?.data.map((tx) => (
              <TransactionCard key={tx.id} tx={tx} />
            ))}
          </div>

          <Pagination
            total={data?.total ?? 0}
            page={search.page}
            limit={search.limit}
            onChange={({ page, limit }) => updateSearch({ page, limit })}
          />
        </>
      )}
    </div>
  )
}
