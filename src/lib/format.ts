export function formatEuro(amount: number, locale?: string): string {
  return new Intl.NumberFormat(locale ?? 'en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}
