import { describe, it, expect, beforeEach } from 'vitest'
import { paymentService } from '../services/paymentService'
import { invoiceService } from '../services/invoiceService'
import { resetMockStore } from '../services/mockData'

describe('Payment Reconciliation & Invoice Balances', () => {
  beforeEach(() => {
    resetMockStore()
  })

  it('records partial payment and updates remaining invoice balance', async () => {
    // inv_3001 has grandTotal: 1239.35 and balance: 1239.35
    const result = await paymentService.recordPayment({
      invoiceId: 'inv_3001',
      amount: 500.0,
      method: 'Bank Transfer',
      transactionReference: 'TEST-TXN-PARTIAL',
      notes: 'Initial milestone deposit',
    })

    expect(result.payment).toBeDefined()
    expect(result.payment.amount).toBe(500.0)
    expect(result.invoice.amountPaid).toBe(500.0)
    expect(result.invoice.balance).toBe(739.35)
    expect(result.invoice.status).toBe('partially_paid')

    // Confirm persisted in store
    const updatedInvoice = await invoiceService.getInvoiceById('inv_3001')
    expect(updatedInvoice.balance).toBe(739.35)
  })

  it('records remaining full balance and marks invoice as paid', async () => {
    // Pay off remaining 703.00 for inv_3002
    const result = await paymentService.recordPayment({
      invoiceId: 'inv_3002',
      amount: 703.0,
      method: 'UPI',
      transactionReference: 'TEST-UPI-FULL',
      notes: 'Settled in full',
    })

    expect(result.invoice.balance).toBe(0)
    expect(result.invoice.status).toBe('paid')
  })

  it('rejects invalid non-positive payment amounts', async () => {
    await expect(
      paymentService.recordPayment({
        invoiceId: 'inv_3001',
        amount: -100,
        method: 'Cash',
      })
    ).rejects.toThrow('Please enter a valid positive payment amount')
  })
})
