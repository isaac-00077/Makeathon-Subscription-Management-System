# Subscription Management System

## Project Overview

The Subscription Management System is a centralized platform designed to automate and simplify subscription management, recurring billing, invoice generation, payment tracking, and financial reporting for SaaS-based businesses.

Traditional subscription management often involves spreadsheets, manually tracking renewals, preparing invoices, matching payments, and generating revenue reports. These processes can lead to missed renewals, billing errors, and difficulties in monitoring financial performance.

This project aims to replace these manual processes with an integrated system that enables administrators, staff members, and customers to manage subscription-related activities efficiently.

## Objectives

- Automate subscription creation, management, and renewal.
- Simplify product and subscription plan management.
- Generate quotations and convert accepted quotations into subscriptions.
- Automate recurring invoice generation.
- Calculate applicable taxes and discounts.
- Maintain payment records and outstanding balances.
- Provide financial insights through dashboards and reports.
- Implement secure, role-based access control.
- Support efficient management of thousands of subscriptions.

## Key Features

### 1. Authentication and User Management
- Customer registration and login.
- Secure password hashing and JWT-based authentication.
- Forgot password and password reset functionality.
- Role-based access control.
- Admin, Staff, and Customer roles.
- Admin-controlled staff account creation.

### 2. Product and Plan Management
- Create, view, update, and manage products.
- Configure product types, sales prices, and cost prices.
- Support product variants with additional pricing.
- Create and manage subscription plans.
- Configure daily, weekly, monthly, and yearly billing frequencies.
- Define minimum quantities and plan availability periods.
- Configure subscription pause, closure, and renewal rules.

### 3. Quotation Management
- Create quotations for customers.
- Add products, plans, quantities, and pricing details.
- Configure quotation validity periods.
- Create and reuse quotation templates.
- Manage quotation records and statuses.
- Convert accepted quotations into subscriptions.

### 4. Subscription Management
- Create subscriptions from accepted quotations.
- Maintain subscription numbers and customer details.
- Manage subscription start and expiry dates.
- Track billing frequencies and payment terms.
- Manage subscription lifecycle:

  `Draft → Quotation → Confirmed → Active → Closed`

- Support activation, pausing, resuming, renewal, and closure.
- Track upcoming billing dates.

### 5. Invoice and Recurring Billing Management
- Generate invoices from active subscriptions.
- Automatically identify subscriptions due for billing.
- Generate recurring invoices using scheduled background tasks.
- Calculate invoice totals, taxes, and discounts.
- Manage invoice confirmation and cancellation.
- Track invoice statuses: Draft, Confirmed, and Paid.
- Generate downloadable PDF invoices.
- Prevent duplicate invoices for the same billing period.

### 6. Tax and Discount Management
- Configure tax rates.
- Support fixed and percentage-based discounts.
- Configure minimum purchase and quantity requirements.
- Set discount validity periods and usage limits.
- Apply discounts to specific products or entire subscriptions.
- Automatically apply eligible discounts during invoice generation.

### 7. Payment Management
- Record payments against invoices.
- Support different payment methods.
- Maintain payment dates, amounts, and transaction references.
- Support partial and full payments.
- Maintain payment history.
- Calculate outstanding balances.
- Identify overdue invoices.
- Optional Razorpay payment gateway integration.

### 8. Dashboard and Reports
- Display active subscription statistics.
- Track revenue received.
- Monitor outstanding amounts.
- Identify overdue invoices.
- View payment and subscription summaries.
- Generate revenue, payment, and subscription reports.
- Provide role-specific dashboard information.

## User Roles

| Role | Responsibilities |
|---|---|
| Admin | Manage users, staff, products, plans, taxes, discounts, subscriptions, invoices, payments, and financial reports. |
| Staff | Handle customer-related operations, quotations, subscriptions, invoices, and payment records. |
| Customer | View and manage their own subscriptions, invoices, payments, and outstanding balances. |

## Technology Stack

**Frontend**
- React.js
- Vite
- JavaScript
- Tailwind CSS
- shadcn/ui
- React Router
- Axios
- TanStack Query
- Recharts

**Backend**
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic
- JWT Authentication
- APScheduler
- ReportLab

**Database**
- PostgreSQL

**Payment Integration**
- Razorpay (Test Mode)

**Development and Collaboration**
- Git
- GitHub
- Postman
- Swagger UI

## Application Workflow

1. A customer registers and creates an account.
2. The administrator creates products, variants, and subscription plans.
3. Staff members create quotations for customers.
4. Customers review and accept quotations.
5. Accepted quotations are converted into subscriptions.
6. Subscriptions become active according to their lifecycle.
7. The recurring billing system identifies subscriptions due for billing.
8. Invoices are automatically generated with applicable taxes and discounts.
9. Customers or staff record payments against invoices.
10. The system updates payment statuses and outstanding balances.
11. Dashboards and reports reflect the latest subscription and financial information.

## Team Development and Branch Responsibilities

The project is developed collaboratively using Git and GitHub, with separate feature branches for different modules.

| Branch | Responsibility |
|---|---|
| `main` | Stable application version |
| `dev` | Integration and testing |
| `feature/auth-products-plans` | Authentication, user management, products, variants, and plans |
| `feature/quotations-subscriptions` | Quotation and subscription management |
| `feature/billing-payments` | Invoices, taxes, discounts, recurring billing, payments, and reports |
| `feature/frontend` | Frontend development and API integration |

Each feature is developed independently and integrated into the `dev` branch through pull requests. After integration and testing, the stable version is merged into `main`.

## Security and Performance

- Secure password hashing.
- JWT-based authentication.
- Role-based authorization.
- Customer-specific data access restrictions.
- Backend validation of financial calculations.
- Protection against duplicate invoice generation.
- Payment verification before updating invoice statuses.
- Database indexing and optimized queries.
- Efficient pagination and filtering.
- Target response time of under two seconds per page.

## Expected Outcome

The final system aims to provide a centralized and automated subscription management solution that reduces manual work, minimizes billing errors, improves payment tracking, and provides businesses with better visibility into recurring revenue and financial operations.