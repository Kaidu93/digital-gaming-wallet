import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { memo, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { cancelBet, getBets } from '@/features/bets/api'
import { betStatusSchema, type Bet, type BetStatus } from '@/features/bets/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { QueryErrorCard } from '@/components/ui/QueryErrorCard'
import { formatEuro } from '@/lib/format'
import { useLocale } from '@/i18n'
import { cn } from '@/lib/utils'
import { isApiError } from '@/lib/api'
import { useAuth } from '@/stores/auth'

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

const STATUS_BADGE_CLASSES: Record<BetStatus, string> = {
  win: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  canceled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

function StatusBadge({ status }: { status: BetStatus }) {
  const { t } = useTranslation('bets')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        STATUS_BADGE_CLASSES[status],
      )}
    >
      {t(`status_${status}`)}
    </span>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const { t } = useTranslation('common')

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
      aria-label={copied ? t('copied') : t('copyId')}
      title={copied ? t('copiedTitle') : t('copyId')}
      className="ml-1 rounded p-0.5 text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-500 dark:hover:text-gray-300"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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

function CancelBetButton({ bet }: { bet: Bet }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const setBalance = useAuth((s) => s.setBalance)
  const { t } = useTranslation('bets')

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [isOpen])

  function closeDialog() {
    setIsOpen(false)
    setCancelError(null)
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () => cancelBet(bet.id),
    onSuccess: (data) => {
      setBalance(data.balance)
      queryClient.invalidateQueries({ queryKey: ['my-bets'] })
      queryClient.invalidateQueries({ queryKey: ['my-transactions'] })
      closeDialog()
    },
    onError: (err) => {
      if (isApiError(err) && err.status === 401) return;
      if (isApiError(err)) {
        setCancelError(err.message)
      } else if (err instanceof Error) {
        setCancelError(err.message)
      } else {
        setCancelError(t('failedToCancel'))
      }
    },
  })

  const isDisabled = bet.status === 'canceled'

  return (
    <>
      <Button
        variant="destructive"
        disabled={isDisabled}
        aria-disabled={isDisabled}
        onClick={() => setIsOpen(true)}
        className="text-xs"
      >
        {t('cancelAction')}
      </Button>

      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
        onCancel={() => setIsOpen(false)}
        onClick={(e) => { if (e.target === dialogRef.current) closeDialog() }}
        className="m-auto w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-left shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-900"
      >
        <h2 id="cancel-dialog-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('cancelTitle')}</h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('cancelDescription', { id: `${bet.id.slice(0, 8)}…` })}
          {bet.status === 'lost' && t('stakeRefunded')}
        </p>
        {cancelError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {cancelError}
          </p>
        )}
        <div className="mt-4 flex justify-between gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            autoFocus
          >
            {t('keepBet')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => mutate()}
            disabled={isPending}
          >
            {isPending ? t('cancelling') : t('confirmCancel')}
          </Button>
        </div>
      </dialog>
    </>
  )
}

const BetRow = memo(function BetRow({ bet, index }: { bet: Bet; index: number }) {
  const locale = useLocale()
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.tr
      className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.18, delay: index * 0.04 }}
    >
      <td className="px-4 py-3">
        <div className="flex items-center">
          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{bet.id.slice(0, 8)}&hellip;</span>
          <CopyButton text={bet.id} />
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {bet.createdAt.toLocaleString(locale)}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
        {formatEuro(bet.amount, locale)}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={bet.status} />
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
        {bet.winAmount !== null ? formatEuro(bet.winAmount, locale) : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <CancelBetButton bet={bet} />
      </td>
    </motion.tr>
  )
})

