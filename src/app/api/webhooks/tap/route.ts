import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { retrieveCharge, tapStatusToInvoiceStatus } from '@/lib/tap/client';

/**
 * Tap Payments webhook endpoint.
 * Register this URL in your Tap dashboard: POST /api/webhooks/tap
 *
 * Tap sends a POST with `id` (charge ID) in the body when a charge status changes.
 * We retrieve the charge, verify it, and update the invoice accordingly.
 */
export async function POST(req: NextRequest) {
  // Rate-limit: Tap signs webhooks with a shared secret in a header.
  // Validate it before processing anything.
  const tapSignature = req.headers.get('hashstring') ?? '';
  const webhookSecret = process.env.TAP_WEBHOOK_SECRET ?? '';

  if (webhookSecret && tapSignature !== webhookSecret) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: { id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const chargeId = body.id;
  if (!chargeId) {
    return NextResponse.json({ error: 'Missing charge id' }, { status: 400 });
  }

  // Retrieve the charge from Tap to get ground-truth status
  let charge;
  try {
    charge = await retrieveCharge(chargeId);
  } catch (err) {
    console.error('Tap charge retrieval failed:', err);
    return NextResponse.json({ error: 'Charge not found' }, { status: 400 });
  }

  const invoiceStatus = tapStatusToInvoiceStatus(charge.status);

  // Use service-role key here — webhooks run outside user session context.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: (_: unknown) => {} } },
  );

  // Find the payment row by tap_charge_id
  const { data: payment } = await supabase
    .from('payments')
    .select('id,invoice_id,tenant_id')
    .eq('tap_charge_id', chargeId)
    .single();

  if (!payment?.invoice_id) {
    // Not found — probably a charge from a different system; ignore.
    return NextResponse.json({ ok: true });
  }

  // Update invoice status
  await supabase
    .from('invoices')
    .update({ status: invoiceStatus })
    .eq('id', payment.invoice_id);

  // Audit log
  await supabase.from('audit_log').insert({
    tenant_id: payment.tenant_id,
    action: 'tap_webhook',
    entity: 'invoice',
    entity_id: payment.invoice_id,
    diff: { tap_status: charge.status, invoice_status: invoiceStatus, charge_id: chargeId },
  });

  return NextResponse.json({ ok: true });
}
