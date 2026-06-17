-- LaundryOS — Phase 0: Foundation
-- Run this against your Supabase project via the SQL editor or CLI.
-- Every tenant-scoped table ships with its RLS policy in this same migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: resolve current tenant from the authenticated user's profile.
-- Server actions and server components call this via set_config when needed,
-- but the default RLS pattern below reads directly from user_profiles so
-- no explicit set_config call is required in Phase 0.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- TENANTS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists tenants (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  slug                text unique not null,
  cr_number           text,
  default_locale      text default 'en',
  base_currency       text default 'KWD',
  logo_url            text,
  brand_primary_color text,
  status              text default 'trial'
    check (status in ('trial','active','suspended','cancelled')),
  trial_ends_at       timestamptz,
  created_at          timestamptz default now()
);

-- Tenants table is NOT row-level secured itself — tenant rows are read by
-- middleware/server actions using the service-role key or anon key for signup.
-- Super-admin operations use the service-role key exclusively.

-- ─────────────────────────────────────────────────────────────────────────────
-- BRANCHES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists branches (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  name        text not null,
  area        text,
  phone       text,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

alter table branches enable row level security;

create policy branches_tenant_isolation on branches
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- USER PROFILES
-- One row per Supabase Auth user. Created by the signup server action.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists user_profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  tenant_id        uuid references tenants(id) on delete cascade,
  branch_id        uuid references branches(id),
  role             text not null
    check (role in ('super_admin','tenant_owner','branch_manager','cashier','accountant','driver')),
  full_name        text,
  phone            text,
  preferred_locale text default 'en',
  created_at       timestamptz default now()
);

alter table user_profiles enable row level security;

-- Users can read their own profile; tenant members can read each other's.
create policy user_profiles_self_read on user_profiles
  for select
  using (
    id = auth.uid()
    or tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

create policy user_profiles_self_update on user_profiles
  for update
  using (id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists customers (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references tenants(id) on delete cascade,
  full_name          text not null,
  phone              text not null,
  email              text,
  preferred_locale   text default 'ar',
  customer_type      text default 'retail'
    check (customer_type in ('retail','corporate')),
  credit_terms_days  int,
  created_at         timestamptz default now()
);

alter table customers enable row level security;

create policy customers_tenant_isolation on customers
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICES (price list)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists services (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  name_en          text not null,
  name_ar          text not null,
  category         text
    check (category in ('wash_fold','dry_clean','iron_only','special_care')),
  base_price       numeric(10,3) not null,
  turnaround_hours int default 24,
  is_active        boolean default true
);

alter table services enable row level security;

create policy services_tenant_isolation on services
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  branch_id        uuid not null references branches(id),
  customer_id      uuid not null references customers(id),
  order_number     text not null,
  status           text not null default 'received'
    check (status in (
      'received','sorting','washing','drying','ironing',
      'qc','ready','out_for_delivery','completed','cancelled'
    )),
  promised_at      timestamptz,
  fulfillment_type text default 'walk_in'
    check (fulfillment_type in ('walk_in','pickup_delivery')),
  subscription_id  uuid,
  created_by       uuid references user_profiles(id),
  created_at       timestamptz default now()
);

alter table orders enable row level security;

create policy orders_tenant_isolation on orders
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references orders(id) on delete cascade,
  tenant_id             uuid not null references tenants(id),
  qr_code               text unique,
  garment_type          text,
  service_id            uuid references services(id),
  special_instructions  text,
  pre_existing_condition jsonb,
  status                text default 'received',
  unit_price            numeric(10,3),
  created_at            timestamptz default now()
);

alter table order_items enable row level security;

create policy order_items_tenant_isolation on order_items
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- INVOICES  (KWD uses 3 decimal places — numeric(10,3) throughout)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  customer_id    uuid not null references customers(id),
  order_id       uuid references orders(id),
  invoice_number text not null,
  subtotal       numeric(10,3) not null,
  tax_rate       numeric(5,2) default 0,
  tax_amount     numeric(10,3) default 0,
  total          numeric(10,3) not null,
  status         text default 'unpaid'
    check (status in ('unpaid','paid','partial','overdue','void')),
  due_date       date,
  pdf_url        text,
  created_at     timestamptz default now()
);

alter table invoices enable row level security;

