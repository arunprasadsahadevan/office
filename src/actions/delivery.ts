'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { notifyDeliveryEta } from './notifications';
import type { DeliveryRun, DeliveryStop } from '@/types';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const CreateRunSchema = z.object({
  branch_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  run_date: z.string(),
  notes: z.string().optional(),
});

const AddStopSchema = z.object({
  run_id: z.string().uuid(),
  order_id: z.string().uuid(),
  sequence: z.coerce.number().int().positive().default(1),
  address: z.string().optional(),
  stop_type: z.enum(['pickup', 'dropoff']).default('dropoff'),
});

// ─── Delivery Runs ────────────────────────────────────────────────────────────

export async function listDeliveryRuns(branchId?: string, runDate?: string) {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  let q = supabase
    .from('delivery_runs')
    .select(
      `*, branch:branches(id,name),
       driver:user_profiles(id,full_name),
       delivery_stops(id,status,sequence,stop_type,order_id)`,
    )
    .eq('tenant_id', user.tenant.id)
    .order('run_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (branchId) q = q.eq('branch_id', branchId);
  if (runDate) q = q.eq('run_date', runDate);

  const { data } = await q;
  return (data ?? []) as (DeliveryRun & {
    branch: { id: string; name: string } | null;
    driver: { id: string; full_name: string | null } | null;
    delivery_stops: Array<{ id: string; status: string; sequence: number; stop_type: string; order_id: string }>;
  })[];
}

export async function getDeliveryRun(runId: string) {
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('delivery_runs')
    .select(
      `*, branch:branches(id,name),
       driver:user_profiles(id,full_name,phone),
       delivery_stops(
         id, sequence, stop_type, status, address, driver_note, completed_at,
         order:orders(id,order_number,customer:customers(full_name,phone))
       )`,
    )
    .eq('id', runId)
    .eq('tenant_id', user.tenant.id)
    .single();

  return data;
}

export async function createDeliveryRun(
  input: z.infer<typeof CreateRunSchema>,
): Promise<{ runId: string | null; error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { runId: null, error: 'Not authenticated' };

  const parsed = CreateRunSchema.safeParse(input);
  if (!parsed.success) return { runId: null, error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('delivery_runs')
    .insert({
      tenant_id: user.tenant.id,
      branch_id: parsed.data.branch_id,
      driver_id: parsed.data.driver_id ?? null,
      run_date: parsed.data.run_date,
      notes: parsed.data.notes ?? null,
      status: 'planned',
    })
    .select('id')
    .single();

  return { runId: data?.id ?? null, error: error?.message ?? null };
}

export async function updateRunStatus(
  runId: string,
  status: DeliveryRun['status'],
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('delivery_runs')
    .update({ status })
    .eq('id', runId)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}

// ─── Delivery Stops ───────────────────────────────────────────────────────────

export async function addStopToRun(
  input: z.infer<typeof AddStopSchema>,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = AddStopSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Verify order belongs to tenant
  const { data: order } = await supabase
    .from('orders')
    .select('id')
    .eq('id', parsed.data.order_id)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!order) return { error: 'Order not found' };

  const { error } = await supabase.from('delivery_stops').insert({
    tenant_id: user.tenant.id,
    run_id: parsed.data.run_id,
    order_id: parsed.data.order_id,
    sequence: parsed.data.sequence,
    address: parsed.data.address ?? null,
    stop_type: parsed.data.stop_type,
    status: 'pending',
  });

  return { error: error?.message ?? null };
}

export async function updateStopStatus(
  stopId: string,
  status: DeliveryStop['status'],
  driverNote?: string,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('delivery_stops')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
      driver_note: driverNote ?? null,
    })
    .eq('id', stopId)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}

export async function completeStop(
  stopId: string,
  etaMinutes?: number,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();

  const { data: stop } = await supabase
    .from('delivery_stops')
    .select('id, order_id, stop_type')
    .eq('id', stopId)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!stop) return { error: 'Stop not found' };

  await supabase
    .from('delivery_stops')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', stopId)
    .eq('tenant_id', user.tenant.id);

  // If dropoff completed → mark order as completed
  if (stop.stop_type === 'dropoff') {
    await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', stop.order_id)
      .eq('tenant_id', user.tenant.id);

    await supabase.from('audit_log').insert({
      tenant_id: user.tenant.id,
      actor_id: user.id,
      action: 'delivery_complete',
      entity: 'order',
      entity_id: stop.order_id,
    });
  }

  // Send ETA notification if arriving at next stop
  if (etaMinutes && stop.stop_type === 'dropoff') {
    await notifyDeliveryEta(stop.order_id, etaMinutes);
  }

  return { error: null };
}

export async function listDrivers() {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('id, full_name, phone')
    .eq('tenant_id', user.tenant.id)
    .eq('role', 'driver');

  return (data ?? []) as Array<{ id: string; full_name: string | null; phone: string | null }>;
}
