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
