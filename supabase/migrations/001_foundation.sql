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
