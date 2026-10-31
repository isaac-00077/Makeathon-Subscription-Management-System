import { describe, it, expect, beforeEach } from 'vitest'
import { discountService } from '../services/discountService'
import { resetMockStore } from '../services/mockData'

describe('Discount Engine & Rule Validation', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('validates percentage discount correctly', async () => {
    const result = await discountService.validateDiscountCode('WELCOME10', 500, 1)
    expect(result.valid).toBe(true)
    expect(result.calculatedAmount).toBe(50) // 10% of 500
  })

  it('rejects discount when minimum purchase condition is not met', async () => {
    await expect(discountService.validateDiscountCode('WELCOME10', 50, 1)).rejects.toThrow(
      'Minimum purchase'
    )
  })

  it('validates fixed discount correctly', async () => {
    const result = await discountService.validateDiscountCode('GROWTH50', 600, 2)
    expect(result.valid).toBe(true)
    expect(result.calculatedAmount).toBe(50)
  })

  it('rejects invalid or non-existent promo codes', async () => {
    await expect(discountService.validateDiscountCode('FAKECODE99', 500, 1)).rejects.toThrow(
      'Invalid discount code'
    )
  })
})
