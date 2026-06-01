import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { memo, useEffect, useState } from 'react'
import { z } from 'zod'
import { getBets } from '@/features/bets/api'
import { betStatusSchema, type Bet, type BetStatus } from '@/features/bets/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { formatEuro } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isApiError } from '@/lib/api'

const betSearchSchema = z.object({
  status: betStatusSchema.optional(),
  id: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
})

type BetSearch = z.infer<typeof betSearchSchema>

export const Route = createFileRoute('/_authenticated/bets')({
  validateSearch: (search): BetSearch => betSearchSchema.parse(search),
  component: BetsPage,
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

const BetRow = memo(function BetRow({ bet }: { bet: Bet }) {
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center">
          <span className="font-mono text-xs text-gray-600">{bet.id.slice(0, 8)}&hellip;</span>
          <CopyButton text={bet.id} />
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {bet.createdAt.toLocaleString('en-IE')}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
        {formatEuro(bet.amount)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={bet.status} />
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-600">
        {bet.winAmount !== null ? formatEuro(bet.winAmount) : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          variant="destructive"
          disabled={bet.status === 'canceled'}
          aria-disabled={bet.status === 'canceled'}
          onClick={undefined}
          className="text-xs"
        >
          Cancel
        </Button>
      </td>
    </tr>
  )
})

const BetCard = memo(function BetCard({ bet }: { bet: Bet }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center min-w-0">
          <span className="font-mono text-xs text-gray-500">{bet.id.slice(0, 8)}&hellip;</span>
          <CopyButton text={bet.id} />
        </div>
        <StatusBadge status={bet.status} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">{bet.createdAt.toLocaleString('en-IE')}</span>
        <span className="text-sm font-semibold text-gray-900">{formatEuro(bet.amount)}</span>
      </div>
      {bet.winAmount !== null && (
        <div className="mt-1 text-right text-xs text-green-600">
          Prize: {formatEuro(bet.winAmount)}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <Button
          variant="destructive"
          disabled={bet.status === 'canceled'}
          aria-disabled={bet.status === 'canceled'}
          onClick={undefined}
          className="text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
})

function SkeletonRows() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 rounded-lg border border-gray-100 bg-white p-4">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-36 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="ml-auto h-4 w-20 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center">
      <p className="text-sm text-gray-500">No bets found.</p>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
      {message}
    </div>
  )
}

function BetsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [idInput, setIdInput] = useState(search.id ?? '')

  useEffect(() => {
    setIdInput(search.id ?? '')
  }, [search.id])

  function updateSearch(updates: Partial<BetSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...updates }) })
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-bets', search],
    queryFn: () => getBets(search),
  })

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    updateSearch({
      status: val === '' ? undefined : (val as BetStatus),
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
    return 'Failed to load bets.'
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Bets</h1>

      <div className="flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="status-filter" className="text-xs font-medium text-gray-500">
            Status
          </label>
          <select
            id="status-filter"
            value={search.status ?? ''}
            onChange={handleStatusChange}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All statuses</option>
            <option value="win">Win</option>
            <option value="lost">Lost</option>
            <option value="canceled">Cancelled</option>
          </select>
        </div>

        <form onSubmit={handleIdSubmit} className="flex flex-col gap-1">
          <label htmlFor="id-filter" className="text-xs font-medium text-gray-500">
            Bet ID
          </label>
          <div className="flex gap-2">
            <Input
              id="id-filter"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="Filter by ID..."
              className="w-52"
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
        <ErrorState message={getErrorMessage()} />
      ) : data?.data.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3">ID</th>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">Prize</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((bet) => (
                  <BetRow key={bet.id} bet={bet} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {data?.data.map((bet) => (
              <BetCard key={bet.id} bet={bet} />
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
