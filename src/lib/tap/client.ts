/**
 * Tap Payments API client — v2
 * Docs: https://developers.tap.company/reference
 *
 * NOTE: Never expose TAP_SECRET_KEY client-side. All calls go through
 * server actions or API routes only.
 */

const TAP_API_BASE = 'https://api.tap.company/v2';

function tapHeaders() {
  const key = process.env.TAP_SECRET_KEY;
  if (!key) throw new Error('TAP_SECRET_KEY is not set');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
}

// ─── Types (mirroring Tap's documented response shapes) ───────────────────────

export interface TapCustomer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: { country_code: string; number: string };
}

export interface TapCreateChargeParams {
  amount: number;
  currency: 'KWD' | 'USD' | 'EUR';
  customer: TapCustomer;
  source_id: string;           // 'src_all' | 'src_kw.knet' | 'src_card'
  redirect_url: string;
  reference_transaction?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface TapCharge {
  id: string;
  status: 'INITIATED' | 'CAPTURED' | 'AUTHORIZED' | 'CANCELLED' | 'FAILED' | 'DECLINED' | 'RESTRICTED' | 'VOID';
  amount: number;
  currency: string;
  transaction: {
    url: string;
    created: number;
  };
  reference: {
    transaction: string;
    order?: string;
  };
}

// ─── Create a charge (hosted checkout) ───────────────────────────────────────

export async function createCharge(
  params: TapCreateChargeParams,
): Promise<TapCharge> {
  const body = {
    amount: params.amount,
    currency: params.currency,
    customer: params.customer,
    source: { id: params.source_id },
    redirect: { url: params.redirect_url },
    reference: { transaction: params.reference_transaction ?? '' },
    description: params.description ?? '',
    metadata: params.metadata ?? {},
    // 3D Secure is enforced by Tap for Kuwait cards; no flag needed.
  };

  const res = await fetch(`${TAP_API_BASE}/charges`, {
    method: 'POST',
    headers: tapHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Tap API error ${res.status}: ${JSON.stringify((err as any)?.errors ?? err)}`,
    );
  }

  return res.json() as Promise<TapCharge>;
}

// ─── Retrieve a charge ────────────────────────────────────────────────────────

export async function retrieveCharge(chargeId: string): Promise<TapCharge> {
  const res = await fetch(`${TAP_API_BASE}/charges/${chargeId}`, {
    headers: tapHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Tap API error ${res.status} retrieving charge ${chargeId}`);
  }

  return res.json() as Promise<TapCharge>;
}

// ─── Map Tap status → invoice status ─────────────────────────────────────────

export function tapStatusToInvoiceStatus(
  tapStatus: TapCharge['status'],
): 'unpaid' | 'paid' | 'void' {
  if (tapStatus === 'CAPTURED' || tapStatus === 'AUTHORIZED') return 'paid';
  if (tapStatus === 'CANCELLED' || tapStatus === 'VOID') return 'void';
  return 'unpaid';
}
