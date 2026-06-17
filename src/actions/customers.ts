'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { Customer } from '@/types';

const CustomerSchema = z.object({
  full_name: z.string().min(1),
  phone: z.string().min(5),
  email: z.string().email().optional().or(z.literal('')),
  preferred_locale: z.enum(['en', 'ar']).default('ar'),
  customer_type: z.enum(['retail', 'corporate']).default('retail'),
});

export async function searchCustomers(query: string): Promise<Customer[]> {
  if (!query || query.trim().length < 2) return [];

  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .or(`phone.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(10);

  return (data ?? []) as Customer[];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenant.id)
    .single();

  return (data as Customer) ?? null;
}

export async function listCustomers(page = 0, pageSize = 30) {
  const user = await getSessionUser();
  if (!user?.tenant) return { data: [], count: 0 };

  const supabase = await createClient();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.tenant.id)
    .order('created_at', { ascending: false })
    .range(from, to);

  return { data: (data ?? []) as Customer[], count: count ?? 0 };
}

export async function createCustomer(
  formData: FormData,
): Promise<{ data: Customer | null; error: string | null }> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = CustomerSchema.safeParse(raw);

  if (!parsed.success) {
    return { data: null, error: parsed.error.errors[0].message };
  }

  const user = await getSessionUser();
  if (!user?.tenant) return { data: null, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...parsed.data, tenant_id: user.tenant.id })
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data as Customer, error: null };
}

export async function updateCustomer(
  id: string,
  formData: FormData,
): Promise<{ error: string | null }> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = CustomerSchema.partial().safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('customers')
    .update(parsed.data)
    .eq('id', id)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}
