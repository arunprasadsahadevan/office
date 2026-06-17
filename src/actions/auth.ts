'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  locale: z.enum(['en', 'ar']).default('en'),
});

const SignupSchema = z.object({
  fullName: z.string().min(1),
  businessName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  locale: z.enum(['en', 'ar']).default('en'),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function loginAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = LoginSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { email, password, locale } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect(`/${locale}/dashboard`);
}

export async function signupAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = SignupSchema.safeParse(raw);

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { fullName, businessName, email, password, locale } = parsed.data;
  const supabase = await createClient();

  // 1. Generate a unique slug
  const baseSlug = slugify(businessName);
  let slug = baseSlug;

  const { data: existing } = await supabase
    .from('tenants')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  // 2. Create Supabase Auth user
  const { data: authData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (signupError || !authData.user) {
    return { error: signupError?.message ?? 'Sign-up failed' };
  }

  const userId = authData.user.id;

  // 3. Create tenant — use service-role key in production; anon key here
  //    relies on an INSERT policy or a Postgres function with SECURITY DEFINER.
  //    For dev convenience we insert directly; add a proper RLS INSERT policy
  //    or edge function before production.
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name: businessName,
      slug,
      default_locale: locale,
      status: 'trial',
      trial_ends_at: trialEndsAt,
    })
    .select()
    .single();

  if (tenantError || !tenant) {
    return { error: tenantError?.message ?? 'Failed to create workspace' };
  }

  // 4. Create user profile
  const { error: profileError } = await supabase.from('user_profiles').insert({
    id: userId,
    tenant_id: tenant.id,
    role: 'tenant_owner',
    full_name: fullName,
    preferred_locale: locale,
  });

  if (profileError) {
    return { error: profileError.message };
  }

  // 5. Find Starter plan and create platform subscription (trial)
  const { data: starterPlan } = await supabase
    .from('platform_plans')
    .select('id')
    .eq('name', 'Starter')
    .single();

  if (starterPlan) {
    await supabase.from('platform_subscriptions').insert({
      tenant_id: tenant.id,
      plan_id: starterPlan.id,
      status: 'trial',
      current_period_end: trialEndsAt.split('T')[0],
    });
  }

  redirect(`/${locale}/dashboard`);
}

export async function logoutAction(locale: string = 'en') {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}
