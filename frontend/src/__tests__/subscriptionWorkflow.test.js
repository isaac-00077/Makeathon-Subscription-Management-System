import { describe, it, expect, beforeEach } from 'vitest'
import { quotationService } from '../services/quotationService'
import { subscriptionService } from '../services/subscriptionService'
import { resetMockStore } from '../services/mockData'

describe('Quotation to Subscription Lifecycle Workflow', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('converts an approved quotation into an active subscription and invoice', async () => {
    const conversion = await quotationService.convertToSubscription('quot_1001')
    expect(conversion.subscription).toBeDefined()
    expect(conversion.subscription.status).toBe('active')
    expect(conversion.subscription.amount).toBe(1239.35)
    expect(conversion.invoice).toBeDefined()
    expect(conversion.invoice.balance).toBe(1239.35)
    expect(conversion.invoice.status).toBe('pending')

    // Verify quotation status updated to 'converted'
    const updatedQuot = await quotationService.getQuotationById('quot_1001')
    expect(updatedQuot.status).toBe('converted')
    expect(updatedQuot.convertedSubscriptionId).toBe(conversion.subscription.id)
  })

  it('handles pause and resume lifecycle transitions', async () => {
    const paused = await subscriptionService.pauseSubscription('sub_2001', 'Test Pause')
    expect(paused.status).toBe('paused')

    const resumed = await subscriptionService.resumeSubscription('sub_2001')
    expect(resumed.status).toBe('active')
  })

  it('handles renewal extending expiry date', async () => {
    const renewed = await subscriptionService.renewSubscription('sub_2001')
    expect(renewed.status).toBe('active')
    expect(renewed.expiryDate).toBeDefined()
  })

  it('handles closure of subscription', async () => {
    const closed = await subscriptionService.closeSubscription('sub_2001')
    expect(closed.status).toBe('closed')
  })
})
