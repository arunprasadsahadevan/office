'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { Service } from '@/types';

export async function listServices(): Promise<Service[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .eq('is_active', true)
    .order('name_en');

  return (data ?? []) as Service[];
}

export async function listAllServices(): Promise<Service[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .order('name_en');

  return (data ?? []) as Service[];
}

/**
 * Seed default services from the template table into a fresh tenant.
 * Called once after the tenant's first branch is created.
 */
export async function seedDefaultServices(tenantId: string): Promise<void> {
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from('default_service_templates')
    .select('*')
    .order('display_order');

  if (!templates?.length) return;

  const existing = await supabase
    .from('services')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if ((existing.data?.length ?? 0) > 0) return; // already seeded

  await supabase.from('services').insert(
    templates.map((t) => ({
      tenant_id: tenantId,
      name_en: t.name_en,
      name_ar: t.name_ar,
      category: t.category,
      base_price: t.base_price,
      turnaround_hours: t.turnaround_hours,
      is_active: true,
    })),
  );
}

const ServiceSchema = z.object({
  name_en: z.string().min(1),
  name_ar: z.string().min(1),
  category: z.enum(['wash_fold', 'dry_clean', 'iron_only', 'special_care']),
  base_price: z.coerce.number().positive(),
  turnaround_hours: z.coerce.number().int().positive().default(24),
});

export async function createService(
  formData: FormData,
): Promise<{ error: string | null }> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = ServiceSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('services')
    .insert({ ...parsed.data, tenant_id: user.tenant.id, is_active: true });

  return { error: error?.message ?? null };
}

export async function updateService(
  serviceId: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const raw = Object.fromEntries(formData.entries());
  const parsed = ServiceSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from('services')
    .update(parsed.data)
    .eq('id', serviceId)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}

export async function toggleService(
  serviceId: string,
  isActive: boolean,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('services')
    .update({ is_active: isActive })
    .eq('id', serviceId)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}
