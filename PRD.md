# LaundryOS — Product Requirements Document

**Version**: 2.0  
**Stack**: Next.js 16 (App Router) · Supabase · Material UI · Tap Payments · WhatsApp Business API  
**Region**: Kuwait / GCC · Currency: KWD (3 decimal places)  
**Architecture**: Multi-tenant SaaS — shared schema, RLS-enforced tenant isolation

---

## Executive Summary

LaundryOS is an enterprise-grade, multi-tenant laundry management platform built for the GCC market. It covers the full business lifecycle: point-of-sale order entry, garment tracking, delivery, customer subscriptions, accounting, and analytics — all in one bilingual (Arabic / English) system.

---

## Completed Phases

### Phase 0 — Foundation
**DB Migration**: `001_foundation.sql`

| Feature | Status |
|---|---|
| Tenants, Branches, User Profiles | ✅ |
| Customers (retail & corporate) | ✅ |
| Services price list | ✅ |
| Orders & Order Items with QR codes | ✅ |
| Invoices (KWD 3 dp) | ✅ |
| Payments (cash, KNET, Visa/MC, wallet, credit) | ✅ |
| Customer Subscription Plans & Subscriptions | ✅ |
| Platform Plans & Subscriptions | ✅ |
| Audit Log | ✅ |
| Row Level Security on all tables | ✅ |

### Phase 1 — Services & Notifications
**DB Migration**: `002_phase1_seed.sql`

| Feature | Status |
|---|---|
| Default service templates | ✅ |
| `generate_order_number()` and `generate_qr_code()` DB functions | ✅ |
| Notifications log (WhatsApp, SMS, email) | ✅ |

### Phase 2 — Operations, Inventory & Accounting
**DB Migration**: `003_phase2_operations.sql`

| Feature | Status |
|---|---|
| Inventory items & transactions per branch | ✅ |
| Inventory trigger: auto-update current_qty | ✅ |
| Equipment registry per branch | ✅ |
| Maintenance logs | ✅ |
| Chart of Accounts with `seed_chart_of_accounts()` | ✅ |
| Expenses | ✅ |
| Cash Reconciliation (daily per branch/shift) | ✅ |

### Phase 3 — Delivery & Customer Subscriptions
**DB Migration**: `004_phase3_delivery_subscriptions.sql`

| Feature | Status |
|---|---|
| Delivery Runs (driver, branch, date) | ✅ |
| Delivery Stops (pickup / dropoff, sequenced) | ✅ |
| Customer subscription plans & enrollment | ✅ |
| Subscription usage deduction | ✅ |

### Phase 4 — API Keys & Tax
**DB Migration**: `005_phase4_api_keys.sql`

| Feature | Status |
|---|---|
| API keys (SHA-256 hashed, prefix for display) | ✅ |
| `touch_api_key()` DB function | ✅ |
| `tax_rate` column on tenants | ✅ |

---

## Planned Phases

---

### Phase 5 — Item / Garment Master + Enhanced POS
**DB Migration**: `006_phase5_item_master.sql`

#### 5.1 Garment Category & Item Master

**Problem**: Services exist but there is no garment catalog. Staff must type garment names freehand, which is error-prone and slow on a touch screen.

**Solution**: A two-level garment master — Category → Item — linked to allowed services.

**Database**:
```
garment_categories
  id, tenant_id, name_en, name_ar, icon, display_order, is_active

garment_items
  id, tenant_id, category_id (FK→garment_categories)
  name_en, name_ar, photo_url
  default_service_id (FK→services)
  allowed_service_categories text[]   -- e.g. ['dry_clean','iron_only']
  is_subscription_eligible boolean
  special_handling jsonb              -- {delicate, no_spin, no_tumble_dry}
  display_order, is_active
```

**Default categories seeded per tenant** (on first branch creation):
- Traditional Wear (Dishdasha, Abaya, Bisht, Kandura)
- Formal Wear (Suit, Blazer, Dress Shirt, Tie)
- Casual Wear (T-Shirt, Jeans, Polo)
- Ladies Wear (Dress, Skirt, Blouse)
- Household (Blanket, Curtain, Bedsheet, Towel)
- Accessories (Shoes, Leather Bag, Hat)

**Services enhanced**:
```
services
  + express_price numeric(10,3)       -- price when marked express
  + express_turnaround_hours int      -- hours for express vs turnaround_hours
```

**Order items enhanced**:
```
order_items
  + item_id uuid (FK→garment_items, nullable for backward compat)
  + is_express boolean default false
  + express_surcharge numeric(10,3) default 0
```

**Settings page**: Settings → Items
- Tab 1: Categories (add/edit/reorder)
- Tab 2: Items within each category (add/edit, set allowed services, express flag)

#### 5.2 Touch-Friendly POS Screen

**Problem**: Current POS is a vertical form that is slow on tablet and requires staff to type garment names.

