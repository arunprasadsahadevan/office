'use server';

import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import { createCharge } from '@/lib/tap/client';

interface InitiateTapPaymentInput {
  invoiceId: string;
  sourceId: 'src_all' | 'src_kw.knet' | 'src_card';
  redirectBaseUrl: string;
}

export async function initiateTapPayment({
  invoiceId,
  sourceId,
  redirectBaseUrl,
}: InitiateTapPaymentInput): Promise<{ checkoutUrl: string | null; error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { checkoutUrl: null, error: 'Not authenticated' };

  const supabase = await createClient();

  // Fetch invoice + customer
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, customer:customers(full_name,phone,email), order:orders(order_number)')
    .eq('id', invoiceId)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!invoice) return { checkoutUrl: null, error: 'Invoice not found' };

  const customer = invoice.customer as {
    full_name: string;
    phone: string;
    email: string | null;
  } | null;

  const [firstName, ...rest] = (customer?.full_name ?? 'Customer').split(' ');
  const phone = customer?.phone ?? '';
  // Strip leading + or country code for Tap's phone object
  const phoneNumber = phone.replace(/^\+965/, '').replace(/^\+/, '').replace(/\D/g, '');

  try {
    const charge = await createCharge({
      amount: Number(invoice.total),
      currency: 'KWD',
      customer: {
        first_name: firstName,
        last_name: rest.join(' ') || undefined,
        email: customer?.email ?? undefined,
        phone: phoneNumber
          ? { country_code: '965', number: phoneNumber }
          : undefined,
      },
      source_id: sourceId,
      redirect_url: `${redirectBaseUrl}/payment/callback?invoice=${invoiceId}`,
      reference_transaction: (invoice.order as { order_number: string } | null)?.order_number ?? invoiceId,
      description: `LaundryOS — ${user.tenant.name}`,
      metadata: { invoice_id: invoiceId, tenant_id: user.tenant.id },
    });

    // Store tap_charge_id on a pending payment row
    await supabase.from('payments').insert({
      tenant_id: user.tenant.id,
      invoice_id: invoiceId,
      amount: Number(invoice.total),
      method: sourceId === 'src_kw.knet' ? 'knet' : 'visa_mc',
      tap_charge_id: charge.id,
      collected_by: user.id,
    });

    return { checkoutUrl: charge.transaction.url, error: null };
  } catch (err) {
    return { checkoutUrl: null, error: (err as Error).message };
  }
}
