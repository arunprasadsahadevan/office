'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { seedDefaultServices } from './services';
import type { Branch } from '@/types';

export async function listBranches(): Promise<Branch[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('branches')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .eq('is_active', true)
    .order('created_at');

  return (data ?? []) as Branch[];
}

export async function getDefaultBranch(): Promise<Branch | null> {
  const branches = await listBranches();
  return branches[0] ?? null;
}

const BranchSchema = z.object({
  name: z.string().min(1),
  area: z.string().optional(),
  phone: z.string().optional(),
});

export async function createBranch(
  formData: FormData,
): Promise<{ data: Branch | null; error: string | null }> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = BranchSchema.safeParse(raw);
  if (!parsed.success) return { data: null, error: parsed.error.errors[0].message };

  const user = await getSessionUser();
  if (!user?.tenant) return { data: null, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('branches')
    .insert({ ...parsed.data, tenant_id: user.tenant.id, is_active: true })
    .select()
    .single();

  if (error) return { data: null, error: error.message };

  // Seed default services on first branch creation
  await seedDefaultServices(user.tenant.id);

  return { data: data as Branch, error: null };
}
