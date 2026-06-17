-- ============================================================
-- LaundryOS — Demo Seed Data
-- ============================================================
-- Creates a fully-populated demo workspace for Al-Noor Laundry.
--
-- Login credentials:  demo@alnoor.kw  /  Demo1234!
--
-- HOW TO RUN:
--   1. Open your Supabase project → SQL Editor → New query
--   2. Paste this entire file and click Run
--   3. The script is idempotent — safe to run more than once
-- ============================================================

do $$
declare
  -- ── Fixed demo IDs ──────────────────────────────────────────────────────────
  v_user_id    uuid := '00000000-dead-beef-0000-000000000001'::uuid;
  v_tenant_id  uuid := '00000000-dead-beef-0000-000000000002'::uuid;
  v_branch1    uuid := '00000000-dead-beef-0000-000000000003'::uuid;
  v_branch2    uuid := '00000000-dead-beef-0000-000000000004'::uuid;

  -- Customers
  v_c1  uuid := '00000000-dead-beef-0000-000000000010'::uuid;
  v_c2  uuid := '00000000-dead-beef-0000-000000000011'::uuid;
  v_c3  uuid := '00000000-dead-beef-0000-000000000012'::uuid;
  v_c4  uuid := '00000000-dead-beef-0000-000000000013'::uuid;
  v_c5  uuid := '00000000-dead-beef-0000-000000000014'::uuid;
  v_c6  uuid := '00000000-dead-beef-0000-000000000015'::uuid;
  v_c7  uuid := '00000000-dead-beef-0000-000000000016'::uuid;
  v_c8  uuid := '00000000-dead-beef-0000-000000000017'::uuid;

  -- Services
  v_svc_wf   uuid := '00000000-dead-beef-0000-000000000020'::uuid;
  v_svc_dc   uuid := '00000000-dead-beef-0000-000000000021'::uuid;
  v_svc_io   uuid := '00000000-dead-beef-0000-000000000022'::uuid;
  v_svc_abt  uuid := '00000000-dead-beef-0000-000000000023'::uuid;
  v_svc_dsh  uuid := '00000000-dead-beef-0000-000000000024'::uuid;
  v_svc_suit uuid := '00000000-dead-beef-0000-000000000025'::uuid;
  v_svc_blk  uuid := '00000000-dead-beef-0000-000000000026'::uuid;
  v_svc_crt  uuid := '00000000-dead-beef-0000-000000000027'::uuid;
  v_svc_shs  uuid := '00000000-dead-beef-0000-000000000028'::uuid;
  v_svc_lgb  uuid := '00000000-dead-beef-0000-000000000029'::uuid;

  -- Orders
  v_o1  uuid := '00000000-dead-beef-0000-000000000030'::uuid;
  v_o2  uuid := '00000000-dead-beef-0000-000000000031'::uuid;
  v_o3  uuid := '00000000-dead-beef-0000-000000000032'::uuid;
  v_o4  uuid := '00000000-dead-beef-0000-000000000033'::uuid;
  v_o5  uuid := '00000000-dead-beef-0000-000000000034'::uuid;
  v_o6  uuid := '00000000-dead-beef-0000-000000000035'::uuid;
  v_o7  uuid := '00000000-dead-beef-0000-000000000036'::uuid;
  v_o8  uuid := '00000000-dead-beef-0000-000000000037'::uuid;
  v_o9  uuid := '00000000-dead-beef-0000-000000000038'::uuid;
  v_o10 uuid := '00000000-dead-beef-0000-000000000039'::uuid;
  v_o11 uuid := '00000000-dead-beef-0000-00000000003a'::uuid;
  v_o12 uuid := '00000000-dead-beef-0000-00000000003b'::uuid;

  -- Invoices for completed (paid) orders 10-12
  v_inv10 uuid := '00000000-dead-beef-0000-000000000050'::uuid;
  v_inv11 uuid := '00000000-dead-beef-0000-000000000051'::uuid;
  v_inv12 uuid := '00000000-dead-beef-0000-000000000052'::uuid;

  -- Inventory items
  v_inv_det  uuid := '00000000-dead-beef-0000-000000000060'::uuid;
  v_inv_soft uuid := '00000000-dead-beef-0000-000000000061'::uuid;
  v_inv_hng  uuid := '00000000-dead-beef-0000-000000000062'::uuid;
  v_inv_bag  uuid := '00000000-dead-beef-0000-000000000063'::uuid;
  v_inv_sol  uuid := '00000000-dead-beef-0000-000000000064'::uuid;
  v_inv_tag  uuid := '00000000-dead-beef-0000-000000000065'::uuid;

  -- Customer subscription plan + subscription
  v_csp_id  uuid := '00000000-dead-beef-0000-000000000070'::uuid;
  v_csub_id uuid := '00000000-dead-beef-0000-000000000071'::uuid;

  -- Delivery run + stops
  v_run_id   uuid := '00000000-dead-beef-0000-000000000080'::uuid;
  v_stop1_id uuid := '00000000-dead-beef-0000-000000000081'::uuid;
  v_stop2_id uuid := '00000000-dead-beef-0000-000000000082'::uuid;

  -- Platform plan & subscription
  v_plan_id     uuid;
  v_plat_sub_id uuid := '00000000-dead-beef-0000-000000000090'::uuid;

  -- Account IDs (queried after seeding CoA)
  v_acct_rent    uuid;
  v_acct_util    uuid;
  v_acct_wages   uuid;
  v_acct_supply  uuid;
  v_acct_maint   uuid;

