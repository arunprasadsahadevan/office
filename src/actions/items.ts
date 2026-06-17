'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { GarmentCategory, GarmentItem } from '@/types';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const CategorySchema = z.object({
  name_en: z.string().min(1).max(80),
  name_ar: z.string().min(1).max(80),
  icon: z.string().max(10).optional(),
  display_order: z.coerce.number().int().nonnegative().optional(),
});

const ItemSchema = z.object({
  category_id: z.string().uuid(),
  name_en: z.string().min(1).max(80),
  name_ar: z.string().min(1).max(80),
  default_service_id: z.string().uuid().optional(),
  is_subscription_eligible: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => v === true || v === 'true')
    .default(true),
  display_order: z.coerce.number().int().nonnegative().optional(),
});

// ─── Categories ──────────────────────────────────────────────────────────────

export async function listGarmentCategories(): Promise<GarmentCategory[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('garment_categories')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .eq('is_active', true)
    .order('display_order')
    .order('name_en');

  return (data ?? []) as GarmentCategory[];
}

export async function createGarmentCategory(
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = CategorySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from('garment_categories').insert({
    tenant_id: user.tenant.id,
    ...parsed.data,
  });

  return { error: error?.message ?? null };
}

export async function updateGarmentCategory(
  id: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = CategorySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from('garment_categories')
    .update(parsed.data)
    .eq('id', id)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}

export async function deleteGarmentCategory(id: string): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('garment_categories')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}

// ─── Items ───────────────────────────────────────────────────────────────────

export async function listGarmentItems(categoryId?: string): Promise<GarmentItem[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  let q = supabase
    .from('garment_items')
    .select('*, category:garment_categories(id,name_en,name_ar,icon)')
    .eq('tenant_id', user.tenant.id)
    .eq('is_active', true)
    .order('display_order')
    .order('name_en');

  if (categoryId) q = q.eq('category_id', categoryId);

  const { data } = await q;
  return (data ?? []) as GarmentItem[];
}

export async function createGarmentItem(
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = ItemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from('garment_items').insert({
    tenant_id: user.tenant.id,
    category_id: parsed.data.category_id,
    name_en: parsed.data.name_en,
    name_ar: parsed.data.name_ar,
    default_service_id: parsed.data.default_service_id ?? null,
    is_subscription_eligible: parsed.data.is_subscription_eligible,
    display_order: parsed.data.display_order ?? 0,
  });

  return { error: error?.message ?? null };
}

export async function updateGarmentItem(
  id: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = ItemSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from('garment_items')
    .update({
      name_en: parsed.data.name_en,
      name_ar: parsed.data.name_ar,
      default_service_id: parsed.data.default_service_id ?? null,
      is_subscription_eligible: parsed.data.is_subscription_eligible,
      display_order: parsed.data.display_order ?? 0,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}

export async function deleteGarmentItem(id: string): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('garment_items')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}

export async function seedGarmentCatalog(): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('seed_garment_catalog', {
    p_tenant_id: user.tenant.id,
  });

  return { error: error?.message ?? null };
}
