import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { Outlet, useRouter, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/stores/auth'
import { formatEuro } from '@/lib/format'
import { useLocale } from '@/i18n'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/ThemeProvider'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation('common')
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('switchToLight') : t('switchToDark')}
      title={isDark ? t('switchToLight') : t('switchToDark')}
      className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 6.166a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
        </svg>
      )}
    </button>
  )
}

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const nextLang = i18n.language === 'lt' ? 'en' : 'lt'

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(nextLang)}
      className="rounded-md px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
    >
      {nextLang}
    </button>
  )
}

export default function AppShell() {
  const user = useAuth((s) => s.user)
  const balance = useAuth((s) => s.balance)
  const token = useAuth((s) => s.token)
  const logout = useAuth((s) => s.logout)
  const router = useRouter()
  const { t } = useTranslation('common')
  const locale = useLocale()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const shouldReduceMotion = useReducedMotion()

  const springBalance = useSpring(balance, {
    damping: shouldReduceMotion ? 100 : 25,
    stiffness: shouldReduceMotion ? 10000 : 200,
  })
  const formattedBalance = useTransform(springBalance, (v) => formatEuro(v, locale))

  useEffect(() => {
    springBalance.set(balance)
  }, [balance, locale, springBalance])

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <span className="min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-300">{user?.name}</span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100" aria-live="polite" aria-atomic="true">
              <span className="hidden sm:inline">{t('balancePrefix')}</span>
              <motion.span>{formattedBalance}</motion.span>
            </span>
            <LanguageSwitcher />
            <ThemeToggle />
            <Button variant="ghost" onClick={handleLogout}>
              {t('logout')}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: shouldReduceMotion ? 0.1 : 0.18 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
