'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSessionUser } from '@/lib/auth';
import type { UserProfile, UserRole } from '@/types';

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

// ─── Tenant settings ──────────────────────────────────────────────────────────

const TenantUpdateSchema = z.object({
  name: z.string().min(1).max(100),
  default_locale: z.enum(['en', 'ar']),
  base_currency: z.string().length(3),
  brand_primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).or(z.literal('')).optional(),
  logo_url: z.string().url().or(z.literal('')).optional(),
  tax_rate: z.coerce.number().min(0).max(100).optional(),
});

export async function updateTenantSettings(
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const raw = Object.fromEntries(formData.entries());
  const parsed = TenantUpdateSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from('tenants')
    .update({
      name: parsed.data.name,
      default_locale: parsed.data.default_locale,
      base_currency: parsed.data.base_currency,
      brand_primary_color: parsed.data.brand_primary_color || null,
      logo_url: parsed.data.logo_url || null,
      tax_rate: parsed.data.tax_rate ?? 0,
    })
    .eq('id', user.tenant.id);

  return { error: error?.message ?? null };
}

// ─── Staff management ─────────────────────────────────────────────────────────

export async function listStaff(): Promise<UserProfile[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .order('created_at', { ascending: false });

  return (data ?? []) as UserProfile[];
}

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['tenant_owner', 'branch_manager', 'cashier', 'accountant', 'driver']),
  branch_id: z.string().uuid().optional(),
  full_name: z.string().min(1).max(100).optional(),
});

export async function inviteUser(
  input: z.infer<typeof InviteSchema>,
): Promise<{ error: string | null }> {
  const sessionUser = await getSessionUser();
  if (!sessionUser?.tenant) return { error: 'Not authenticated' };

  const parsed = InviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const admin = createAdminClient();
  const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { data: { full_name: parsed.data.full_name ?? null } },
  );

  if (inviteErr) return { error: inviteErr.message };
  if (!inviteData?.user) return { error: 'Failed to create user invitation' };

  const { error: profileErr } = await admin
    .from('user_profiles')
    .upsert(
      {
        id: inviteData.user.id,
        tenant_id: sessionUser.tenant.id,
        branch_id: parsed.data.branch_id ?? null,
        role: parsed.data.role,
        full_name: parsed.data.full_name ?? null,
        preferred_locale: 'en',
      },
      { onConflict: 'id' },
    );

  return { error: profileErr?.message ?? null };
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = z.object({
    userId: z.string().uuid(),
    role: z.enum(['tenant_owner', 'branch_manager', 'cashier', 'accountant', 'driver']),
  }).safeParse({ userId, role });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from('user_profiles')
    .update({ role: parsed.data.role })
    .eq('id', parsed.data.userId)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}
