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
