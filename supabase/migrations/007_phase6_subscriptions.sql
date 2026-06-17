-- LaundryOS — Phase 6: Enhanced Subscription Models + Customer Wallet

-- ─────────────────────────────────────────────────────────────────────────────
-- ENHANCE SUBSCRIPTION PLANS
-- ─────────────────────────────────────────────────────────────────────────────
alter table customer_subscription_plans
  add column if not exists plan_type              text default 'item_bundle'
    check (plan_type in ('credit','item_bundle','weight')),
  add column if not exists credit_amount          numeric(10,3),   -- for credit plans
  add column if not exists credit_validity_days   int default 365,
  add column if not exists bonus_items            int,             -- flat bonus items
  add column if not exists bonus_items_pct        numeric(5,2),    -- or bonus as % of included
  add column if not exists allowed_category_ids   uuid[],          -- null = all categories OK
  add column if not exists rollover_enabled       boolean default false,
  add column if not exists rollover_cap           int,             -- max items to roll over
  add column if not exists overage_price_per_item numeric(10,3),
  add column if not exists overage_price_per_kg   numeric(10,3),
  add column if not exists cancellation_policy    text default 'no_refund'
    check (cancellation_policy in
      ('full_refund','pro_rata','no_refund','credit_conversion','cancellation_fee')),
  add column if not exists cancellation_fee       numeric(10,3) default 0,
  add column if not exists description_en         text,
  add column if not exists description_ar         text,
  add column if not exists is_active              boolean default true;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENHANCE CUSTOMER SUBSCRIPTIONS
-- ─────────────────────────────────────────────────────────────────────────────
alter table customer_subscriptions
  add column if not exists bonus_items_remaining  int default 0,
  add column if not exists wallet_credit_balance  numeric(10,3) default 0,
  add column if not exists paused_at              date,
  add column if not exists pause_until            date,
  add column if not exists cancellation_reason    text,
  add column if not exists rollover_items         int default 0;  -- carried over from last period

-- ─────────────────────────────────────────────────────────────────────────────
-- CUSTOMER WALLETS  (one per customer per tenant)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists customer_wallets (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  balance     numeric(10,3) not null default 0,
  updated_at  timestamptz default now(),
  unique (tenant_id, customer_id)
);

alter table customer_wallets enable row level security;

create policy customer_wallets_tenant on customer_wallets
  using (tenant_id = (select tenant_id from user_profiles where id = auth.uid()));

create index if not exists idx_customer_wallets_tenant   on customer_wallets(tenant_id);
create index if not exists idx_customer_wallets_customer on customer_wallets(customer_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- WALLET TRANSACTIONS  (immutable ledger)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists customer_wallet_transactions (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  customer_id    uuid not null references customers(id) on delete cascade,
  wallet_id      uuid not null references customer_wallets(id) on delete cascade,
  txn_type       text not null check (txn_type in ('credit','debit')),
  amount         numeric(10,3) not null,
  description    text not null,
  reference_id   uuid,
  reference_type text check (reference_type in ('invoice','subscription','manual','credit_note','refund')),
  actor_id       uuid references user_profiles(id),
  created_at     timestamptz default now()
);

alter table customer_wallet_transactions enable row level security;

create policy customer_wallet_txns_tenant on customer_wallet_transactions
  using (tenant_id = (select tenant_id from user_profiles where id = auth.uid()));

create index if not exists idx_wallet_txns_tenant   on customer_wallet_transactions(tenant_id);
create index if not exists idx_wallet_txns_customer on customer_wallet_transactions(customer_id);
create index if not exists idx_wallet_txns_wallet   on customer_wallet_transactions(wallet_id);

-- Trigger: keep wallet.balance in sync
create or replace function sync_wallet_balance()
returns trigger language plpgsql security definer as $$
begin
  update customer_wallets
     set balance    = balance + case when new.txn_type = 'credit' then new.amount else -new.amount end,
         updated_at = now()
   where id = new.wallet_id;
  return new;
end;
$$;

create trigger trg_wallet_balance
after insert on customer_wallet_transactions
for each row execute function sync_wallet_balance();

-- ─────────────────────────────────────────────────────────────────────────────
-- SUBSCRIPTION CANCELLATION REQUESTS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists subscription_cancellation_requests (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  subscription_id uuid not null references customer_subscriptions(id),
  requested_by    uuid references user_profiles(id),
  reason          text,
  refund_amount   numeric(10,3) not null default 0,
  refund_method   text check (refund_method in ('cash','knet','wallet_credit','none')),
  status          text not null default 'pending'
    check (status in ('pending','approved','rejected','completed')),
  approved_by     uuid references user_profiles(id),
  notes           text,
  created_at      timestamptz default now(),
  resolved_at     timestamptz
);

alter table subscription_cancellation_requests enable row level security;

create policy sub_cancel_tenant on subscription_cancellation_requests
  using (tenant_id = (select tenant_id from user_profiles where id = auth.uid()));

create index if not exists idx_sub_cancel_tenant on subscription_cancellation_requests(tenant_id);
create index if not exists idx_sub_cancel_sub    on subscription_cancellation_requests(subscription_id);
