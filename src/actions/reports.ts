'use server';

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { getAllBranchesPnl } from './accounting';
import type { BranchPnl } from '@/types';

export interface BranchComparisonReport {
  period: { from: string; to: string };
  branches: BranchPnl[];
  totals: { revenue: number; expenses: number; gross_profit: number };
}

export async function getBranchComparisonReport(
  from: string,
  to: string,
): Promise<BranchComparisonReport> {
  const branches = await getAllBranchesPnl(from, to);
  const totals = branches.reduce(
    (acc, b) => ({
      revenue: acc.revenue + b.revenue,
      expenses: acc.expenses + b.expenses,
      gross_profit: acc.gross_profit + b.gross_profit,
    }),
    { revenue: 0, expenses: 0, gross_profit: 0 },
  );

  return { period: { from, to }, branches, totals };
}

export interface OrderVolumeDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

export async function getOrderVolumeReport(
  from: string,
  to: string,
  branchId?: string,
): Promise<OrderVolumeDataPoint[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();

  let q = supabase
    .from('orders')
    .select('created_at, invoices(total,status)')
    .eq('tenant_id', user.tenant.id)
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59Z')
    .order('created_at');

  if (branchId) q = q.eq('branch_id', branchId);

  const { data } = await q;
  if (!data) return [];

  // Group by date
  const byDate = new Map<string, { orders: number; revenue: number }>();

  for (const order of data) {
    const date = new Date(order.created_at).toISOString().slice(0, 10);
    const existing = byDate.get(date) ?? { orders: 0, revenue: 0 };
    const invoices = Array.isArray(order.invoices) ? order.invoices : [order.invoices];
    const revenue = invoices
      .filter((inv) => inv?.status === 'paid')
      .reduce((s, inv) => s + Number(inv?.total ?? 0), 0);

    byDate.set(date, {
      orders: existing.orders + 1,
      revenue: existing.revenue + revenue,
    });
  }

  return Array.from(byDate.entries()).map(([date, d]) => ({ date, ...d }));
}

export interface TopServiceDataPoint {
  service_id: string;
  name_en: string;
  name_ar: string;
  count: number;
  revenue: number;
}

export async function getTopServicesReport(
  from: string,
  to: string,
): Promise<TopServiceDataPoint[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from('order_items')
    .select('service_id, unit_price, service:services(id,name_en,name_ar)')
    .eq('tenant_id', user.tenant.id)
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59Z');

  if (!data) return [];

  const byService = new Map<string, TopServiceDataPoint>();

  for (const item of data) {
    const svc = Array.isArray(item.service) ? item.service[0] : item.service;
    if (!svc || !item.service_id) continue;

    const existing = byService.get(item.service_id) ?? {
      service_id: item.service_id,
      name_en: svc.name_en,
      name_ar: svc.name_ar,
      count: 0,
      revenue: 0,
    };

    byService.set(item.service_id, {
      ...existing,
      count: existing.count + 1,
      revenue: existing.revenue + Number(item.unit_price ?? 0),
    });
  }

  return Array.from(byService.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
}
