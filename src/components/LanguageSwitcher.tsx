import { useTranslation } from 'react-i18next'

export function LanguageSwitcher() {
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
