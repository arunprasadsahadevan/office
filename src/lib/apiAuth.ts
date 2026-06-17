import { createServerClient } from '@supabase/ssr';
import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

export async function authenticateApiKey(
  request: NextRequest,
): Promise<{ tenantId: string } | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const rawKey = auth.slice(7);
  if (!rawKey.startsWith('los_')) return null;

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  const { data: key } = await supabase
    .from('api_keys')
    .select('tenant_id, is_active')
    .eq('key_hash', keyHash)
    .single();

  if (!key?.is_active) return null;

  // Fire-and-forget — update last_used_at without blocking the response
  supabase.rpc('touch_api_key', { p_key_hash: keyHash }).then(() => {});

  return { tenantId: key.tenant_id };
}
