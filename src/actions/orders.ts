'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { Order, OrderItem, OrderStatus } from '@/types';
import { getActiveSubscription, deductSubscriptionUsage } from './subscriptions';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const GarmentSchema = z.object({
  garment_type: z.string().min(1),
  service_id: z.string().uuid(),
  unit_price: z.coerce.number().nonnegative(),
  special_instructions: z.string().optional(),
  pre_existing_condition: z
    .object({
      stain: z.boolean().default(false),
      tear: z.boolean().default(false),
      missing_button: z.boolean().default(false),
      faded: z.boolean().default(false),
      photo_urls: z.array(z.string()).default([]),
    })
    .optional(),
});

const CreateOrderSchema = z.object({
  customer_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  fulfillment_type: z.enum(['walk_in', 'pickup_delivery']).default('walk_in'),
  garments: z.array(GarmentSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// ─── Create order ─────────────────────────────────────────────────────────────

export async function createOrder(
  input: CreateOrderInput,
): Promise<{ orderId: string | null; invoiceId: string | null; error: string | null }> {
  const parsed = CreateOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { orderId: null, invoiceId: null, error: parsed.error.errors[0].message };
  }

  const user = await getSessionUser();
  if (!user?.tenant) return { orderId: null, invoiceId: null, error: 'Not authenticated' };

  const { customer_id, branch_id, fulfillment_type, garments } = parsed.data;
  const tenantId = user.tenant.id;
  const supabase = await createClient();

  // Fetch service turnaround for SLA
  const serviceIds = [...new Set(garments.map((g) => g.service_id))];
  const { data: services } = await supabase
    .from('services')
    .select('id, turnaround_hours')
    .in('id', serviceIds);

  const maxTurnaround = Math.max(
    ...(services ?? []).map((s) => s.turnaround_hours ?? 24),
    24,
  );
  const promisedAt = new Date(Date.now() + maxTurnaround * 60 * 60 * 1000).toISOString();

  // Generate order number via DB function
  const { data: orderNumRow } = await supabase.rpc('generate_order_number');
  const orderNumber = (orderNumRow as string | null) ?? `ORD-${Date.now()}`;

  // Create order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      tenant_id: tenantId,
      branch_id,
      customer_id,
      order_number: orderNumber,
      status: 'received',
      promised_at: promisedAt,
      fulfillment_type,
      created_by: user.id,
    })
    .select()
    .single();

  if (orderErr || !order) {
    return { orderId: null, invoiceId: null, error: orderErr?.message ?? 'Failed to create order' };
  }

  // Create order items with QR codes
  const itemRows = await Promise.all(
    garments.map(async (g) => {
      const { data: qrRow } = await supabase.rpc('generate_qr_code');
      return {
        order_id: order.id,
        tenant_id: tenantId,
        qr_code: (qrRow as string | null) ?? `LOS-${crypto.randomUUID().replace(/-/g, '').substring(0, 12).toUpperCase()}`,
        garment_type: g.garment_type,
        service_id: g.service_id,
        special_instructions: g.special_instructions ?? null,
        pre_existing_condition: g.pre_existing_condition ?? null,
        status: 'received',
        unit_price: g.unit_price,
      };
    }),
  );

  const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
  if (itemsErr) {
    return { orderId: order.id, invoiceId: null, error: itemsErr.message };
  }

  // Calculate invoice totals
  const subtotal = garments.reduce((sum, g) => sum + g.unit_price, 0);
  const total = subtotal; // tax_rate = 0 for Kuwait (config-driven)

  // Generate invoice number
  const invoiceNumber = orderNumber.replace('ORD-', 'INV-');

  const { data: invoice, error: invoiceErr } = await supabase
    .from('invoices')
    .insert({
      tenant_id: tenantId,
      customer_id,
      order_id: order.id,
      invoice_number: invoiceNumber,
      subtotal,
      tax_rate: 0,
      tax_amount: 0,
      total,
      status: 'unpaid',
    })
    .select()
    .single();

  if (invoiceErr) {
    return { orderId: order.id, invoiceId: null, error: invoiceErr.message };
  }

  // Audit log
  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    actor_id: user.id,
    action: 'create',
    entity: 'order',
    entity_id: order.id,
    diff: { order_number: orderNumber, item_count: garments.length, total },
  });

  // Deduct subscription usage if customer has an active subscription
  const activeSub = await getActiveSubscription(customer_id);
  if (activeSub) {
    await deductSubscriptionUsage(activeSub.id, undefined, garments.length);
    await supabase
      .from('orders')
      .update({ subscription_id: activeSub.id })
      .eq('id', order.id)
      .eq('tenant_id', tenantId);
  }

  return { orderId: order.id, invoiceId: invoice.id, error: null };
}