create policy invoices_tenant_isolation on invoices
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  invoice_id   uuid references invoices(id),
  amount       numeric(10,3) not null,
  method       text not null
    check (method in ('cash','knet','visa_mc','wallet','credit_account')),
  tap_charge_id text,
  collected_by uuid references user_profiles(id),
  paid_at      timestamptz default now()
);

alter table payments enable row level security;

create policy payments_tenant_isolation on payments
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOMER SUBSCRIPTION PLANS & SUBSCRIPTIONS  (tenant-configured bundles)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists customer_subscription_plans (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name_en       text,
  name_ar       text,
  billing_cycle text default 'monthly'
    check (billing_cycle in ('monthly','quarterly','annual')),
  price         numeric(10,3) not null,
  included_kg   numeric(6,2),
  included_items int,
  perks         jsonb
);

alter table customer_subscription_plans enable row level security;

create policy csp_tenant_isolation on customer_subscription_plans
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

create table if not exists customer_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id) on delete cascade,
  customer_id           uuid not null references customers(id),
  plan_id               uuid not null references customer_subscription_plans(id),
  status                text default 'active'
    check (status in ('active','past_due','paused','cancelled')),
  current_period_start  date,
  current_period_end    date,
  used_kg               numeric(6,2) default 0,
  used_items            int default 0,
  payment_method        text
    check (payment_method in ('tokenized_card','knet_manual_renewal')),
  tap_token_id          text,
  created_at            timestamptz default now()
);

alter table customer_subscriptions enable row level security;

create policy cs_tenant_isolation on customer_subscriptions
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- PLATFORM PLANS & SUBSCRIPTIONS  (tenant pays you for LaundryOS access)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists platform_plans (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  price_kwd             numeric(10,3),
  max_branches          int,
  max_orders_per_month  int,
  max_users             int,
  features              jsonb
);

-- Seed the three plans
insert into platform_plans (name, price_kwd, max_branches, max_orders_per_month, max_users, features) values
  ('Starter',    15.000, 1, 500,   5,  '{"garment_qr":true,"customer_portal":false,"delivery":false,"api_access":false}'),
  ('Growth',     35.000, 3, 2000,  20, '{"garment_qr":true,"customer_portal":true,"delivery":true,"api_access":false}'),
  ('Enterprise', 85.000, 999, 999999, 999, '{"garment_qr":true,"customer_portal":true,"delivery":true,"api_access":true}')
on conflict do nothing;

create table if not exists platform_subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  plan_id             uuid not null references platform_plans(id),
  status              text default 'trial'
    check (status in ('trial','active','past_due','suspended','cancelled')),
  current_period_end  date,
  payment_method      text,
  tap_token_id        text,
  created_at          timestamptz default now()
);

-- platform_subscriptions is read by the tenant but only via their own tenant_id
alter table platform_subscriptions enable row level security;

create policy ps_tenant_isolation on platform_subscriptions
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- AUDIT LOG  (financial + inventory mutations only — no PII values stored)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,
  actor_id    uuid references user_profiles(id),
  action      text not null,
  entity      text not null,
  entity_id   uuid,
  diff        jsonb,
  created_at  timestamptz default now()
);

alter table audit_log enable row level security;

