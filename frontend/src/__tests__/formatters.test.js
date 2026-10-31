import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, capitalize } from '../utils/formatters'

describe('Formatting Utilities', () => {
  it('formats USD currency correctly', () => {
    expect(formatCurrency(1250.5)).toContain('$1,250.50')
    expect(formatCurrency(0)).toContain('$0.00')
    expect(formatCurrency(null)).toBe('$0.00')
  })

  it('formats dates consistently', () => {
    const formatted = formatDate('2026-10-31')
    expect(formatted).toContain('2026')
    expect(formatDate(null)).toBe('—')
  })

  it('capitalizes strings correctly', () => {
    expect(capitalize('active')).toBe('Active')
    expect(capitalize('PARTIALLY_PAID')).toBe('Partially_paid')
    expect(capitalize('')).toBe('')
  })
})
