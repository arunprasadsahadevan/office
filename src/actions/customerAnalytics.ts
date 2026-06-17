'use server';

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';

export interface CustomerStats {
  lifetime_spend: number;
  total_orders: number;
  outstanding_balance: number;
  last_order_date: string | null;
  first_order_date: string | null;
  avg_order_value: number;
  orders_this_month: number;
  favourite_service: string | null;
}

export interface MonthlyOrderData {
  month: string;   // "2025-01"
  order_count: number;
  revenue: number;
}

export interface CustomerInvoiceSummary {
  id: string;
  invoice_number: string;
  total: number;
  status: string;
  created_at: string;
  order_number: string | null;
}

export async function getCustomerStats(customerId: string): Promise<CustomerStats | null> {
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const supabase = await createClient();

  const [ordersRes, invoicesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, created_at')
      .eq('tenant_id', user.tenant.id)
      .eq('customer_id', customerId)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false }),

    supabase
      .from('invoices')
      .select('id, total, status, created_at, order:orders(order_number)')
      .eq('tenant_id', user.tenant.id)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ]);

  const orders = ordersRes.data ?? [];
  const invoices = invoicesRes.data ?? [];

  const paidInvoices = invoices.filter((i) => i.status === 'paid');
  const unpaidInvoices = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status));

  const lifetimeSpend = paidInvoices.reduce((s, i) => s + Number(i.total), 0);
  const outstanding = unpaidInvoices.reduce((s, i) => s + Number(i.total), 0);

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const ordersThisMonth = orders.filter(
    (o) => new Date(o.created_at) >= thisMonthStart,
  ).length;

  // Favourite service
  const { data: itemsData } = await supabase
    .from('order_items')
    .select('service:services(name_en)')
    .in('order_id', orders.slice(0, 100).map((o) => o.id));

  const serviceCounts: Record<string, number> = {};
  (itemsData ?? []).forEach((item) => {
    const svcRaw = item.service as unknown;
    const svc = svcRaw && typeof svcRaw === 'object' && !Array.isArray(svcRaw)
      ? (svcRaw as { name_en: string }).name_en
      : null;
    if (svc) serviceCounts[svc] = (serviceCounts[svc] ?? 0) + 1;
  });
  const favourite = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    lifetime_spend: lifetimeSpend,
    total_orders: orders.length,
    outstanding_balance: outstanding,
    last_order_date: orders[0]?.created_at ?? null,
    first_order_date: orders[orders.length - 1]?.created_at ?? null,
    avg_order_value: orders.length > 0 ? lifetimeSpend / Math.max(paidInvoices.length, 1) : 0,
    orders_this_month: ordersThisMonth,
    favourite_service: favourite,
  };
}

export async function getMonthlyOrderHistory(customerId: string): Promise<MonthlyOrderData[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);

  const { data } = await supabase
    .from('invoices')
    .select('total, status, created_at')
    .eq('tenant_id', user.tenant.id)
    .eq('customer_id', customerId)
    .gte('created_at', since.toISOString())
    .order('created_at');

  const monthMap: Record<string, MonthlyOrderData> = {};

  // Pre-fill all 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = { month: key, order_count: 0, revenue: 0 };
  }

  (data ?? []).forEach((inv) => {
    const d = new Date(inv.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (monthMap[key]) {
      monthMap[key].order_count++;
      if (inv.status === 'paid') monthMap[key].revenue += Number(inv.total);
    }
  });

  return Object.values(monthMap);
}

export async function getCustomerInvoices(customerId: string): Promise<CustomerInvoiceSummary[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, status, created_at, order:orders(order_number)')
    .eq('tenant_id', user.tenant.id)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(100);

  return (data ?? []).map((inv) => ({
    id: inv.id,
    invoice_number: inv.invoice_number,
    total: Number(inv.total),
    status: inv.status,
    created_at: inv.created_at,
    order_number: (() => {
      const o = inv.order as unknown;
      return o && typeof o === 'object' && !Array.isArray(o)
        ? (o as { order_number: string }).order_number ?? null
        : null;
    })(),
  }));
}

export async function getCustomerStatement(
  customerId: string,
  from: string,
  to: string,
) {
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const supabase = await createClient();

  const [invRes, payRes] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, total, status, created_at, order:orders(order_number)')
      .eq('tenant_id', user.tenant.id)
      .eq('customer_id', customerId)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59')
      .order('created_at'),

    supabase
      .from('payments')
      .select('id, amount, method, paid_at')
      .eq('tenant_id', user.tenant.id)
      .in(
        'invoice_id',
        (
          await supabase
            .from('invoices')
            .select('id')
            .eq('tenant_id', user.tenant.id)
            .eq('customer_id', customerId)
        ).data?.map((i) => i.id) ?? [],
      )
      .gte('paid_at', from)
      .lte('paid_at', to + 'T23:59:59')
      .order('paid_at'),
  ]);

  // Merge and sort events
  type StatementLine = {
    date: string;
    ref: string;
    description: string;
    debit: number;
    credit: number;
  };

  const lines: StatementLine[] = [
    ...(invRes.data ?? []).map((inv) => ({
      date: inv.created_at.slice(0, 10),
      ref: inv.invoice_number,
      description: `Order ${(() => { const o = inv.order as unknown; return o && typeof o === 'object' && !Array.isArray(o) ? (o as { order_number: string }).order_number : null; })() ?? inv.invoice_number}`,
      debit: Number(inv.total),
      credit: 0,
    })),
    ...(payRes.data ?? []).map((pay) => ({
      date: (pay.paid_at as string).slice(0, 10),
      ref: `PAY`,
      description: `${pay.method.toUpperCase()} payment`,
      debit: 0,
      credit: Number(pay.amount),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // Running balance
  let balance = 0;
  const withBalance = lines.map((l) => {
    balance += l.debit - l.credit;
    return { ...l, balance };
  });

  return { lines: withBalance, closingBalance: balance };
}
