import { createClient } from './supabase/server';
import type { SessionUser } from '@/types';

export async function getSessionUser(): Promise<SessionUser | null> {
  let supabase;
  try {
    supabase = await createClient();
  } catch (e) {
    console.error('[getSessionUser] createClient failed:', e);
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log('[getSessionUser] no auth user:', userError?.message);
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    console.log('[getSessionUser] no profile for user', user.id, profileError?.message);
    return null;
  }

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
