import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import {
  getCustomerStats,
  getMonthlyOrderHistory,
  getCustomerInvoices,
} from '@/actions/customerAnalytics';
import { listCustomerSubscriptions } from '@/actions/subscriptions';
import { getCustomerWallet, getWalletTransactions } from '@/actions/paymentCollection';
import CustomerDetailClient from './CustomerDetailClient';

export const metadata: Metadata = { title: 'Customer Details' };

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user?.tenant) return notFound();

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!customer) return notFound();

  const [stats, monthlyData, invoices, subscriptions, wallet, walletTxns] = await Promise.all([
    getCustomerStats(id),
    getMonthlyOrderHistory(id),
    getCustomerInvoices(id),
    listCustomerSubscriptions(id),
    getCustomerWallet(id),
    getWalletTransactions(id),
  ]);

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, created_at, promised_at, invoices(total, status)')
    .eq('tenant_id', user.tenant.id)
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <CustomerDetailClient
      customer={customer}
      stats={stats}
      monthlyData={monthlyData}
      invoices={invoices}
      orders={orders ?? []}
      subscriptions={subscriptions}
      wallet={wallet}
      walletTransactions={walletTxns}
    />
  );
}
