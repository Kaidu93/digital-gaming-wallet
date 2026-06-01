import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]

interface PaginationProps {
  total: number
  page: number
  limit: PageSize
  onChange: (params: { page: number; limit: PageSize }) => void
  className?: string
}

export function Pagination({ total, page, limit, onChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const isFirst = page <= 1
  const isLast = page >= totalPages
  const { t } = useTranslation('common')

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-between gap-3 py-4', className)}
      aria-label={t('pageOf', { page, total: totalPages })}
    >
      <div className="flex items-center gap-2">
        <label htmlFor="page-size-select" className="text-sm text-gray-500 dark:text-gray-400">
          {t('rowsPerPage')}
        </label>
        <select
          id="page-size-select"
          value={limit}
          onChange={(e) => onChange({ page: 1, limit: Number(e.target.value) as PageSize })}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          disabled={isFirst}
          onClick={() => onChange({ page: page - 1, limit })}
          aria-label={t('previousPage')}
        >
          {t('prev')}
        </Button>

        <span className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite" aria-atomic="true">
          {t('pageOf', { page, total: totalPages })}
        </span>

        <Button
          variant="secondary"
          disabled={isLast}
          onClick={() => onChange({ page: page + 1, limit })}
          aria-label={t('nextPage')}
        >
          {t('next')}
        </Button>
      </div>
    </nav>
  )
}
