# FastAPI Backend API Integration Contract

This document outlines the exact endpoints, HTTP methods, request bodies, and expected responses for the Subscription Management System frontend.

Base URL: `http://localhost:8000` (configurable via `VITE_API_BASE_URL`)

---

## Person 1: Authentication, Users, Products & Plans

### 1. Authentication
- `POST /api/v1/auth/login`
  - Body: `{ email: string, password: string }`
  - Response: `{ user: { id, name, email, role, avatar }, token: string }`
- `POST /api/v1/auth/register`
  - Body: `{ name: string, email: string, password: string, role?: string, company?: string, phone?: string }`
  - Response: `{ user, token, message }`
- `POST /api/v1/auth/forgot-password`
  - Body: `{ email: string }`
- `POST /api/v1/auth/reset-password`
  - Body: `{ token: string, newPassword: string }`
- `GET /api/v1/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ id, name, email, role, avatar, ... }`
- `PUT /api/v1/auth/profile`
  - Body: `{ name?, phone?, company?, address? }`

### 2. Customers & Users
- `GET /api/v1/customers` (Query: `search`, `status`)
- `GET /api/v1/customers/:id`
- `POST /api/v1/customers`
  - Body: `{ name, email, company, phone, address, tier, status }`
- `PUT /api/v1/customers/:id`
- `DELETE /api/v1/customers/:id`

### 3. Products & Variants
- `GET /api/v1/products` (Query: `search`, `category`, `status`)
- `GET /api/v1/products/:id`
- `POST /api/v1/products`
  - Body: `{ name, code, sku, category, description, basePrice, availability, status, variants: [...] }`
- `PUT /api/v1/products/:id`
- `DELETE /api/v1/products/:id`

### 4. Subscription Plans
- `GET /api/v1/plans` (Query: `search`, `frequency`, `status`)
- `GET /api/v1/plans/:id`
- `POST /api/v1/plans`
  - Body: `{ name, code, billingFrequency, basePrice, setupFee, minimumQuantity, availabilityDate, pauseSettings, renewalSettings, closureSettings, status }`
- `PUT /api/v1/plans/:id`
- `DELETE /api/v1/plans/:id`

---

## Person 2: Quotations & Subscriptions

### 1. Quotations
- `GET /api/v1/quotations` (Query: `search`, `status`, `customerId`)
- `GET /api/v1/quotations/:id`
- `POST /api/v1/quotations`
  - Body: `{ customerId, customerName, customerEmail, template, issueDate, validityDate, items: [...], subtotal, discountType, discountValue, discountAmount, taxRate, taxAmount, grandTotal, notes, terms }`
- `PUT /api/v1/quotations/:id`
- `DELETE /api/v1/quotations/:id`
- `POST /api/v1/quotations/:id/send`
- `POST /api/v1/quotations/:id/approve`
- `POST /api/v1/quotations/:id/reject`
- `POST /api/v1/quotations/:id/convert-to-subscription`
  - Converts approved quotation into active subscription and auto-generates invoice.

### 2. Subscriptions
- `GET /api/v1/subscriptions` (Query: `search`, `status`, `customerId`, `customerEmail`)
- `GET /api/v1/subscriptions/:id`
- `POST /api/v1/subscriptions`
- `PUT /api/v1/subscriptions/:id`
- `POST /api/v1/subscriptions/:id/activate`
- `POST /api/v1/subscriptions/:id/pause` (Body: `{ reason: string }`)
- `POST /api/v1/subscriptions/:id/resume`
- `POST /api/v1/subscriptions/:id/renew`
- `POST /api/v1/subscriptions/:id/close` (Body: `{ reason: string }`)

---

## Person 3: Invoices, Discounts, Payments, Razorpay & Reports

### 1. Invoices
- `GET /api/v1/invoices` (Query: `search`, `status`, `customerId`, `customerEmail`)
- `GET /api/v1/invoices/:id`
- `POST /api/v1/invoices`
- `PUT /api/v1/invoices/:id`
- `POST /api/v1/invoices/:id/confirm`
- `POST /api/v1/invoices/:id/cancel`
- `POST /api/v1/invoices/:id/send`
- `GET /api/v1/invoices/:id/pdf` (Returns PDF blob)

### 2. Discounts
- `GET /api/v1/discounts` (Query: `search`, `type`, `status`)
- `GET /api/v1/discounts/:id`
- `POST /api/v1/discounts`
- `PUT /api/v1/discounts/:id`
- `DELETE /api/v1/discounts/:id`
- `POST /api/v1/discounts/validate`
  - Body: `{ code: string, subtotal: number, quantity: number }`

### 3. Payments
- `GET /api/v1/payments` (Query: `search`, `method`, `status`, `customerId`)
- `GET /api/v1/payments/:id`
- `POST /api/v1/payments/record`
  - Body: `{ invoiceId, amount, method, transactionReference, paymentDate, notes }`

### 4. Razorpay Integration
- `POST /api/v1/payments/razorpay/create-order`
  - Body: `{ invoiceId: string, amount: number, currency: "INR" }`
  - Returns: `{ keyId: string, orderId: string, amount: number, currency: string }`
- `POST /api/v1/payments/razorpay/verify`
  - Body: `{ razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string, invoiceId: string }`
  - Returns: `{ success: boolean, verified: boolean, message: string }`

### 5. Dashboards & Reports
- `GET /api/v1/dashboard/admin`
- `GET /api/v1/dashboard/staff`
- `GET /api/v1/dashboard/customer` (Query: `email`)
- `GET /api/v1/reports/revenue`
- `GET /api/v1/reports/subscriptions`
