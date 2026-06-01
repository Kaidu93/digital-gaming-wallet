import i18n from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './locales/en/common.json'
import enAuth from './locales/en/auth.json'
import enWallet from './locales/en/wallet.json'
import enBets from './locales/en/bets.json'

import ltCommon from './locales/lt/common.json'
import ltAuth from './locales/lt/auth.json'
import ltWallet from './locales/lt/wallet.json'
import ltBets from './locales/lt/bets.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, auth: enAuth, wallet: enWallet, bets: enBets },
      lt: { common: ltCommon, auth: ltAuth, wallet: ltWallet, bets: ltBets },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'lt'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'dgw-lang',
    },
  })

export default i18n

const LOCALE_MAP: Record<string, string> = { lt: 'lt-LT' }

export function useLocale(): string {
  const { i18n: instance } = useTranslation()
  return LOCALE_MAP[instance.language] ?? 'en-IE'
}
