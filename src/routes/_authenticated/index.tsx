import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { memo, useEffect } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { getBets } from '@/features/bets/api'
import { getTransactions } from '@/features/wallet/api'
import { type Bet, type BetStatus } from '@/features/bets/schemas'
import { type Transaction } from '@/features/wallet/schemas'
import { PlaceBetForm } from '@/features/bets/components/PlaceBetForm'
import { QueryErrorCard } from '@/components/ui/QueryErrorCard'
import { useAuth } from '@/stores/auth'
import { formatEuro } from '@/lib/format'
import { useLocale } from '@/i18n'
import { cn } from '@/lib/utils'
import { isApiError } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
})

const STATUS_BADGE_CLASSES: Record<BetStatus, string> = {
  win: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  canceled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

const TYPE_BADGE_CLASSES: Record<string, string> = {
  bet: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  win: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancel: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
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

function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation('wallet')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium',
        TYPE_BADGE_CLASSES[type] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      )}
    >
      {t(`type_${type}`, type)}
    </span>
  )
}

function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-3">
            <div className="h-4 w-20 shrink-0 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-14 shrink-0 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="h-3 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-12 shrink-0 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
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
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{bet.id.slice(0, 8)}&hellip;</span>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
        {bet.createdAt.toLocaleDateString(locale)}
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
        {formatEuro(bet.amount, locale)}
      </td>
      <td className="px-3 py-2">
        <StatusBadge status={bet.status} />
      </td>
      <td className="px-3 py-2 text-right text-sm text-gray-500 dark:text-gray-400">
        {bet.winAmount !== null ? formatEuro(bet.winAmount, locale) : '—'}
      </td>
    </motion.tr>
  )
})

const TxRow = memo(function TxRow({ tx, index }: { tx: Transaction; index: number }) {
  const locale = useLocale()
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.tr
      className="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.18, delay: index * 0.04 }}
    >
      <td className="px-3 py-2">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{tx.id.slice(0, 8)}&hellip;</span>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
        {tx.createdAt.toLocaleDateString(locale)}
      </td>
      <td className="px-3 py-2">
        <TypeBadge type={tx.type} />
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
        {formatEuro(tx.amount, locale)}
      </td>
    </motion.tr>
  )
})

const BetMiniCard = memo(function BetMiniCard({ bet, index }: { bet: Bet; index: number }) {
  const locale = useLocale()
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.div
      className="flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2.5 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.18, delay: index * 0.04 }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{bet.id.slice(0, 8)}&hellip;</span>
          <StatusBadge status={bet.status} />
        </div>
        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{bet.createdAt.toLocaleDateString(locale)}</span>
      </div>
      <div className="shrink-0 text-right">
        <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{formatEuro(bet.amount, locale)}</span>
        {bet.winAmount !== null && (
          <span className="block text-xs text-green-600 dark:text-green-400">{formatEuro(bet.winAmount, locale)}</span>
        )}
      </div>
    </motion.div>
  )
})

const TxMiniCard = memo(function TxMiniCard({ tx, index }: { tx: Transaction; index: number }) {
  const locale = useLocale()
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.div
      className="flex items-center justify-between gap-3 rounded border border-gray-100 px-3 py-2.5 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0.1 } : { duration: 0.18, delay: index * 0.04 }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{tx.id.slice(0, 8)}&hellip;</span>
          <TypeBadge type={tx.type} />
        </div>
        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{tx.createdAt.toLocaleDateString(locale)}</span>
      </div>
      <span className="shrink-0 text-sm font-medium text-gray-900 dark:text-gray-100">{formatEuro(tx.amount, locale)}</span>
    </motion.div>
  )
})

function BalanceCard() {
  const balance = useAuth((s) => s.balance)
  const user = useAuth((s) => s.user)
  const { t } = useTranslation('common')
  const locale = useLocale()
  const shouldReduceMotion = useReducedMotion()

  const springBalance = useSpring(balance, {
    damping: shouldReduceMotion ? 100 : 25,
    stiffness: shouldReduceMotion ? 10000 : 200,
  })
  const formattedBalance = useTransform(springBalance, (v) => formatEuro(v, locale))

  useEffect(() => {
    springBalance.set(balance)
  }, [balance, locale, springBalance])

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('balance')}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        <motion.span>{formattedBalance}</motion.span>
      </p>
      {user && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('welcomeBack', { name: user.name })}</p>}
    </div>
  )
}

const RECENT_PARAMS = { page: 1, limit: 5 }

function RecentBets() {
  const { t } = useTranslation(['bets', 'common'])
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-bets', RECENT_PARAMS],
    queryFn: () => getBets(RECENT_PARAMS),
  })

  function getErrorMessage() {
    if (isApiError(error)) return error.message
    if (error instanceof Error) return error.message
    return t('bets:failedToLoad')
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('bets:recentBets')}</h2>
        <Link
          to="/bets"
          search={{ page: 1, limit: 10 }}
          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          {t('common:viewAll')}
        </Link>
      </div>
      <div className="p-4">
        {isLoading ? (
          <SectionSkeleton />
        ) : isError ? (
          <QueryErrorCard message={getErrorMessage()} onRetry={refetch} />
        ) : data?.data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('bets:noBetsOnDashboard')}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-3 pb-2">{t('common:id')}</th>
                    <th scope="col" className="px-3 pb-2">{t('common:date')}</th>
                    <th scope="col" className="px-3 pb-2 text-right">{t('common:amount')}</th>
                    <th scope="col" className="px-3 pb-2">{t('common:status')}</th>
                    <th scope="col" className="px-3 pb-2 text-right">{t('common:prize')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((bet, index) => (
                    <BetRow key={bet.id} bet={bet} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-1 md:hidden">
              {data?.data.map((bet, index) => (
                <BetMiniCard key={bet.id} bet={bet} index={index} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function RecentTransactions() {
  const { t } = useTranslation(['wallet', 'common'])
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['my-transactions', RECENT_PARAMS],
    queryFn: () => getTransactions(RECENT_PARAMS),
  })

  function getErrorMessage() {
    if (isApiError(error)) return error.message
    if (error instanceof Error) return error.message
    return t('wallet:failedToLoad')
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('wallet:recentTransactions')}</h2>
        <Link
          to="/transactions"
          search={{ page: 1, limit: 10 }}
          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          {t('common:viewAll')}
        </Link>
      </div>
      <div className="p-4">
        {isLoading ? (
          <SectionSkeleton />
        ) : isError ? (
          <QueryErrorCard message={getErrorMessage()} onRetry={refetch} />
        ) : data?.data.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('wallet:noTransactionsYetCta')}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <tr>
                    <th scope="col" className="px-3 pb-2">{t('common:id')}</th>
                    <th scope="col" className="px-3 pb-2">{t('common:date')}</th>
                    <th scope="col" className="px-3 pb-2">{t('common:type')}</th>
                    <th scope="col" className="px-3 pb-2 text-right">{t('common:amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((tx, index) => (
                    <TxRow key={tx.id} tx={tx} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-1 md:hidden">
              {data?.data.map((tx, index) => (
                <TxMiniCard key={tx.id} tx={tx} index={index} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function DashboardPage() {
  const { t } = useTranslation('bets')
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <BalanceCard />
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">{t('placeBetTitle')}</h2>
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
