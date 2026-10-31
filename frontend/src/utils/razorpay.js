/**
 * Load the Razorpay Checkout JavaScript SDK dynamically if not already loaded.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Open Razorpay Standard Checkout modal.
 * @param {Object} options - Checkout configuration
 * @returns {Promise} Resolves on success, rejects on failure or dismissal
 */
export async function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency = 'INR',
  name = 'SubFlow Subscription',
  description = 'Invoice Payment',
  customer = {},
  notes = {},
  themeColor = '#2563eb',
  onSuccess,
  onDismiss,
  onError,
}) {
  const isLoaded = await loadRazorpayScript()
  if (!isLoaded) {
    const err = new Error('Failed to load Razorpay SDK. Check your internet connection.')
    if (onError) onError(err)
    throw err
  }

  return new Promise((resolve, reject) => {
    const options = {
      key: keyId,
      amount: Math.round(amount * 100), // amount in smallest currency sub-unit (paise / cents)
      currency: currency,
      name: name,
      description: description,
      order_id: orderId,
      prefill: {
        name: customer.name || '',
        email: customer.email || '',
        contact: customer.phone || '',
      },
      notes: notes,
      theme: {
        color: themeColor,
      },
      handler: function (response) {
        // response contains: razorpay_payment_id, razorpay_order_id, razorpay_signature
        if (onSuccess) onSuccess(response)
        resolve(response)
      },
      modal: {
        ondismiss: function () {
          const err = new Error('Payment checkout was dismissed by user.')
          if (onDismiss) onDismiss()
          reject(err)
        },
      },
    }

    try {
      const rzpInstance = new window.Razorpay(options)
      rzpInstance.on('payment.failed', function (response) {
        if (onError) onError(response.error)
        reject(response.error)
      })
      rzpInstance.open()
    } catch (e) {
      if (onError) onError(e)
      reject(e)
    }
  })
}
