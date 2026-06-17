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