create policy audit_log_tenant_isolation on audit_log
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_branches_tenant     on branches(tenant_id);
create index if not exists idx_user_profiles_tenant on user_profiles(tenant_id);
create index if not exists idx_customers_tenant    on customers(tenant_id);
create index if not exists idx_orders_tenant       on orders(tenant_id);
create index if not exists idx_orders_branch       on orders(branch_id);
create index if not exists idx_orders_customer     on orders(customer_id);
create index if not exists idx_orders_status       on orders(status);
create index if not exists idx_order_items_order   on order_items(order_id);
create index if not exists idx_order_items_qr      on order_items(qr_code);
create index if not exists idx_invoices_tenant     on invoices(tenant_id);
create index if not exists idx_payments_tenant     on payments(tenant_id);
create index if not exists idx_audit_log_tenant    on audit_log(tenant_id);
create index if not exists idx_audit_log_actor     on audit_log(actor_id);
-- LaundryOS — Phase 1: Default services template + branch helpers
-- These are default services that get copied into a tenant on first setup.
-- The actual per-tenant services are in the `services` table (already RLS'd).

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: generate a unique order number for a tenant.
-- Format: ORD-{YYYYMMDD}-{6 random hex chars}
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function generate_order_number()
returns text
language plpgsql
as $$
declare
  v_date text := to_char(now(), 'YYYYMMDD');
  v_rand text := substr(md5(gen_random_uuid()::text), 1, 6);
begin
  return 'ORD-' || v_date || '-' || upper(v_rand);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: generate a garment QR code token.
-- Format: LOS-{12 random hex chars}  (unique across the whole platform)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function generate_qr_code()
returns text
language plpgsql
as $$
begin
  return 'LOS-' || upper(substr(md5(gen_random_uuid()::text), 1, 12));
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Default service templates (not tenant-scoped — used only to seed a new
-- tenant's service list on first branch creation via server action).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists default_service_templates (
  id               uuid primary key default gen_random_uuid(),
  name_en          text not null,
  name_ar          text not null,
  category         text,
  base_price       numeric(10,3) not null,
  turnaround_hours int default 24,
  display_order    int default 0
);

insert into default_service_templates
  (name_en, name_ar, category, base_price, turnaround_hours, display_order)
values
  ('Wash & Fold',           'غسيل وطي',            'wash_fold',    0.500,  24, 1),
  ('Wash & Iron',           'غسيل وكوي',           'wash_fold',    0.750,  24, 2),
  ('Dry Cleaning',          'تنظيف جاف',            'dry_clean',    1.500,  48, 3),
  ('Dry Clean & Press',     'تنظيف جاف وكوي',       'dry_clean',    2.000,  48, 4),
  ('Iron Only',             'كوي فقط',              'iron_only',    0.250,  12, 5),
  ('Abaya Dry Clean',       'تنظيف جاف عباءة',      'dry_clean',    2.500,  48, 6),
  ('Dishdasha Dry Clean',   'تنظيف جاف دشداشة',     'dry_clean',    2.000,  48, 7),
  ('Suit Dry Clean',        'تنظيف جاف بدلة',       'dry_clean',    3.500,  72, 8),
  ('Blanket / Comforter',   'بطانية / لحاف',        'special_care', 4.000,  72, 9),
  ('Curtain (per meter)',   'ستارة (لكل متر)',       'special_care', 1.500,  72, 10)
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Notifications log (Phase 1: record sent WhatsApp / SMS messages)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists notifications_log (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  order_id    uuid references orders(id) on delete set null,
  channel     text not null check (channel in ('whatsapp','sms','email')),
  template    text not null,
  recipient   text not null,
  status      text default 'sent' check (status in ('sent','failed','delivered','read')),
  provider_id text,
  sent_at     timestamptz default now()
);

alter table notifications_log enable row level security;

create policy notifications_log_tenant on notifications_log
  using (
    tenant_id = (
      select tenant_id from user_profiles where id = auth.uid()
    )
  );

create index if not exists idx_notifications_tenant on notifications_log(tenant_id);
create index if not exists idx_notifications_order  on notifications_log(order_id);
-- LaundryOS — Phase 2: Multi-Branch Operations, Inventory, Accounting, Reporting

-- ─────────────────────────────────────────────────────────────────────────────
-- INVENTORY ITEMS  (consumables tracked per branch)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists inventory_items (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  branch_id           uuid references branches(id) on delete cascade,
  name                text not null,
  unit                text not null default 'pcs'
    check (unit in ('pcs','kg','litre','box','roll')),
  current_qty         numeric(10,3) not null default 0,
  reorder_threshold   numeric(10,3) not null default 0,
  cost_per_unit       numeric(10,3),
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table inventory_items enable row level security;

create policy inventory_items_tenant on inventory_items
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- INVENTORY TRANSACTIONS  (every stock in/out is immutable)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists inventory_transactions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  item_id      uuid not null references inventory_items(id) on delete cascade,
  txn_type     text not null
    check (txn_type in ('restock','usage','adjustment','waste')),
  qty_delta    numeric(10,3) not null,   -- positive = in, negative = out
  note         text,
  reference_id uuid,                     -- e.g. order_id for usage transactions
  actor_id     uuid references user_profiles(id),
  created_at   timestamptz default now()
);

alter table inventory_transactions enable row level security;

create policy inventory_txn_tenant on inventory_transactions
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

-- Trigger: keep current_qty in sync with transactions
create or replace function update_inventory_qty()
returns trigger language plpgsql security definer as $$
begin
  update inventory_items
     set current_qty = current_qty + new.qty_delta,
         updated_at  = now()
   where id = new.item_id;
  return new;
end;
$$;

create trigger trg_inventory_qty
after insert on inventory_transactions
for each row execute function update_inventory_qty();

-- ─────────────────────────────────────────────────────────────────────────────
-- EQUIPMENT  (machines per branch)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists equipment (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  branch_id      uuid not null references branches(id) on delete cascade,
  name           text not null,
  eq_type        text not null
    check (eq_type in ('washer','dryer','ironer','dry_clean','other')),
  model          text,
  serial_number  text,
  purchased_at   date,
  next_service   date,
  is_active      boolean default true,
  created_at     timestamptz default now()
);

alter table equipment enable row level security;

create policy equipment_tenant on equipment
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- MAINTENANCE LOGS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists maintenance_logs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  equipment_id  uuid not null references equipment(id) on delete cascade,
  serviced_at   date not null default current_date,
  description   text,
  cost          numeric(10,3) default 0,
  next_service  date,
  actor_id      uuid references user_profiles(id),
  created_at    timestamptz default now()
);

