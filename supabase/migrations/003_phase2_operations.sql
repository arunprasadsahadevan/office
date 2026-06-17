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
