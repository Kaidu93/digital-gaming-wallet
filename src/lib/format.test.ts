import { describe, expect, it } from 'vitest'
import { formatEuro } from './format'

describe('formatEuro', () => {
  it('formats a positive amount', () => {
    expect(formatEuro(10.5)).toBe('€10.50')
  })

  it('formats zero', () => {
    expect(formatEuro(0)).toBe('€0.00')
  })

  it('formats a negative amount', () => {
    expect(formatEuro(-5.25)).toBe('-€5.25')
  })

  it('accepts a custom locale', () => {
    const result = formatEuro(10.5, 'de-DE')
    expect(result).toMatch(/10/)
    expect(result).toMatch(/EUR|€/)
  })
})
