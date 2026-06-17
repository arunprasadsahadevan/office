import { createClient } from './supabase/server';
import type { SessionUser } from '@/types';

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const { data: tenant } = profile.tenant_id
    ? await supabase
        .from('tenants')
        .select('*')
        .eq('id', profile.tenant_id)
        .single()
    : { data: null };

  return {
    id: user.id,
    email: user.email ?? '',
    profile,
    tenant: tenant ?? null,
  };
}

export function getDaysLeftInTrial(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