const BetCard = memo(function BetCard({ bet, index }: { bet: Bet; index: number }) {
  const { t } = useTranslation('bets')
  const locale = useLocale()
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.div
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.2, delay: index * 0.05 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center">
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{bet.id.slice(0, 8)}&hellip;</span>
          <CopyButton text={bet.id} />
        </div>
        <StatusBadge status={bet.status} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">{bet.createdAt.toLocaleString(locale)}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatEuro(bet.amount, locale)}</span>
      </div>
      {bet.winAmount !== null && (
        <div className="mt-1 text-right text-xs text-green-600 dark:text-green-400">
          {t('prizeBadge', { amount: formatEuro(bet.winAmount, locale) })}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <CancelBetButton bet={bet} />
      </div>
    </motion.div>
  )
})

function SkeletonRows() {
  return (
    <>
      <div className="hidden animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white md:block dark:border-gray-700 dark:bg-gray-900">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3"><div className="h-3 w-6 rounded bg-gray-200 dark:bg-gray-700" /></th>
              <th className="px-4 py-3"><div className="h-3 w-10 rounded bg-gray-200 dark:bg-gray-700" /></th>
              <th className="px-4 py-3"><div className="ml-auto h-3 w-14 rounded bg-gray-200 dark:bg-gray-700" /></th>
              <th className="px-4 py-3"><div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" /></th>
              <th className="px-4 py-3"><div className="ml-auto h-3 w-10 rounded bg-gray-200 dark:bg-gray-700" /></th>
              <th className="px-4 py-3"><div className="ml-auto h-3 w-14 rounded bg-gray-200 dark:bg-gray-700" /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3"><div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" /></td>
                <td className="px-4 py-3"><div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" /></td>
                <td className="px-4 py-3"><div className="ml-auto h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" /></td>
                <td className="px-4 py-3"><div className="h-5 w-14 rounded bg-gray-200 dark:bg-gray-700" /></td>
                <td className="px-4 py-3"><div className="ml-auto h-4 w-12 rounded bg-gray-200 dark:bg-gray-700" /></td>
                <td className="px-4 py-3"><div className="ml-auto h-7 w-16 rounded bg-gray-200 dark:bg-gray-700" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="animate-pulse space-y-2 md:hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-4">
              <div className="h-4 w-24 shrink-0 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-14 shrink-0 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-4">
              <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="mt-3 flex justify-end">
              <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const { t } = useTranslation(['bets', 'common'])
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('bets:noBetsMatchFilters')}</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-400 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('bets:noBetsYet')}</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('bets:noBetsYetCta')}</p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        {t('common:placeABet')}
      </Link>
    </div>
  )
}

function BetsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [idInput, setIdInput] = useState(search.id ?? '')
  const { t } = useTranslation(['bets', 'common'])

  function updateSearch(updates: Partial<BetSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...updates }) })
  }

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-bets', search],
    queryFn: () => getBets(search),
  })

  const hasFilters = search.status !== undefined || !!search.id

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
    return t('bets:failedToLoad')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{t('bets:bets')}</h1>
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label={t('common:backToDashboard')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          {t('common:dashboard')}
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col gap-1">
          <label htmlFor="status-filter" className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('common:status')}
          </label>
          <select
            id="status-filter"
            value={search.status ?? ''}
            onChange={handleStatusChange}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">{t('bets:allStatuses')}</option>
            <option value="win">{t('bets:status_win')}</option>
            <option value="lost">{t('bets:status_lost')}</option>
            <option value="canceled">{t('bets:status_canceled')}</option>
          </select>
        </div>

        <form key={search.id ?? ''} onSubmit={handleIdSubmit} className="flex w-full flex-col gap-1 sm:w-auto">
          <label htmlFor="id-filter" className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('bets:betId')}
          </label>
          <div className="flex gap-2">
            <Input
              id="id-filter"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder={t('common:filterById')}
              className="min-w-0 flex-1 sm:w-52 sm:flex-none"
            />
            <Button type="submit" variant="secondary">
              {t('common:search')}
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
          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block dark:border-gray-700 dark:bg-gray-900">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th scope="col" className="px-4 py-3">{t('common:id')}</th>
                  <th scope="col" className="px-4 py-3">{t('common:date')}</th>
                  <th scope="col" className="px-4 py-3 text-right">{t('common:amount')}</th>
                  <th scope="col" className="px-4 py-3">{t('common:status')}</th>
                  <th scope="col" className="px-4 py-3 text-right">{t('common:prize')}</th>
                  <th scope="col" className="px-4 py-3 text-right">{t('common:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((bet, index) => (
                  <BetRow key={bet.id} bet={bet} index={index} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            {data?.data.map((bet, index) => (
              <BetCard key={bet.id} bet={bet} index={index} />
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