begin
  -- ── Guard: skip if already seeded ─────────────────────────────────────────
  if exists (select 1 from public.tenants where id = v_tenant_id) then
    raise notice 'Demo data already present — skipping.';
    return;
  end if;

  -- ══════════════════════════════════════════════════════════════════════════
  -- AUTH USER
  -- ══════════════════════════════════════════════════════════════════════════
  insert into auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@alnoor.kw',
    crypt('Demo1234!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(), now(),
    '', '', '', ''
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    'demo@alnoor.kw',
    'email',
    jsonb_build_object('sub', v_user_id::text, 'email', 'demo@alnoor.kw'),
    now(), now(), now()
  ) on conflict do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- TENANT
  -- ══════════════════════════════════════════════════════════════════════════
  insert into tenants (id, name, slug, default_locale, base_currency, brand_primary_color, status)
  values (v_tenant_id, 'Al-Noor Laundry', 'alnoor', 'en', 'KWD', '#1d4ed8', 'active')
  on conflict (id) do nothing;

  -- ── Platform subscription (Growth plan) ──────────────────────────────────
  select id into v_plan_id from platform_plans where name = 'Growth' limit 1;
  insert into platform_subscriptions (id, tenant_id, plan_id, status, current_period_end, payment_method)
  values (v_plat_sub_id, v_tenant_id, v_plan_id, 'active', (now() + interval '30 days')::date, 'knet')
  on conflict (id) do nothing;

  -- ── User profile (owner) ─────────────────────────────────────────────────
  insert into user_profiles (id, tenant_id, branch_id, role, full_name, phone, preferred_locale)
  values (v_user_id, v_tenant_id, null, 'tenant_owner', 'Nasser Al-Noor', '+96550000001', 'en')
  on conflict (id) do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- BRANCHES
  -- ══════════════════════════════════════════════════════════════════════════
  insert into branches (id, tenant_id, name, area, phone, is_active) values
    (v_branch1, v_tenant_id, 'Salmiya Main',         'Salmiya',     '+96522441100', true),
    (v_branch2, v_tenant_id, 'Kuwait City Express',  'Kuwait City', '+96522441200', true)
  on conflict (id) do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- SERVICES
  -- ══════════════════════════════════════════════════════════════════════════
  insert into services (id, tenant_id, name_en, name_ar, category, base_price, turnaround_hours, is_active) values
    (v_svc_wf,   v_tenant_id, 'Wash & Fold',          'غسيل وطي',              'wash_fold',    1.500, 24, true),
    (v_svc_dc,   v_tenant_id, 'Dry Clean – Shirt',    'تنظيف جاف - قميص',      'dry_clean',    1.250, 48, true),
    (v_svc_io,   v_tenant_id, 'Iron Only',            'كي فقط',                'iron_only',    0.500, 12, true),
    (v_svc_abt,  v_tenant_id, 'Abaya – Dry Clean',    'عباية - تنظيف جاف',     'dry_clean',    2.500, 48, true),
    (v_svc_dsh,  v_tenant_id, 'Dishdasha – Wash',     'دشداشة - غسيل',         'wash_fold',    1.750, 24, true),
    (v_svc_suit, v_tenant_id, 'Suit – Dry Clean',     'بدلة - تنظيف جاف',      'dry_clean',    4.000, 72, true),
    (v_svc_blk,  v_tenant_id, 'Blanket – Wash',       'بطانية - غسيل',         'special_care', 3.500, 48, true),
    (v_svc_crt,  v_tenant_id, 'Curtain – Wash',       'ستائر - غسيل',          'special_care', 5.000, 72, true),
    (v_svc_shs,  v_tenant_id, 'Shoes – Clean',        'أحذية - تنظيف',         'special_care', 3.000, 48, true),
    (v_svc_lgb,  v_tenant_id, 'Leather Bag – Clean',  'حقيبة جلدية - تنظيف',  'special_care', 6.000, 72, false)
  on conflict (id) do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- CUSTOMERS
  -- ══════════════════════════════════════════════════════════════════════════
  insert into customers (id, tenant_id, full_name, phone, email, preferred_locale, customer_type) values
    (v_c1, v_tenant_id, 'Ahmed Al-Rashidi',    '+96550001234', 'ahmed@example.kw',    'ar', 'retail'),
    (v_c2, v_tenant_id, 'Fatima Al-Kuwaitiya', '+96550002345', 'fatima@example.kw',   'ar', 'retail'),
    (v_c3, v_tenant_id, 'Mohammed Al-Sabah',   '+96550003456', null,                  'ar', 'retail'),
    (v_c4, v_tenant_id, 'Sara Al-Ahmad',       '+96550004567', 'sara@example.kw',     'en', 'retail'),
    (v_c5, v_tenant_id, 'Abdullah Enterprises','+96522001234', 'orders@abdco.kw',     'en', 'corporate'),
    (v_c6, v_tenant_id, 'Nour Al-Fahad',       '+96550005678', null,                  'ar', 'retail'),
    (v_c7, v_tenant_id, 'Khalid Al-Hamad',     '+96550006789', null,                  'ar', 'retail'),
    (v_c8, v_tenant_id, 'Layla Al-Marri',      '+96550007890', 'layla@example.kw',    'en', 'retail')
  on conflict (id) do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- ORDERS  (12 orders across the status pipeline)
  -- ══════════════════════════════════════════════════════════════════════════
  insert into orders (id, tenant_id, branch_id, customer_id, order_number, status, promised_at, fulfillment_type, created_by, created_at) values
    -- Today — active pipeline
    (v_o1,  v_tenant_id, v_branch1, v_c1, 'ORD-2025-001', 'received',         now() + interval '24h',  'walk_in',         v_user_id, now() - interval '1h'),
    (v_o2,  v_tenant_id, v_branch1, v_c2, 'ORD-2025-002', 'received',         now() + interval '48h',  'walk_in',         v_user_id, now() - interval '30m'),
    (v_o3,  v_tenant_id, v_branch2, v_c3, 'ORD-2025-003', 'sorting',          now() + interval '24h',  'walk_in',         v_user_id, now() - interval '2h'),
    (v_o4,  v_tenant_id, v_branch1, v_c4, 'ORD-2025-004', 'washing',          now() + interval '48h',  'walk_in',         v_user_id, now() - interval '26h'),
    (v_o5,  v_tenant_id, v_branch1, v_c7, 'ORD-2025-005', 'washing',          now() + interval '48h',  'pickup_delivery', v_user_id, now() - interval '25h'),
    (v_o6,  v_tenant_id, v_branch2, v_c6, 'ORD-2025-006', 'drying',           now() + interval '12h',  'walk_in',         v_user_id, now() - interval '28h'),
    (v_o7,  v_tenant_id, v_branch1, v_c5, 'ORD-2025-007', 'ironing',          now() + interval '4h',   'walk_in',         v_user_id, now() - interval '44h'),
    (v_o8,  v_tenant_id, v_branch2, v_c8, 'ORD-2025-008', 'qc',               now() + interval '3h',   'walk_in',         v_user_id, now() - interval '46h'),
    (v_o9,  v_tenant_id, v_branch1, v_c1, 'ORD-2025-009', 'ready',            now() - interval '2h',   'walk_in',         v_user_id, now() - interval '50h'),
    (v_o10, v_tenant_id, v_branch1, v_c3, 'ORD-2025-010', 'out_for_delivery', now() - interval '1h',   'pickup_delivery', v_user_id, now() - interval '52h'),
    -- Completed last week
    (v_o11, v_tenant_id, v_branch1, v_c2, 'ORD-2025-011', 'completed',        now() - interval '5d',   'walk_in',         v_user_id, now() - interval '6d'),
    (v_o12, v_tenant_id, v_branch2, v_c4, 'ORD-2025-012', 'completed',        now() - interval '3d',   'walk_in',         v_user_id, now() - interval '4d')
  on conflict (id) do nothing;

  -- ── Order items ────────────────────────────────────────────────────────────
  insert into order_items (id, order_id, tenant_id, qr_code, garment_type, service_id, status, unit_price) values
    -- ORD-001: Ahmed — 2 dishdashas + 1 iron
    (gen_random_uuid(), v_o1,  v_tenant_id, 'LOS-001-0001', 'Dishdasha',  v_svc_dsh,  'received', 1.750),
    (gen_random_uuid(), v_o1,  v_tenant_id, 'LOS-001-0002', 'Dishdasha',  v_svc_dsh,  'received', 1.750),
    (gen_random_uuid(), v_o1,  v_tenant_id, 'LOS-001-0003', 'Shirt',      v_svc_io,   'received', 0.500),
    -- ORD-002: Fatima — abaya + dress
    (gen_random_uuid(), v_o2,  v_tenant_id, 'LOS-002-0001', 'Abaya',      v_svc_abt,  'received', 2.500),
    (gen_random_uuid(), v_o2,  v_tenant_id, 'LOS-002-0002', 'Dress',      v_svc_io,   'received', 0.500),
    -- ORD-003: Mohammed — wash & fold bag
    (gen_random_uuid(), v_o3,  v_tenant_id, 'LOS-003-0001', 'Mixed Load', v_svc_wf,   'sorting',  1.500),
    (gen_random_uuid(), v_o3,  v_tenant_id, 'LOS-003-0002', 'Mixed Load', v_svc_wf,   'sorting',  1.500),
    -- ORD-004: Sara — suit + 2 shirts
    (gen_random_uuid(), v_o4,  v_tenant_id, 'LOS-004-0001', 'Suit Jacket',v_svc_suit, 'washing',  4.000),
    (gen_random_uuid(), v_o4,  v_tenant_id, 'LOS-004-0002', 'Dress Shirt',v_svc_dc,   'washing',  1.250),
    (gen_random_uuid(), v_o4,  v_tenant_id, 'LOS-004-0003', 'Dress Shirt',v_svc_dc,   'washing',  1.250),
    -- ORD-005: Khalid — blanket + curtain (delivery)
    (gen_random_uuid(), v_o5,  v_tenant_id, 'LOS-005-0001', 'Blanket',    v_svc_blk,  'washing',  3.500),
    (gen_random_uuid(), v_o5,  v_tenant_id, 'LOS-005-0002', 'Curtain',    v_svc_crt,  'washing',  5.000),
    -- ORD-006: Nour — iron only x4
    (gen_random_uuid(), v_o6,  v_tenant_id, 'LOS-006-0001', 'Shirt',      v_svc_io,   'drying',   0.500),
    (gen_random_uuid(), v_o6,  v_tenant_id, 'LOS-006-0002', 'Shirt',      v_svc_io,   'drying',   0.500),
    (gen_random_uuid(), v_o6,  v_tenant_id, 'LOS-006-0003', 'Trousers',   v_svc_io,   'drying',   0.500),
    (gen_random_uuid(), v_o6,  v_tenant_id, 'LOS-006-0004', 'Trousers',   v_svc_io,   'drying',   0.500),
    -- ORD-007: Abdullah (corporate) — 2 suits
    (gen_random_uuid(), v_o7,  v_tenant_id, 'LOS-007-0001', 'Suit',       v_svc_suit, 'ironing',  4.000),
    (gen_random_uuid(), v_o7,  v_tenant_id, 'LOS-007-0002', 'Suit',       v_svc_suit, 'ironing',  4.000),
    -- ORD-008: Layla — abaya + 2 dishdashas
    (gen_random_uuid(), v_o8,  v_tenant_id, 'LOS-008-0001', 'Abaya',      v_svc_abt,  'qc',       2.500),
    (gen_random_uuid(), v_o8,  v_tenant_id, 'LOS-008-0002', 'Dishdasha',  v_svc_dsh,  'qc',       1.750),
    -- ORD-009: Ahmed — wash & fold x3 (ready, linked to subscription)
    (gen_random_uuid(), v_o9,  v_tenant_id, 'LOS-009-0001', 'Mixed Load', v_svc_wf,   'ready',    1.500),
    (gen_random_uuid(), v_o9,  v_tenant_id, 'LOS-009-0002', 'Mixed Load', v_svc_wf,   'ready',    1.500),
    (gen_random_uuid(), v_o9,  v_tenant_id, 'LOS-009-0003', 'T-Shirt',    v_svc_wf,   'ready',    1.500),
    -- ORD-010: Mohammed — blanket (out for delivery)
    (gen_random_uuid(), v_o10, v_tenant_id, 'LOS-010-0001', 'Blanket',    v_svc_blk,  'out_for_delivery', 3.500),
    (gen_random_uuid(), v_o10, v_tenant_id, 'LOS-010-0002', 'Curtain',    v_svc_crt,  'out_for_delivery', 5.000),
    -- ORD-011: Fatima completed last week — abaya x2 + iron
    (gen_random_uuid(), v_o11, v_tenant_id, 'LOS-011-0001', 'Abaya',      v_svc_abt,  'completed', 2.500),
    (gen_random_uuid(), v_o11, v_tenant_id, 'LOS-011-0002', 'Abaya',      v_svc_abt,  'completed', 2.500),
    (gen_random_uuid(), v_o11, v_tenant_id, 'LOS-011-0003', 'Dress',      v_svc_io,   'completed', 0.500),
    -- ORD-012: Sara completed — suit + 2 shirts
    (gen_random_uuid(), v_o12, v_tenant_id, 'LOS-012-0001', 'Suit',       v_svc_suit, 'completed', 4.000),
    (gen_random_uuid(), v_o12, v_tenant_id, 'LOS-012-0002', 'Shirt',      v_svc_dc,   'completed', 1.250),
    (gen_random_uuid(), v_o12, v_tenant_id, 'LOS-012-0003', 'Shirt',      v_svc_dc,   'completed', 1.250)
  on conflict (id) do nothing;

  -- ── Invoices ─────────────────────────────────────────────────────────────
  -- Active/unpaid orders
  insert into invoices (id, tenant_id, customer_id, order_id, invoice_number, subtotal, tax_rate, tax_amount, total, status, created_at) values
    (gen_random_uuid(), v_tenant_id, v_c1, v_o1,  'INV-2025-001', 4.000, 0, 0, 4.000,  'unpaid', now() - interval '1h'),
    (gen_random_uuid(), v_tenant_id, v_c2, v_o2,  'INV-2025-002', 3.000, 0, 0, 3.000,  'unpaid', now() - interval '30m'),
    (gen_random_uuid(), v_tenant_id, v_c3, v_o3,  'INV-2025-003', 3.000, 0, 0, 3.000,  'unpaid', now() - interval '2h'),
    (gen_random_uuid(), v_tenant_id, v_c4, v_o4,  'INV-2025-004', 6.500, 0, 0, 6.500,  'unpaid', now() - interval '26h'),
    (gen_random_uuid(), v_tenant_id, v_c7, v_o5,  'INV-2025-005', 8.500, 0, 0, 8.500,  'unpaid', now() - interval '25h'),
    (gen_random_uuid(), v_tenant_id, v_c6, v_o6,  'INV-2025-006', 2.000, 0, 0, 2.000,  'unpaid', now() - interval '28h'),
    (gen_random_uuid(), v_tenant_id, v_c5, v_o7,  'INV-2025-007', 8.000, 0, 0, 8.000,  'unpaid', now() - interval '44h'),
    (gen_random_uuid(), v_tenant_id, v_c8, v_o8,  'INV-2025-008', 4.250, 0, 0, 4.250,  'unpaid', now() - interval '46h'),
    (gen_random_uuid(), v_tenant_id, v_c1, v_o9,  'INV-2025-009', 4.500, 0, 0, 4.500,  'unpaid', now() - interval '50h'),
    (gen_random_uuid(), v_tenant_id, v_c3, v_o10, 'INV-2025-010', 8.500, 0, 0, 8.500,  'unpaid', now() - interval '52h'),
    -- Paid completed orders
    (v_inv11, v_tenant_id, v_c2, v_o11, 'INV-2025-011', 5.500, 0, 0, 5.500, 'paid', now() - interval '6d'),
    (v_inv12, v_tenant_id, v_c4, v_o12, 'INV-2025-012', 6.500, 0, 0, 6.500, 'paid', now() - interval '4d')
  on conflict (id) do nothing;

  -- ── Payments for completed orders ────────────────────────────────────────
  insert into payments (id, tenant_id, invoice_id, amount, method, collected_by, paid_at) values
    (gen_random_uuid(), v_tenant_id, v_inv11, 5.500, 'cash',  v_user_id, now() - interval '5d'),
    (gen_random_uuid(), v_tenant_id, v_inv12, 6.500, 'knet',  v_user_id, now() - interval '3d')
  on conflict (id) do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- INVENTORY
  -- ══════════════════════════════════════════════════════════════════════════
  insert into inventory_items (id, tenant_id, branch_id, name, unit, current_qty, reorder_threshold, cost_per_unit, notes) values
    (v_inv_det,  v_tenant_id, v_branch1, 'Liquid Detergent',       'kg',    3.000,  5.000, 2.500, 'Main wash chemical'),
    (v_inv_soft, v_tenant_id, v_branch1, 'Fabric Softener',        'litre', 8.000,  2.000, 1.800, null),
    (v_inv_hng,  v_tenant_id, v_branch1, 'Wire Hangers',           'pcs',  45.000, 50.000, 0.050, 'Box of 100 pcs'),
    (v_inv_bag,  v_tenant_id, v_branch2, 'Plastic Garment Bags',   'pcs', 250.000,100.000, 0.020, null),
    (v_inv_sol,  v_tenant_id, v_branch2, 'Dry-Cleaning Solvent',   'litre',15.000, 10.000, 4.200, 'Perchloroethylene'),
    (v_inv_tag,  v_tenant_id, v_branch1, 'Laundry Tags (printed)', 'pcs', 850.000,200.000, 0.010, null)
  on conflict (id) do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- CHART OF ACCOUNTS  (uses the seeder function)
  -- ══════════════════════════════════════════════════════════════════════════
  perform seed_chart_of_accounts(v_tenant_id);

  select id into v_acct_rent   from chart_of_accounts where tenant_id = v_tenant_id and code = '5100' limit 1;
  select id into v_acct_util   from chart_of_accounts where tenant_id = v_tenant_id and code = '5200' limit 1;
  select id into v_acct_wages  from chart_of_accounts where tenant_id = v_tenant_id and code = '5300' limit 1;
  select id into v_acct_supply from chart_of_accounts where tenant_id = v_tenant_id and code = '5400' limit 1;
  select id into v_acct_maint  from chart_of_accounts where tenant_id = v_tenant_id and code = '5500' limit 1;

  -- ══════════════════════════════════════════════════════════════════════════
  -- EXPENSES  (last 30 days)
  -- ══════════════════════════════════════════════════════════════════════════
  insert into expenses (id, tenant_id, branch_id, account_id, amount, description, expense_date, recorded_by) values
    (gen_random_uuid(), v_tenant_id, v_branch1, v_acct_rent,   350.000, 'Monthly rent — Salmiya branch',          (now() - interval '28d')::date, v_user_id),
    (gen_random_uuid(), v_tenant_id, v_branch2, v_acct_rent,   250.000, 'Monthly rent — Kuwait City branch',      (now() - interval '28d')::date, v_user_id),
    (gen_random_uuid(), v_tenant_id, v_branch1, v_acct_util,    85.500, 'Electricity bill — August',              (now() - interval '14d')::date, v_user_id),
    (gen_random_uuid(), v_tenant_id, v_branch2, v_acct_util,    62.000, 'Electricity bill — August',              (now() - interval '14d')::date, v_user_id),
    (gen_random_uuid(), v_tenant_id, v_branch1, v_acct_wages,  420.000, 'Staff wages — August',                   (now() - interval '1d')::date,  v_user_id),
    (gen_random_uuid(), v_tenant_id, v_branch1, v_acct_supply,  42.750, 'Detergent & softener restock',           (now() - interval '7d')::date,  v_user_id),
    (gen_random_uuid(), v_tenant_id, v_branch2, v_acct_supply,  18.500, 'Dry-cleaning solvent refill',            (now() - interval '5d')::date,  v_user_id),
    (gen_random_uuid(), v_tenant_id, v_branch1, v_acct_maint,   25.000, 'Washer drum seal replacement',           (now() - interval '10d')::date, v_user_id)
  on conflict (id) do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- CASH RECONCILIATION
  -- ══════════════════════════════════════════════════════════════════════════
  insert into cash_reconciliation (id, tenant_id, branch_id, reconciliation_date, shift, expected_cash, counted_cash, note, reconciled_by) values
    (gen_random_uuid(), v_tenant_id, v_branch1, now()::date,                    'day',   125.500, 127.000, 'Small overage — likely rounding on change', v_user_id),
    (gen_random_uuid(), v_tenant_id, v_branch1, (now() - interval '1d')::date,  'day',    98.000,  98.000, null,                                        v_user_id),
    (gen_random_uuid(), v_tenant_id, v_branch2, (now() - interval '1d')::date,  'day',    72.500,  70.000, 'KWD 2.500 short — under investigation',     v_user_id)
  on conflict (id) do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- CUSTOMER SUBSCRIPTION PLAN + ENROLLMENT
  -- ══════════════════════════════════════════════════════════════════════════
  insert into customer_subscription_plans (id, tenant_id, name_en, name_ar, billing_cycle, price, included_kg, included_items) values
    (v_csp_id, v_tenant_id,
     'Monthly Premium Pack', 'باقة شهرية مميزة',
     'monthly', 25.000, 20, 50)
  on conflict (id) do nothing;

  -- Enroll Ahmed (v_c1) in the plan with some usage already
  insert into customer_subscriptions (id, tenant_id, customer_id, plan_id, status, current_period_start, current_period_end, used_kg, used_items, payment_method) values
    (v_csub_id, v_tenant_id, v_c1, v_csp_id,
     'active',
     now()::date,
     (now() + interval '30 days')::date,
     8.500, 12,
     'knet_manual_renewal')
  on conflict (id) do nothing;

  -- Link the "ready" order (ORD-009) to this subscription
  update orders set subscription_id = v_csub_id where id = v_o9 and tenant_id = v_tenant_id;

  -- ══════════════════════════════════════════════════════════════════════════
  -- DELIVERY RUN  (active today)
  -- ══════════════════════════════════════════════════════════════════════════
  insert into delivery_runs (id, tenant_id, branch_id, driver_id, run_date, status, notes) values
    (v_run_id, v_tenant_id, v_branch1, null, now()::date, 'in_progress', 'Morning delivery run')
  on conflict (id) do nothing;

  insert into delivery_stops (id, tenant_id, run_id, order_id, sequence, address, stop_type, status) values
    (v_stop1_id, v_tenant_id, v_run_id, v_o5,  1, 'Block 7, Street 12, Salmiya',      'pickup',  'completed'),
    (v_stop2_id, v_tenant_id, v_run_id, v_o10, 2, 'Block 3, Street 5, Kuwait City',    'dropoff', 'pending')
  on conflict (id) do nothing;

  -- Mark stop 1 as completed
  update delivery_stops set status = 'completed', completed_at = now() - interval '40m' where id = v_stop1_id;

  -- ══════════════════════════════════════════════════════════════════════════
  -- NOTIFICATIONS LOG  (some WhatsApp history)
  -- ══════════════════════════════════════════════════════════════════════════
  insert into notifications_log (id, tenant_id, customer_id, order_id, channel, template, recipient, status, provider_id, sent_at) values
    (gen_random_uuid(), v_tenant_id, v_c2, v_o11, 'whatsapp', 'order_ready',   '+96550002345', 'delivered', 'wamid.001', now() - interval '5d'),
    (gen_random_uuid(), v_tenant_id, v_c4, v_o12, 'whatsapp', 'order_ready',   '+96550004567', 'read',      'wamid.002', now() - interval '3d'),
    (gen_random_uuid(), v_tenant_id, v_c1, v_o9,  'whatsapp', 'order_ready',   '+96550001234', 'sent',      'wamid.003', now() - interval '2h'),
    (gen_random_uuid(), v_tenant_id, v_c1, null,   'whatsapp', 'subscription_renewal', '+96550001234', 'delivered', 'wamid.004', now() - interval '1d')
  on conflict (id) do nothing;

  -- ══════════════════════════════════════════════════════════════════════════
  -- DONE
  -- ══════════════════════════════════════════════════════════════════════════
  raise notice '';
  raise notice '✓ Demo data seeded for Al-Noor Laundry';
  raise notice '  Login  :  demo@alnoor.kw';
  raise notice '  Password: Demo1234!';
  raise notice '';
  raise notice '  Tenant : Al-Noor Laundry (slug: alnoor)';
  raise notice '  Branches : Salmiya Main, Kuwait City Express';
  raise notice '  Customers: 8 demo customers';
  raise notice '  Orders   : 12 (received → completed pipeline)';
  raise notice '  Inventory: 6 items (2 below reorder threshold)';
  raise notice '  Delivery : 1 active run with 2 stops';
  raise notice '  Subscription: Ahmed Al-Rashidi on Monthly Premium Pack';

end;
$$;
