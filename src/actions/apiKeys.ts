'use server';

import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { ApiKey } from '@/types';

function generateRawKey(): string {
  return 'los_' + randomBytes(32).toString('hex');
}

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('api_keys')
    .select('id,tenant_id,name,key_prefix,is_active,last_used_at,created_by,created_at')
    .eq('tenant_id', user.tenant.id)
    .order('created_at', { ascending: false });

  return (data ?? []) as ApiKey[];
}

export async function createApiKey(
  name: string,
): Promise<{ key: ApiKey | null; rawKey: string | null; error: string | null }> {
  const parsed = z.string().min(1).max(80).safeParse(name);
  if (!parsed.success) return { key: null, rawKey: null, error: 'Name must be 1–80 characters' };

  const user = await getSessionUser();
  if (!user?.tenant) return { key: null, rawKey: null, error: 'Not authenticated' };

  const rawKey = generateRawKey();
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 12); // 'los_' + 8 hex chars

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      tenant_id: user.tenant.id,
      name: parsed.data,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      created_by: user.id,
      is_active: true,
    })
    .select('id,tenant_id,name,key_prefix,is_active,last_used_at,created_by,created_at')
    .single();

  if (error) return { key: null, rawKey: null, error: error.message };
  return { key: data as ApiKey, rawKey, error: null };
}

export async function revokeApiKey(
  keyId: string,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('tenant_id', user.tenant.id);

  return { error: error?.message ?? null };
}