alter table maintenance_logs enable row level security;

create policy maintenance_logs_tenant on maintenance_logs
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

-- Update equipment.next_service when a maintenance log is inserted
create or replace function sync_equipment_next_service()
returns trigger language plpgsql security definer as $$
begin
  if new.next_service is not null then
    update equipment set next_service = new.next_service where id = new.equipment_id;
  end if;
  return new;
end;
$$;

create trigger trg_equipment_service
after insert on maintenance_logs
for each row execute function sync_equipment_next_service();

-- ─────────────────────────────────────────────────────────────────────────────
-- CHART OF ACCOUNTS  (seeded defaults for each new tenant)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists chart_of_accounts (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  code        text not null,
  name_en     text not null,
  name_ar     text not null,
  account_type text not null
    check (account_type in ('revenue','expense','asset','liability','equity')),
  parent_id   uuid references chart_of_accounts(id),
  is_system   boolean default false,
  created_at  timestamptz default now(),
  unique (tenant_id, code)
);

alter table chart_of_accounts enable row level security;

create policy coa_tenant on chart_of_accounts
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- EXPENSES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  branch_id      uuid references branches(id),
  account_id     uuid references chart_of_accounts(id),
  amount         numeric(10,3) not null,
  description    text not null,
  expense_date   date not null default current_date,
  receipt_url    text,
  recorded_by    uuid references user_profiles(id),
  created_at     timestamptz default now()
);

alter table expenses enable row level security;

create policy expenses_tenant on expenses
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- CASH RECONCILIATION  (daily per branch per shift)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists cash_reconciliation (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  branch_id         uuid not null references branches(id),
  reconciliation_date date not null default current_date,
  shift             text default 'day' check (shift in ('day','night')),
  expected_cash     numeric(10,3) not null,   -- from cash payments in system
  counted_cash      numeric(10,3) not null,   -- physically counted
  variance          numeric(10,3) generated always as (counted_cash - expected_cash) stored,
  note              text,
  reconciled_by     uuid references user_profiles(id),
  created_at        timestamptz default now(),
  unique (branch_id, reconciliation_date, shift)
);

alter table cash_reconciliation enable row level security;

