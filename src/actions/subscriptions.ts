'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { CustomerSubscriptionPlan, CustomerSubscription } from '@/types';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const PlanSchema = z.object({
  name_en: z.string().min(1).max(80),
  name_ar: z.string().min(1).max(80),
  billing_cycle: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
  price: z.coerce.number().positive(),
  included_kg: z.coerce.number().nonnegative().optional(),
  included_items: z.coerce.number().int().nonnegative().optional(),
});

const EnrollSchema = z.object({
  customer_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  payment_method: z.enum(['tokenized_card', 'knet_manual_renewal']),
});

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function listSubscriptionPlans() {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('customer_subscription_plans')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .order('price');

  return (data ?? []) as CustomerSubscriptionPlan[];
}

export async function createSubscriptionPlan(
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const raw = Object.fromEntries(formData.entries());
  const parsed = PlanSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from('customer_subscription_plans').insert({
    tenant_id: user.tenant.id,
    name_en: parsed.data.name_en,
    name_ar: parsed.data.name_ar,
    billing_cycle: parsed.data.billing_cycle,
    price: parsed.data.price,
    included_kg: parsed.data.included_kg ?? null,
    included_items: parsed.data.included_items ?? null,
    perks: null,
  });

  return { error: error?.message ?? null };
}

export async function deleteSubscriptionPlan(
  planId: string,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('customer_subscription_plans')
    .delete()
    .eq('id', planId)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}

// ─── Customer Subscriptions ───────────────────────────────────────────────────

export async function listCustomerSubscriptions(customerId?: string) {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  let q = supabase
    .from('customer_subscriptions')
    .select(
      `*, plan:customer_subscription_plans(id,name_en,name_ar,billing_cycle,price,included_kg,included_items),
       customer:customers(id,full_name,phone)`,
    )
    .eq('tenant_id', user.tenant.id)
    .order('created_at', { ascending: false });

  if (customerId) q = q.eq('customer_id', customerId);

  const { data } = await q;
  return (data ?? []) as (CustomerSubscription & {
    plan: CustomerSubscriptionPlan | null;
    customer: { id: string; full_name: string; phone: string } | null;
  })[];
}

export async function getActiveSubscription(customerId: string) {
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('customer_subscriptions')
    .select(`*, plan:customer_subscription_plans(*)`)
    .eq('tenant_id', user.tenant.id)
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return data as (CustomerSubscription & { plan: CustomerSubscriptionPlan | null }) | null;
}

export async function enrollCustomer(
  input: z.infer<typeof EnrollSchema>,
): Promise<{ subscriptionId: string | null; error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { subscriptionId: null, error: 'Not authenticated' };

  const parsed = EnrollSchema.safeParse(input);
  if (!parsed.success) return { subscriptionId: null, error: parsed.error.errors[0].message };

  const supabase = await createClient();

  // Fetch plan to calculate period dates
  const { data: plan } = await supabase
    .from('customer_subscription_plans')
    .select('billing_cycle')
    .eq('id', parsed.data.plan_id)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!plan) return { subscriptionId: null, error: 'Plan not found' };

  const start = new Date();
  const end = new Date(start);
  if (plan.billing_cycle === 'monthly') end.setMonth(end.getMonth() + 1);
  else if (plan.billing_cycle === 'quarterly') end.setMonth(end.getMonth() + 3);
  else end.setFullYear(end.getFullYear() + 1);

  const { data, error } = await supabase
    .from('customer_subscriptions')
    .insert({
      tenant_id: user.tenant.id,
      customer_id: parsed.data.customer_id,
      plan_id: parsed.data.plan_id,
      status: 'active',
      current_period_start: start.toISOString().slice(0, 10),
      current_period_end: end.toISOString().slice(0, 10),
      payment_method: parsed.data.payment_method,
      used_kg: 0,
      used_items: 0,
    })
    .select('id')
    .single();

  if (error) return { subscriptionId: null, error: error.message };

  await supabase.from('audit_log').insert({
    tenant_id: user.tenant.id,
    actor_id: user.id,
    action: 'enroll',
    entity: 'customer_subscription',
    entity_id: data.id,
    diff: { customer_id: parsed.data.customer_id, plan_id: parsed.data.plan_id },
  });

  return { subscriptionId: data.id, error: null };
}

export async function deductSubscriptionUsage(
  subscriptionId: string,
  kgUsed?: number,
  itemsUsed?: number,
): Promise<{ error: string | null; overLimit: boolean }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated', overLimit: false };

  const supabase = await createClient();

  const { data: sub } = await supabase
    .from('customer_subscriptions')
    .select(`*, plan:customer_subscription_plans(included_kg,included_items)`)
    .eq('id', subscriptionId)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!sub) return { error: 'Subscription not found', overLimit: false };

  const plan = sub.plan as { included_kg: number | null; included_items: number | null } | null;
  const newKg = Number(sub.used_kg ?? 0) + (kgUsed ?? 0);
  const newItems = Number(sub.used_items ?? 0) + (itemsUsed ?? 0);

  const kgLimit = plan?.included_kg ?? Infinity;
  const itemsLimit = plan?.included_items ?? Infinity;
  const overLimit = newKg > kgLimit || newItems > itemsLimit;

  const { error } = await supabase
    .from('customer_subscriptions')
    .update({ used_kg: newKg, used_items: newItems })
    .eq('id', subscriptionId)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null, overLimit };
}

export async function cancelSubscription(
  subscriptionId: string,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('customer_subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', subscriptionId)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}
