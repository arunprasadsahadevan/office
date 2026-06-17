'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { CustomerWallet, CustomerWalletTransaction, CreditNote } from '@/types';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const CollectSchema = z.object({
  customer_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  method: z.enum(['cash', 'knet', 'visa_mc', 'wallet', 'credit_account']),
});

const CreditNoteSchema = z.object({
  customer_id: z.string().uuid(),
  invoice_id: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  reason: z.string().min(1),
});

// ─── FIFO Payment Collection ──────────────────────────────────────────────────

export interface FifoPreview {
  invoiceId: string;
  invoiceNumber: string;
  originalTotal: number;
  alreadyPaid: number;
  amountAllocated: number;
  willBeFullyPaid: boolean;
}

export async function previewFifoAllocation(
  customerId: string,
  amount: number,
): Promise<{ allocations: FifoPreview[]; walletCredit: number; error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { allocations: [], walletCredit: 0, error: 'Not authenticated' };

  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, total')
    .eq('tenant_id', user.tenant.id)
    .eq('customer_id', customerId)
    .in('status', ['unpaid', 'partial', 'overdue'])
    .order('created_at', { ascending: true });

  const { data: existingAllocs } = await supabase
    .from('payment_allocations')
    .select('invoice_id, amount_allocated')
    .eq('tenant_id', user.tenant.id)
    .in('invoice_id', (invoices ?? []).map((i) => i.id));

  const paidMap: Record<string, number> = {};
  (existingAllocs ?? []).forEach((a) => {
    paidMap[a.invoice_id] = (paidMap[a.invoice_id] ?? 0) + Number(a.amount_allocated);
  });

  let remaining = amount;
  const allocations: FifoPreview[] = [];

  for (const inv of invoices ?? []) {
    if (remaining <= 0) break;
    const alreadyPaid = paidMap[inv.id] ?? 0;
    const outstanding = Number(inv.total) - alreadyPaid;
    if (outstanding <= 0) continue;

    const allocated = Math.min(remaining, outstanding);
    allocations.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      originalTotal: Number(inv.total),
      alreadyPaid,
      amountAllocated: allocated,
      willBeFullyPaid: alreadyPaid + allocated >= Number(inv.total),
    });
    remaining -= allocated;
  }

  return { allocations, walletCredit: Math.max(0, remaining), error: null };
}

export async function collectPaymentFifo(input: {
  customer_id: string;
  amount: number;
  method: 'cash' | 'knet' | 'visa_mc' | 'wallet' | 'credit_account';
}): Promise<{ paymentId: string | null; error: string | null }> {
  const parsed = CollectSchema.safeParse(input);
  if (!parsed.success) return { paymentId: null, error: parsed.error.errors[0].message };

  const user = await getSessionUser();
  if (!user?.tenant) return { paymentId: null, error: 'Not authenticated' };

  const supabase = await createClient();
  const { customer_id, amount, method } = parsed.data;
  const tenantId = user.tenant.id;

  // Record the payment
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      tenant_id: tenantId,
      amount,
      method,
      collected_by: user.id,
    })
    .select('id')
    .single();

  if (payErr || !payment) return { paymentId: null, error: payErr?.message ?? 'Failed to record payment' };

  // Run FIFO allocation via DB function
  const { error: allocErr } = await supabase.rpc('allocate_payment_fifo', {
    p_tenant_id: tenantId,
    p_customer_id: customer_id,
    p_payment_id: payment.id,
    p_amount: amount,
    p_actor_id: user.id,
  });

  if (allocErr) return { paymentId: payment.id, error: allocErr.message };

  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    actor_id: user.id,
    action: 'collect_payment_fifo',
    entity: 'payment',
    entity_id: payment.id,
    diff: { customer_id, amount, method },
  });

  return { paymentId: payment.id, error: null };
}

// ─── Wallet ──────────────────────────────────────────────────────────────────

export async function getCustomerWallet(customerId: string): Promise<CustomerWallet | null> {
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('customer_wallets')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .eq('customer_id', customerId)
    .single();

  return data as CustomerWallet | null;
}

export async function getWalletTransactions(customerId: string): Promise<CustomerWalletTransaction[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('customer_wallet_transactions')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data ?? []) as CustomerWalletTransaction[];
}

export async function topUpWallet(
  customerId: string,
  amount: number,
  description = 'Manual top-up',
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  if (amount <= 0) return { error: 'Amount must be positive' };

  const supabase = await createClient();
  const tenantId = user.tenant.id;

  // Upsert wallet
  const { data: wallet, error: walletErr } = await supabase
    .from('customer_wallets')
    .upsert({ tenant_id: tenantId, customer_id: customerId }, { onConflict: 'tenant_id,customer_id' })
    .select('id')
    .single();

  if (walletErr || !wallet) return { error: walletErr?.message ?? 'Failed to access wallet' };

  const { error } = await supabase.from('customer_wallet_transactions').insert({
    tenant_id: tenantId,
    customer_id: customerId,
    wallet_id: wallet.id,
    txn_type: 'credit',
    amount,
    description,
    reference_type: 'manual',
    actor_id: user.id,
  });

  return { error: error?.message ?? null };
}

// ─── Credit Notes ─────────────────────────────────────────────────────────────

export async function createCreditNote(
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = CreditNoteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from('credit_notes').insert({
    tenant_id: user.tenant.id,
    customer_id: parsed.data.customer_id,
    invoice_id: parsed.data.invoice_id ?? null,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
    status: 'open',
    created_by: user.id,
  });

  return { error: error?.message ?? null };
}

export async function listCreditNotes(customerId: string): Promise<CreditNote[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('credit_notes')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  return (data ?? []) as CreditNote[];
}
