-- LaundryOS — Phase 5: Garment/Item Master + Express Service Support

-- ─────────────────────────────────────────────────────────────────────────────
-- GARMENT CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists garment_categories (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  name_en       text not null,
  name_ar       text not null,
  icon          text,           -- emoji or icon identifier
  display_order int  default 0,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

alter table garment_categories enable row level security;

create policy garment_categories_tenant on garment_categories
  using (tenant_id = (select tenant_id from user_profiles where id = auth.uid()));

create index if not exists idx_garment_categories_tenant on garment_categories(tenant_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- GARMENT ITEMS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists garment_items (
  id                        uuid primary key default gen_random_uuid(),
  tenant_id                 uuid not null references tenants(id) on delete cascade,
  category_id               uuid not null references garment_categories(id) on delete cascade,
  name_en                   text not null,
  name_ar                   text not null,
  photo_url                 text,
  default_service_id        uuid references services(id) on delete set null,
  allowed_service_categories text[],        -- null = all; or ['dry_clean','iron_only']
  is_subscription_eligible  boolean default true,
  special_handling          jsonb,          -- {delicate, no_spin, no_tumble_dry}
  display_order             int  default 0,
  is_active                 boolean default true,
  created_at                timestamptz default now()
);

alter table garment_items enable row level security;

create policy garment_items_tenant on garment_items
  using (tenant_id = (select tenant_id from user_profiles where id = auth.uid()));

create index if not exists idx_garment_items_tenant   on garment_items(tenant_id);
create index if not exists idx_garment_items_category on garment_items(category_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ENHANCE SERVICES: express pricing + turnaround
-- ─────────────────────────────────────────────────────────────────────────────
alter table services
  add column if not exists express_price             numeric(10,3),
  add column if not exists express_turnaround_hours  int;

-- ─────────────────────────────────────────────────────────────────────────────
-- ENHANCE ORDER ITEMS: express flag, item reference, surcharge
-- ─────────────────────────────────────────────────────────────────────────────
alter table order_items
  add column if not exists item_id          uuid references garment_items(id) on delete set null,
  add column if not exists is_express       boolean default false,
  add column if not exists express_surcharge numeric(10,3) default 0;

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DEFAULT CATEGORIES + ITEMS  (convenience function called per new tenant)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function seed_garment_catalog(p_tenant_id uuid)
returns void language plpgsql security definer as $$
declare
  v_cat_traditional uuid;
  v_cat_formal      uuid;
  v_cat_casual      uuid;
  v_cat_ladies      uuid;
  v_cat_household   uuid;
  v_cat_accessories uuid;
begin
  -- Categories
  insert into garment_categories (tenant_id, name_en, name_ar, icon, display_order) values
    (p_tenant_id, 'Traditional Wear', 'الملابس التقليدية', '👘', 1),
    (p_tenant_id, 'Formal Wear',      'الملابس الرسمية',  '👔', 2),
    (p_tenant_id, 'Casual Wear',      'الملابس الكاجوال', '👕', 3),
    (p_tenant_id, 'Ladies Wear',      'ملابس الأنثى',    '👗', 4),
    (p_tenant_id, 'Household',        'مفروشات المنزل',   '🛏', 5),
    (p_tenant_id, 'Accessories',      'إكسسوارات',        '👜', 6)
  on conflict do nothing
  returning id into v_cat_traditional;

  select id into v_cat_traditional from garment_categories
    where tenant_id = p_tenant_id and name_en = 'Traditional Wear' limit 1;
  select id into v_cat_formal from garment_categories
    where tenant_id = p_tenant_id and name_en = 'Formal Wear' limit 1;
  select id into v_cat_casual from garment_categories
    where tenant_id = p_tenant_id and name_en = 'Casual Wear' limit 1;
  select id into v_cat_ladies from garment_categories
    where tenant_id = p_tenant_id and name_en = 'Ladies Wear' limit 1;
  select id into v_cat_household from garment_categories
    where tenant_id = p_tenant_id and name_en = 'Household' limit 1;
  select id into v_cat_accessories from garment_categories
    where tenant_id = p_tenant_id and name_en = 'Accessories' limit 1;

  -- Traditional Wear items
  insert into garment_items (tenant_id, category_id, name_en, name_ar, display_order) values
    (p_tenant_id, v_cat_traditional, 'Dishdasha',  'دشداشة',  1),
    (p_tenant_id, v_cat_traditional, 'Abaya',      'عباءة',   2),
    (p_tenant_id, v_cat_traditional, 'Bisht',      'بشت',     3),
    (p_tenant_id, v_cat_traditional, 'Ghutra',     'غترة',    4),
    (p_tenant_id, v_cat_traditional, 'Thobe',      'ثوب',     5)
  on conflict do nothing;

  -- Formal Wear items
  insert into garment_items (tenant_id, category_id, name_en, name_ar, display_order,
    allowed_service_categories) values
    (p_tenant_id, v_cat_formal, 'Suit Jacket',  'جاكيت بدلة', 1, array['dry_clean','iron_only']),
    (p_tenant_id, v_cat_formal, 'Suit Trousers','بنطلون بدلة',2, array['dry_clean','iron_only']),
    (p_tenant_id, v_cat_formal, 'Dress Shirt',  'قميص رسمي',  3, array['dry_clean','wash_fold','iron_only']),
    (p_tenant_id, v_cat_formal, 'Blazer',       'بليزر',      4, array['dry_clean','iron_only']),
    (p_tenant_id, v_cat_formal, 'Neck Tie',     'ربطة عنق',   5, array['dry_clean'])
  on conflict do nothing;

  -- Casual Wear items
  insert into garment_items (tenant_id, category_id, name_en, name_ar, display_order) values
    (p_tenant_id, v_cat_casual, 'T-Shirt',   'تي شيرت', 1),
    (p_tenant_id, v_cat_casual, 'Jeans',     'جينز',    2),
    (p_tenant_id, v_cat_casual, 'Polo Shirt','بولو',     3),
    (p_tenant_id, v_cat_casual, 'Jacket',    'جاكيت',   4),
    (p_tenant_id, v_cat_casual, 'Shorts',    'شورت',    5)
  on conflict do nothing;

  -- Ladies Wear items
  insert into garment_items (tenant_id, category_id, name_en, name_ar, display_order) values
    (p_tenant_id, v_cat_ladies, 'Dress',    'فستان',  1),
    (p_tenant_id, v_cat_ladies, 'Blouse',   'بلوزة',  2),
    (p_tenant_id, v_cat_ladies, 'Skirt',    'تنورة',  3),
    (p_tenant_id, v_cat_ladies, 'Cardigan', 'كارديجن',4),
    (p_tenant_id, v_cat_ladies, 'Scarf',    'وشاح',   5)
  on conflict do nothing;

  -- Household items (not subscription-eligible by default)
  insert into garment_items (tenant_id, category_id, name_en, name_ar, display_order,
    is_subscription_eligible, allowed_service_categories) values
    (p_tenant_id, v_cat_household, 'Blanket',      'بطانية',  1, false, array['wash_fold','special_care']),
    (p_tenant_id, v_cat_household, 'Duvet',        'لحاف',    2, false, array['wash_fold','special_care']),
    (p_tenant_id, v_cat_household, 'Curtain',      'ستارة',   3, false, array['wash_fold','special_care']),
    (p_tenant_id, v_cat_household, 'Bedsheet',     'ملاءة',   4, false, array['wash_fold']),
    (p_tenant_id, v_cat_household, 'Pillow Cover', 'غطاء وسادة',5, false, array['wash_fold']),
    (p_tenant_id, v_cat_household, 'Towel',        'منشفة',   6, false, array['wash_fold'])
  on conflict do nothing;

  -- Accessories (not subscription-eligible)
  insert into garment_items (tenant_id, category_id, name_en, name_ar, display_order,
    is_subscription_eligible, allowed_service_categories) values
    (p_tenant_id, v_cat_accessories, 'Shoes',      'حذاء',       1, false, array['special_care']),
    (p_tenant_id, v_cat_accessories, 'Leather Bag','حقيبة جلد',  2, false, array['special_care']),
    (p_tenant_id, v_cat_accessories, 'Belt',       'حزام',       3, false, array['special_care']),
    (p_tenant_id, v_cat_accessories, 'Handbag',    'حقيبة يد',   4, false, array['special_care'])
  on conflict do nothing;

end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES on enhanced columns
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_order_items_is_express on order_items(is_express) where is_express = true;
create index if not exists idx_order_items_item_id    on order_items(item_id);