**Solution**: Full-screen touch-optimized order entry with category grid, item grid, quantity, and normal/express toggle.

**Flow**:
1. **Customer** — search by phone or name, or quick-add
2. **Items** — category grid (large tiles, icon + name) → tap category → item tiles → tap item → qty +/− → Normal / Express toggle per item
3. **Review** — order summary with express items visually distinct (amber color, lightning icon), subtotal + express surcharge, subscription credit preview
4. **Payment** — optional payment collection at POS (cash / KNET / defer)

**Visual design**:
- Express items: amber `#f59e0b` background chip + ⚡ icon
- Normal items: default blue chip
- Order summary sidebar always visible on ≥ 768px
- Large (+/−) quantity buttons (min 44px touch target)
- Category tiles: 120×100px minimum, icon above name

---

### Phase 6 — Enhanced Subscription Models
**DB Migration**: `007_phase6_subscriptions.sql`

#### 6.1 Subscription Plan Models

Three models, all configurable per tenant:

**Model A — Credit-Based** (`plan_type = 'credit'`)
- Customer pays `price` KWD → receives `credit_amount` KWD in wallet
- e.g. Pay KWD 20 → Get KWD 25 credit
- Credit expires after `credit_validity_days` days
- Auto-top-up when balance < threshold (optional)

**Model B — Item Bundle** (`plan_type = 'item_bundle'`)
- Monthly/quarterly/annual item allowance (`included_items`)
- Bonus items on purchase: `bonus_items` (flat) OR `bonus_items_pct` (%)
- e.g. Buy 100 items → get 130 (30 free)
- `allowed_category_ids[]`: which garment categories can use free/bonus items (NULL = all)
- `subscription_ineligible` flag per garment item overrides plan allowance
- Overage pricing: `overage_price_per_item` KWD per item after bundle exhausted
- Rollover: unused items can carry forward (configurable: `rollover_enabled`, `rollover_cap`)

**Model C — Weight Bundle** (`plan_type = 'weight'`)
- Monthly KG allowance (`included_kg`)
- Overage rate per kg (`overage_price_per_kg`)

**Common fields added to `customer_subscription_plans`**:
```
plan_type text ('credit'|'item_bundle'|'weight')
credit_amount numeric(10,3)
credit_validity_days int
bonus_items int
bonus_items_pct numeric(5,2)
allowed_category_ids uuid[]
rollover_enabled boolean default false
rollover_cap int
overage_price_per_item numeric(10,3)
overage_price_per_kg numeric(10,3)
cancellation_policy text ('full_refund'|'pro_rata'|'no_refund'|'credit_conversion'|'cancellation_fee')
cancellation_fee numeric(10,3) default 0
```

**Fields added to `customer_subscriptions`**:
```
bonus_items_remaining int default 0
wallet_credit_balance numeric(10,3) default 0
paused_at date
pause_until date
```

#### 6.2 Customer Wallet

```
customer_wallets
  id, tenant_id, customer_id (unique per tenant), balance, updated_at

customer_wallet_transactions
  id, tenant_id, customer_id, wallet_id
  txn_type ('credit'|'debit')
  amount, description
  reference_id, reference_type ('invoice'|'subscription'|'manual'|'credit_note')
  actor_id, created_at
```

Wallet balance shown on:
- Customer detail screen
- POS review step (deducted before other payment methods)
- Customer statement

#### 6.3 Subscription Cancellation

```
subscription_cancellation_requests
  id, tenant_id, subscription_id
  requested_by (user_profile FK)
  reason text
  refund_amount numeric(10,3)
  refund_method ('cash'|'knet'|'wallet_credit'|'none')
  status ('pending'|'approved'|'rejected'|'completed')
  approved_by, notes
  created_at, resolved_at
```

**Cancellation flow**:
1. Staff initiates: select reason, system calculates refund based on plan's `cancellation_policy`
2. If refund > KWD 5: requires manager approval
3. On approval: subscription set to `cancelled`, refund processed, WhatsApp confirmation sent

**Refund calculations**:
- `full_refund`: 100% of unused period days
- `pro_rata`: `price × (days_remaining / total_days_in_period)`
- `no_refund`: 0
- `credit_conversion`: refund goes to customer wallet
- `cancellation_fee`: `pro_rata − cancellation_fee` (not negative)

---

### Phase 7 — Enhanced Payments
**DB Migration**: `008_phase7_payments.sql`

#### 7.1 Partial Payments

- Invoice status `partial` already exists; UI now supports collecting partial amounts
- Multiple payment rows per invoice (different methods OK)
- `amount_paid` = sum of all payment rows for an invoice
- Invoice auto-transitions: `unpaid` → `partial` → `paid` based on payments vs total
- Outstanding balance shown prominently on invoice and POS review

#### 7.2 FIFO Payment Allocation