create policy cash_recon_tenant on cash_reconciliation
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNCTION: seed default chart of accounts for a new tenant
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function seed_chart_of_accounts(p_tenant_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into chart_of_accounts (tenant_id, code, name_en, name_ar, account_type, is_system) values
    (p_tenant_id, '4000', 'Revenue',            'الإيرادات',            'revenue',   true),
    (p_tenant_id, '4100', 'Laundry Revenue',    'إيرادات الغسيل',       'revenue',   true),
    (p_tenant_id, '4200', 'Delivery Revenue',   'إيرادات التوصيل',      'revenue',   true),
    (p_tenant_id, '5000', 'Expenses',           'المصروفات',            'expense',   true),
    (p_tenant_id, '5100', 'Rent',               'الإيجار',              'expense',   true),
    (p_tenant_id, '5200', 'Utilities',          'المرافق',              'expense',   true),
    (p_tenant_id, '5300', 'Wages',              'الرواتب',              'expense',   true),
    (p_tenant_id, '5400', 'Supplies',           'المستلزمات',           'expense',   true),
    (p_tenant_id, '5500', 'Equipment Maint.',   'صيانة المعدات',        'expense',   true),
    (p_tenant_id, '5600', 'Marketing',          'التسويق',              'expense',   true),
    (p_tenant_id, '5900', 'Miscellaneous',      'متنوع',                'expense',   true)
  on conflict (tenant_id, code) do nothing;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_inventory_items_tenant   on inventory_items(tenant_id);
create index if not exists idx_inventory_items_branch   on inventory_items(branch_id);
create index if not exists idx_inventory_txn_item       on inventory_transactions(item_id);
create index if not exists idx_inventory_txn_tenant     on inventory_transactions(tenant_id);
create index if not exists idx_equipment_branch         on equipment(branch_id);
create index if not exists idx_maintenance_equipment    on maintenance_logs(equipment_id);
create index if not exists idx_expenses_tenant          on expenses(tenant_id);
create index if not exists idx_expenses_branch          on expenses(branch_id);
create index if not exists idx_expenses_date            on expenses(expense_date);
create index if not exists idx_cash_recon_branch        on cash_reconciliation(branch_id);
create index if not exists idx_cash_recon_date          on cash_reconciliation(reconciliation_date);
create index if not exists idx_coa_tenant               on chart_of_accounts(tenant_id);
-- LaundryOS — Phase 3: Delivery Runs & Stops
-- Customer subscription tables already exist from Phase 0 migration.

-- ─────────────────────────────────────────────────────────────────────────────
-- DELIVERY RUNS  (one driver, one branch, one date)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists delivery_runs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  branch_id   uuid not null references branches(id),
  driver_id   uuid references user_profiles(id),
  run_date    date not null default current_date,
  status      text not null default 'planned'
    check (status in ('planned','in_progress','completed','cancelled')),
  notes       text,
  created_at  timestamptz default now()
);

alter table delivery_runs enable row level security;

create policy delivery_runs_tenant on delivery_runs
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- DELIVERY STOPS  (one order per stop; ordered by sequence)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists delivery_stops (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  run_id        uuid not null references delivery_runs(id) on delete cascade,
  order_id      uuid not null references orders(id),
  sequence      int not null default 1,
  address       text,
  stop_type     text not null default 'dropoff'
    check (stop_type in ('pickup','dropoff')),
  status        text not null default 'pending'
    check (status in ('pending','arrived','completed','failed')),
  completed_at  timestamptz,
  driver_note   text,
  created_at    timestamptz default now(),
  unique (run_id, order_id)
);

alter table delivery_stops enable row level security;

create policy delivery_stops_tenant on delivery_stops
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_delivery_runs_tenant   on delivery_runs(tenant_id);
create index if not exists idx_delivery_runs_branch   on delivery_runs(branch_id);
create index if not exists idx_delivery_runs_driver   on delivery_runs(driver_id);
create index if not exists idx_delivery_runs_date     on delivery_runs(run_date);
create index if not exists idx_delivery_stops_run     on delivery_stops(run_id);
create index if not exists idx_delivery_stops_order   on delivery_stops(order_id);
create index if not exists idx_delivery_stops_tenant  on delivery_stops(tenant_id);
-- LaundryOS — Phase 4: API Keys for Enterprise tenants
-- Keys are stored as SHA-256 hashes; raw key shown only once at creation.

create table if not exists api_keys (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  name           text not null,
  key_hash       text not null unique,   -- sha256(raw_key) stored hex-encoded
  key_prefix     text not null,          -- first 8 chars of raw key for display
  is_active      boolean not null default true,
  last_used_at   timestamptz,
  created_by     uuid references user_profiles(id),
  created_at     timestamptz default now()
);

alter table api_keys enable row level security;

create policy api_keys_tenant on api_keys
  using (
    tenant_id = (select tenant_id from user_profiles where id = auth.uid())
  );

create index if not exists idx_api_keys_tenant on api_keys(tenant_id);
create index if not exists idx_api_keys_hash   on api_keys(key_hash);

-- Optional tax rate per tenant (Kuwait = 0%, future GCC VAT support)
alter table tenants add column if not exists tax_rate numeric(5,2) default 0;

-- touch last_used_at — called by service-role in API auth helper
create or replace function touch_api_key(p_key_hash text)
returns void language plpgsql security definer as $$
begin
  update api_keys set last_used_at = now() where key_hash = p_key_hash;
end;
$$;
