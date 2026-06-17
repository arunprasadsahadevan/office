'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { ChartOfAccount, Expense, CashReconciliation, BranchPnl } from '@/types';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ExpenseSchema = z.object({
  branch_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  amount: z.coerce.number().positive(),
  description: z.string().min(1).max(250),
  expense_date: z.string(),
  receipt_url: z.string().url().optional().or(z.literal('')),
});

const ReconciliationSchema = z.object({
  branch_id: z.string().uuid(),
  reconciliation_date: z.string(),
  shift: z.enum(['day', 'night']).default('day'),
  counted_cash: z.coerce.number().nonnegative(),
  note: z.string().optional(),
});

// ─── Chart of Accounts ────────────────────────────────────────────────────────

export async function listChartOfAccounts() {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('tenant_id', user.tenant.id)
    .order('code');

  return (data ?? []) as ChartOfAccount[];
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function listExpenses(
  branchId?: string,
  from?: string,
  to?: string,
) {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  let q = supabase
    .from('expenses')
    .select('*, branch:branches(id,name), account:chart_of_accounts(code,name_en,name_ar)')
    .eq('tenant_id', user.tenant.id)
    .order('expense_date', { ascending: false });

  if (branchId) q = q.eq('branch_id', branchId);
  if (from) q = q.gte('expense_date', from);
  if (to) q = q.lte('expense_date', to);

  const { data } = await q;
  return (data ?? []) as (Expense & {
    branch: { id: string; name: string } | null;
    account: { code: string; name_en: string; name_ar: string } | null;
  })[];
}

export async function createExpense(
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const raw = Object.fromEntries(formData.entries());
  const parsed = ExpenseSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from('expenses').insert({
    tenant_id: user.tenant.id,
    recorded_by: user.id,
    branch_id: parsed.data.branch_id || null,
    account_id: parsed.data.account_id || null,
    amount: parsed.data.amount,
    description: parsed.data.description,
    expense_date: parsed.data.expense_date,
    receipt_url: parsed.data.receipt_url || null,
  });

  if (!error) {
    await supabase.from('audit_log').insert({
      tenant_id: user.tenant.id,
      actor_id: user.id,
      action: 'create',
      entity: 'expense',
      diff: { amount: parsed.data.amount, description: parsed.data.description },
    });
  }

  return { error: error?.message ?? null };
}

// ─── Branch P&L ───────────────────────────────────────────────────────────────

export async function getBranchPnl(
  branchId: string,
  from: string,
  to: string,
): Promise<BranchPnl> {
  const user = await getSessionUser();
  if (!user?.tenant) return { branch_id: branchId, branch_name: '', revenue: 0, expenses: 0, gross_profit: 0 };

  const supabase = await createClient();

  const [branchRes, revenueRes, expensesRes] = await Promise.all([
    supabase
      .from('branches')
      .select('id,name')
      .eq('id', branchId)
      .eq('tenant_id', user.tenant.id)
      .single(),

    supabase
      .from('invoices')
      .select('total')
      .eq('tenant_id', user.tenant.id)
      .eq('status', 'paid')
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59Z')
      // Join through orders to filter by branch
      .in(
        'order_id',
        (
          await supabase
            .from('orders')
            .select('id')
            .eq('branch_id', branchId)
            .eq('tenant_id', user.tenant.id)
        ).data?.map((o) => o.id) ?? [],
      ),

    supabase
      .from('expenses')
      .select('amount')
      .eq('tenant_id', user.tenant.id)
      .eq('branch_id', branchId)
      .gte('expense_date', from)
      .lte('expense_date', to),
  ]);

  const revenue = (revenueRes.data ?? []).reduce((s, r) => s + Number(r.total), 0);
  const expenses = (expensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0);

  return {
    branch_id: branchId,
    branch_name: branchRes.data?.name ?? branchId,
    revenue,
    expenses,
    gross_profit: revenue - expenses,
  };
}

export async function getAllBranchesPnl(
  from: string,
  to: string,
): Promise<BranchPnl[]> {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from('branches')
    .select('id,name')
    .eq('tenant_id', user.tenant.id)
    .eq('is_active', true);

  if (!branches?.length) return [];

  return Promise.all(branches.map((b) => getBranchPnl(b.id, from, to)));
}

// ─── Cash Reconciliation ──────────────────────────────────────────────────────

export async function getExpectedCash(branchId: string, date: string): Promise<number> {
  const user = await getSessionUser();
  if (!user?.tenant) return 0;

  const supabase = await createClient();
  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59Z`;

  // Get order IDs for the branch and date
  const { data: orderIds } = await supabase
    .from('orders')
    .select('id')
    .eq('branch_id', branchId)
    .eq('tenant_id', user.tenant.id)
    .gte('created_at', dayStart)
    .lte('created_at', dayEnd);

  if (!orderIds?.length) return 0;

  const ids = orderIds.map((o) => o.id);

  const { data: invoiceIds } = await supabase
    .from('invoices')
    .select('id')
    .eq('tenant_id', user.tenant.id)
    .in('order_id', ids);

  if (!invoiceIds?.length) return 0;

  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('tenant_id', user.tenant.id)
    .eq('method', 'cash')
    .in(
      'invoice_id',
      invoiceIds.map((i) => i.id),
    );

  return (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
}

export async function createCashReconciliation(
  input: z.infer<typeof ReconciliationSchema>,
): Promise<{ error: string | null }> {
  const user = await getSessionUser();
  if (!user?.tenant) return { error: 'Not authenticated' };

  const parsed = ReconciliationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const expected = await getExpectedCash(
    parsed.data.branch_id,
    parsed.data.reconciliation_date,
  );

  const supabase = await createClient();
  const { error } = await supabase.from('cash_reconciliation').insert({
    tenant_id: user.tenant.id,
    branch_id: parsed.data.branch_id,
    reconciliation_date: parsed.data.reconciliation_date,
    shift: parsed.data.shift,
    expected_cash: expected,
    counted_cash: parsed.data.counted_cash,
    note: parsed.data.note ?? null,
    reconciled_by: user.id,
  });

  if (!error) {
    await supabase.from('audit_log').insert({
      tenant_id: user.tenant.id,
      actor_id: user.id,
      action: 'reconcile',
      entity: 'cash_reconciliation',
      diff: {
        branch_id: parsed.data.branch_id,
        date: parsed.data.reconciliation_date,
        expected,
        counted: parsed.data.counted_cash,
        variance: parsed.data.counted_cash - expected,
      },
    });
  }

  return { error: error?.message ?? null };
}

export async function listReconciliations(branchId?: string, limit = 30) {
  const user = await getSessionUser();
  if (!user?.tenant) return [];

  const supabase = await createClient();
  let q = supabase
    .from('cash_reconciliation')
    .select('*, branch:branches(id,name), reconciler:user_profiles(full_name)')
    .eq('tenant_id', user.tenant.id)
    .order('reconciliation_date', { ascending: false })
    .limit(limit);

  if (branchId) q = q.eq('branch_id', branchId);

  const { data } = await q;
  return (data ?? []) as (CashReconciliation & {
    branch: { id: string; name: string } | null;
    reconciler: { full_name: string | null } | null;
  })[];
}