When a customer makes a payment (e.g. walks in and pays KWD 20):
1. Fetch all unpaid/partial invoices for that customer, ordered by `created_at ASC`
2. Allocate payment to oldest invoice first until exhausted
3. Any excess goes to customer wallet

```
payment_allocations
  id, tenant_id, payment_id (FK→payments), invoice_id (FK→invoices)
  amount_allocated numeric(10,3)
  created_at
```

**UI**: "Collect Payment" button on customer screen — enter amount + method → system shows which invoices will be cleared (preview before confirming).

#### 7.3 Credit Notes

```
credit_notes
  id, tenant_id, customer_id, invoice_id (optional, which order triggered it)
  amount, reason
  status ('open'|'applied'|'voided')
  applied_to_invoice_id
  created_by, created_at
```

Credit notes auto-apply to the next invoice created for that customer (or manually applied).

---

### Phase 8 — Customer Analytics & Statement
**No new DB migration required**

#### 8.1 Customer Detail Screen (`/customers/[id]`)

**Summary cards row**:
- Lifetime spend (KWD)
- Total orders
- Active subscription (plan name + days remaining)
- Outstanding balance (KWD, red if > 0)
- Last visit date

**Tabs**:
1. **Overview** — visit frequency chart (last 12 months bars), avg order value trend, favorite services, customer since date, notes
2. **Orders** — paginated order history with status, amount, date; click to open order
3. **Invoices** — all invoices with status, amounts; collect payment inline
4. **Subscriptions** — active and past plans, usage per period, enroll / cancel actions
5. **Wallet** — current balance, transaction log, manual top-up button
6. **Statement** — date range selector → renders customer statement (see below)
7. **Communications** — WhatsApp/SMS log

#### 8.2 Customer Statement

Date-range printable statement showing:
```
Customer: Ahmed Al-Rashidi        Tel: +96550001234
Period: 01/06/2025 – 17/06/2025

Date        Ref           Description                  Debit     Credit    Balance
──────────────────────────────────────────────────────────────────────────────────
01/06       INV-2025-001  Wash & Fold × 3              4.500               4.500
03/06       PAY-001       Cash payment                           4.500     0.000
05/06       INV-2025-002  Dry Clean × 2                3.000               3.000
...
──────────────────────────────────────────────────────────────────────────────────
                          Closing Balance                                  3.000
```

Downloadable as PDF (server-rendered), printable, or on-screen view.

---

### Phase 9 — Reports Enhancement

#### 9.1 Financial Reports
- Revenue by service / by branch / by staff / by period
- P&L summary (revenue vs expenses per branch)
- Outstanding invoices aging (0–30, 31–60, 61–90, 90+ days)
- Cash vs. card payment split
- Subscription MRR and churn rate

#### 9.2 Operational Reports
- Order processing time (avg per stage)
- Express vs. normal order ratio
- Late/overdue orders aging
- Garment volume by category / by service

#### 9.3 Customer Reports
- Top N customers by revenue
- New vs. returning customer trend
- Customer retention cohort (monthly)

#### 9.4 Inventory Reports
- Stock vs. reorder threshold
- Consumption rate per item
- Restock cost estimate

---

### Phase 10 — Delivery Enhancement

- Delivery fee per order (flat, by zone, configurable)
- Driver mobile view (PWA): assigned runs, stop list, complete/fail stops
- Proof of delivery: photo upload
- Failed delivery workflow: reason + reschedule
- Driver performance report

---

### Phase 11 — Customer Portal (Self-Service)

- Subdomain: `{slug}.laundryos.com`
- Phone OTP login
- Track orders by status
- View and download invoices
- View subscription usage and renewal date
- Online pickup booking
- Wallet top-up

---

### Phase 12 — Platform Billing Enhancement

- Usage metering (orders/month, branches, users)
- Overage warnings and hard limits
- Tenant suspension workflow
- Invoice history for LaundryOS subscription

---

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| POS load time | < 2 seconds |
| Order list load time | < 3 seconds |
| Uptime | 99.9% (Vercel + Supabase) |
| Languages | Arabic (RTL) + English (LTR) |
| Currency precision | KWD 3 decimal places throughout |
| Security | TAP_SECRET_KEY server-only; SUPABASE_SERVICE_ROLE_KEY server-only; card data never touches LaundryOS servers |
| Audit | All financial mutations logged to `audit_log` |
| RLS | Every tenant-scoped table enforces tenant isolation via `current_tenant_id()` SECURITY DEFINER function |
| Export | Any report exportable to CSV; invoices and statements to PDF |

---

## Security Constraints (Non-Negotiable)

1. `TAP_SECRET_KEY` — server-only, never exposed to client
2. `SUPABASE_SERVICE_ROLE_KEY` — server-only, webhook handlers only
3. Card data — never stored on LaundryOS; Tap hosted checkout only
4. `tenant_id` — never hardcoded; always from authenticated session via RLS
5. Tap / WhatsApp API shapes — never invented; only use documented request/response formats
