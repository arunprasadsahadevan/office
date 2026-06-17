'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { InventoryItem, InventoryTransaction, Equipment, MaintenanceLog } from '@/types';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const InventoryItemSchema = z.object({
  branch_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(120),
  unit: z.enum(['pcs', 'kg', 'litre', 'box', 'roll']).default('pcs'),
  current_qty: z.coerce.number().nonnegative().default(0),
  reorder_threshold: z.coerce.number().nonnegative().default(0),
  cost_per_unit: z.coerce.number().nonnegative().nullable().optional(),
  notes: z.string().optional(),
});

const AdjustStockSchema = z.object({
  item_id: z.string().uuid(),
  txn_type: z.enum(['restock', 'usage', 'adjustment', 'waste']),
  qty_delta: z.coerce.number().refine((n) => n !== 0, 'Quantity must not be zero'),
  note: z.string().optional(),
  reference_id: z.string().uuid().optional(),
});

const EquipmentSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  eq_type: z.enum(['washer', 'dryer', 'ironer', 'dry_clean', 'other']),
  model: z.string().optional(),
  serial_number: z.string().optional(),
  purchased_at: z.string().optional(),
  next_service: z.string().optional(),
});

const MaintenanceLogSchema = z.object({
  equipment_id: z.string().uuid(),
  serviced_at: z.string(),
  description: z.string().optional(),
  cost: z.coerce.number().nonnegative().default(0),
  next_service: z.string().optional(),
});

// ─── Inventory items ──────────────────────────────────────────────────────────

export async function listInventoryItems(branchId?: string) {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  let q = supabase
    .from('inventory_items')
    .select('*, branch:branches(id,name)')
    .eq('tenant_id', user.tenant.id)
    .order('name');

  if (branchId) q = q.eq('branch_id', branchId);

  const { data } = await q;
  return (data ?? []) as (InventoryItem & { branch: { id: string; name: string } | null })[];
}

export async function getLowStockItems() {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('inventory_items')
    .select('*, branch:branches(id,name)')
    .eq('tenant_id', user.tenant.id)
    .filter('current_qty', 'lte', supabase.rpc('current_qty'))
    .order('name');

  // Manual filter since Supabase doesn't support column-to-column comparison directly
  const { data: all } = await supabase
    .from('inventory_items')
    .select('*, branch:branches(id,name)')
    .eq('tenant_id', user.tenant.id);

  return ((all ?? []) as InventoryItem[]).filter(
    (item) => item.current_qty <= item.reorder_threshold,
  );
}

export async function createInventoryItem(
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const raw = Object.fromEntries(formData.entries());
  const parsed = InventoryItemSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from('inventory_items').insert({
    tenant_id: user.tenant.id,
    ...parsed.data,
  });

  if (!error) {
    await supabase.from('audit_log').insert({
      tenant_id: user.tenant.id,
      actor_id: user.id,
      action: 'create',
      entity: 'inventory_item',
      diff: { name: parsed.data.name },
    });
  }

  return { error: error?.message ?? null };
}

export async function adjustStock(
  input: z.infer<typeof AdjustStockSchema>,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = AdjustStockSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Verify item belongs to tenant
  const { data: item } = await supabase
    .from('inventory_items')
    .select('id,name,current_qty')
    .eq('id', parsed.data.item_id)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!item) return { error: 'Item not found' };

  const { error } = await supabase.from('inventory_transactions').insert({
    tenant_id: user.tenant.id,
    item_id: parsed.data.item_id,
    txn_type: parsed.data.txn_type,
    qty_delta: parsed.data.qty_delta,
    note: parsed.data.note ?? null,
    reference_id: parsed.data.reference_id ?? null,
    actor_id: user.id,
  });

  if (!error) {
    await supabase.from('audit_log').insert({
      tenant_id: user.tenant.id,
      actor_id: user.id,
      action: 'stock_adjust',
      entity: 'inventory_item',
      entity_id: parsed.data.item_id,
      diff: {
        txn_type: parsed.data.txn_type,
        qty_delta: parsed.data.qty_delta,
        item_name: item.name,
      },
    });
  }

  return { error: error?.message ?? null };
}

export async function getInventoryTransactions(itemId: string) {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('inventory_transactions')
    .select('*, actor:user_profiles(full_name)')
    .eq('item_id', itemId)
    .eq('tenant_id', user.tenant.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data ?? []) as (InventoryTransaction & {
    actor: { full_name: string | null } | null;
  })[];
}

// ─── Equipment ────────────────────────────────────────────────────────────────

export async function listEquipment(branchId?: string) {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  let q = supabase
    .from('equipment')
    .select('*, branch:branches(id,name)')
    .eq('tenant_id', user.tenant.id)
    .order('name');

  if (branchId) q = q.eq('branch_id', branchId);

  const { data } = await q;
  return (data ?? []) as (Equipment & { branch: { id: string; name: string } | null })[];
}

export async function createEquipment(
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const raw = Object.fromEntries(formData.entries());
  const parsed = EquipmentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from('equipment').insert({
    tenant_id: user.tenant.id,
    ...parsed.data,
    purchased_at: parsed.data.purchased_at || null,
    next_service: parsed.data.next_service || null,
  });

  return { error: error?.message ?? null };
}

export async function logMaintenance(
  input: z.infer<typeof MaintenanceLogSchema>,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = MaintenanceLogSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Verify equipment belongs to tenant
  const { data: eq } = await supabase
    .from('equipment')
    .select('id')
    .eq('id', parsed.data.equipment_id)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!eq) return { error: 'Equipment not found' };

  const { error } = await supabase.from('maintenance_logs').insert({
    tenant_id: user.tenant.id,
    equipment_id: parsed.data.equipment_id,
    serviced_at: parsed.data.serviced_at,
    description: parsed.data.description ?? null,
    cost: parsed.data.cost,
    next_service: parsed.data.next_service ?? null,
    actor_id: user.id,
  });

  if (!error) {
    await supabase.from('audit_log').insert({
      tenant_id: user.tenant.id,
      actor_id: user.id,
      action: 'maintenance',
      entity: 'equipment',
      entity_id: parsed.data.equipment_id,
      diff: { cost: parsed.data.cost, next_service: parsed.data.next_service },
    });
  }

  return { error: error?.message ?? null };
}

export async function getMaintenanceLogs(equipmentId: string) {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('maintenance_logs')
    .select('*')
    .eq('equipment_id', equipmentId)
    .eq('tenant_id', user.tenant.id)
    .order('serviced_at', { ascending: false });

  return (data ?? []) as MaintenanceLog[];
}
