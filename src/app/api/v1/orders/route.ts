import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { authenticateApiKey } from '@/lib/apiAuth';

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, Number(searchParams.get('page') ?? 0));
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('page_size') ?? 50)));
  const status = searchParams.get('status') ?? undefined;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  let q = supabase
    .from('orders')
    .select(
      `id, order_number, status, fulfillment_type, promised_at, created_at,
       customer:customers(id, full_name, phone),
       branch:branches(id, name)`,
      { count: 'exact' },
    )
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) q = q.eq('status', status);

  const { data, count, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    page_size: pageSize,
  });
}