// ─── List orders ──────────────────────────────────────────────────────────────

export async function listOrders(
  page = 0,
  pageSize = 30,
  statusFilter?: OrderStatus,
) {
  const user = await getSessionUser();
  if (!user?.tenant) return { data: [], count: 0 };

  const supabase = await createClient();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from('orders')
    .select(
      `*, customer:customers(id,full_name,phone), branch:branches(id,name),
       invoices(id,total,status)`,
      { count: 'exact' },
    )
    .eq('tenant_id', user.tenant.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (statusFilter) q = q.eq('status', statusFilter);

  const { data, count } = await q;
  return { data: data ?? [], count: count ?? 0 };
}

// ─── Get full order detail ────────────────────────────────────────────────────

export async function getOrder(orderId: string) {
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('orders')
    .select(
      `*, customer:customers(*), branch:branches(*),
       order_items(*, service:services(id,name_en,name_ar,category)),
       invoices(*)`,
    )
    .eq('id', orderId)
    .eq('tenant_id', user.tenant.id)
    .single();

  return data;
}

// ─── Update order status ──────────────────────────────────────────────────────

const ORDER_STATUS_FLOW: OrderStatus[] = [
  'received', 'sorting', 'washing', 'drying', 'ironing',
  'qc', 'ready', 'out_for_delivery', 'completed',
];

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .eq('tenant_id', user.tenant.id);

  if (!error) {
    await supabase.from('audit_log').insert({
      tenant_id: user.tenant.id,
      actor_id: user.id,
      action: 'status_update',
      entity: 'order',
      entity_id: orderId,
      diff: { new_status: newStatus },
    });
  }

  return { error: error?.message ?? null };
}

// ─── Update individual item status via QR scan ───────────────────────────────

export async function scanGarment(
  qrCode: string,
  newStatus: string,
): Promise<{ item: OrderItem | null; error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { item: null, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data: item, error: fetchErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('qr_code', qrCode)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (fetchErr || !item) {
    return { item: null, error: 'Garment not found' };
  }

  const { error: updateErr } = await supabase
    .from('order_items')
    .update({ status: newStatus })
    .eq('id', item.id)
    .eq('tenant_id', user.tenant.id);

  if (updateErr) return { item: null, error: updateErr.message };
  return { item: { ...item, status: newStatus } as OrderItem, error: null };
}

// ─── Record a cash payment ────────────────────────────────────────────────────

export async function recordCashPayment(
  invoiceId: string,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id,total,tenant_id')
    .eq('id', invoiceId)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!invoice) return { error: 'Invoice not found' };

  const { error: payErr } = await supabase.from('payments').insert({
    tenant_id: user.tenant.id,
    invoice_id: invoiceId,
    amount: invoice.total,
    method: 'cash',
    collected_by: user.id,
  });

  if (payErr) return { error: payErr.message };

  const { error: invErr } = await supabase
    .from('invoices')
    .update({ status: 'paid' })
    .eq('id', invoiceId)
    .eq('tenant_id', user.tenant.id);

  return { error: invErr?.message ?? null };
}

// ─── Dashboard KPI fetch ──────────────────────────────────────────────────────

export async function getDashboardKpis() {
  const user = await getSessionUser();
  if (!user?.tenant) return { ordersToday: 0, revenueToday: 0, pendingPickups: 0, slaAtRisk: 0, lowStockItems: 0 };

  const supabase = await createClient();
  const tenantId = user.tenant.id;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [ordersRes, revenueRes, pickupsRes, slaRes, inventoryRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', todayStart.toISOString()),

    supabase
      .from('invoices')
      .select('total')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .gte('created_at', todayStart.toISOString()),

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('fulfillment_type', 'pickup_delivery')
      .in('status', ['received', 'ready']),

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '(completed,cancelled)')
      .lt('promised_at', new Date().toISOString()),

    supabase
      .from('inventory_items')
      .select('id,current_qty,reorder_threshold')
      .eq('tenant_id', tenantId),
  ]);

  const revenueToday = (revenueRes.data ?? []).reduce(
    (sum, inv) => sum + Number(inv.total),
    0,
  );

  const lowStockItems = (inventoryRes.data ?? []).filter(
    (item) => Number(item.current_qty) <= Number(item.reorder_threshold),
  ).length;

  return {
    ordersToday: ordersRes.count ?? 0,
    revenueToday,
    pendingPickups: pickupsRes.count ?? 0,
    slaAtRisk: slaRes.count ?? 0,
    lowStockItems,
  };
}
