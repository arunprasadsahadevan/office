'use client';

import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { previewFifoAllocation, collectPaymentFifo, topUpWallet } from '@/actions/paymentCollection';
import { getCustomerStatement } from '@/actions/customerAnalytics';
import type {
  Customer, CustomerWallet, CustomerWalletTransaction,
  CustomerSubscription, CustomerSubscriptionPlan,
} from '@/types';
import type { CustomerStats, MonthlyOrderData, CustomerInvoiceSummary } from '@/actions/customerAnalytics';

interface Props {
  customer: Customer;
  stats: CustomerStats | null;
  monthlyData: MonthlyOrderData[];
  invoices: CustomerInvoiceSummary[];
  orders: Array<{
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    promised_at: string | null;
    invoices: Array<{ total: unknown; status: string }>;
  }>;
  subscriptions: Array<CustomerSubscription & {
    plan: CustomerSubscriptionPlan | null;
    customer: { id: string; full_name: string; phone: string } | null;
  }>;
  wallet: CustomerWallet | null;
  walletTransactions: CustomerWalletTransaction[];
}

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  received: 'info',
  sorting: 'info',
  washing: 'info',
  drying: 'info',
  ironing: 'info',
  qc: 'warning',
  ready: 'success',
  out_for_delivery: 'warning',
  completed: 'success',
  cancelled: 'error',
  unpaid: 'warning',
  partial: 'warning',
  paid: 'success',
  overdue: 'error',
};

export default function CustomerDetailClient({
  customer, stats, monthlyData, invoices, orders, subscriptions, wallet, walletTransactions,
}: Props) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const [tab, setTab] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState<'cash' | 'knet'>('cash');
  const [collectPreview, setCollectPreview] = useState<Awaited<ReturnType<typeof previewFifoAllocation>> | null>(null);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collectSuccess, setCollectSuccess] = useState<string | null>(null);

  const [statementOpen, setStatementOpen] = useState(false);
  const [stmtFrom, setStmtFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [stmtTo, setStmtTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [statement, setStatement] = useState<Awaited<ReturnType<typeof getCustomerStatement>> | null>(null);

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  async function handlePreviewFifo() {
    const amount = parseFloat(collectAmount);
    if (!amount || amount <= 0) return;
    const preview = await previewFifoAllocation(customer.id, amount);
    setCollectPreview(preview);
  }

  function handleCollect() {
    const amount = parseFloat(collectAmount);
    if (!amount) return;
    startTransition(async () => {
      const res = await collectPaymentFifo({ customer_id: customer.id, amount, method: collectMethod });
      if (res.error) { setCollectError(res.error); return; }
      setCollectSuccess(`Payment of KD ${amount.toFixed(3)} collected and allocated.`);
      setCollectOpen(false);
      setCollectAmount('');
      setCollectPreview(null);
    });
  }

  function handleLoadStatement() {
    startTransition(async () => {
      const data = await getCustomerStatement(customer.id, stmtFrom, stmtTo);
      setStatement(data);
    });
  }

  function handleTopUp() {
    const amount = parseFloat(topUpAmount);
    if (!amount) return;
    startTransition(async () => {
      const res = await topUpWallet(customer.id, amount);
      if (res.error) return;
      setTopUpOpen(false);
      setTopUpAmount('');
      window.location.reload();
    });
  }

  const activeSub = subscriptions.find((s) => s.status === 'active');
  const outstandingInvoices = invoices.filter((i) => ['unpaid', 'partial', 'overdue'].includes(i.status));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button variant="text" startIcon={<ArrowBackIcon />} href={`/${locale}/customers`} size="small">
          Customers
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>{customer.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {customer.phone}{customer.email ? ` · ${customer.email}` : ''}
            {' · '}
            <Chip label={customer.customer_type} size="small" variant="outlined" />
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setCollectOpen(true)}>
          Collect Payment
        </Button>
      </Box>

      {collectSuccess && (
        <Alert severity="success" onClose={() => setCollectSuccess(null)} sx={{ mb: 2 }}>
          {collectSuccess}
        </Alert>
      )}

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'Lifetime Spend',
            value: `KD ${(stats?.lifetime_spend ?? 0).toFixed(3)}`,
            icon: <TrendingUpIcon />,
            color: 'primary.main',
          },
          {
            label: 'Total Orders',
            value: stats?.total_orders ?? 0,
            icon: <ReceiptIcon />,
            color: 'text.primary',
          },
          {
            label: 'Outstanding',
            value: `KD ${(stats?.outstanding_balance ?? 0).toFixed(3)}`,
            icon: <ReceiptIcon />,
            color: (stats?.outstanding_balance ?? 0) > 0 ? 'error.main' : 'success.main',
          },
          {
            label: 'Wallet Balance',
            value: `KD ${(wallet?.balance ?? 0).toFixed(3)}`,
            icon: <AccountBalanceWalletIcon />,
            color: 'info.main',
          },
        ].map((kpi) => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card variant="outlined">
              <CardContent sx={{ py: 2 }}>
                <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                <Typography variant="h6" fontWeight={700} color={kpi.color}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* More stats row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Avg Order Value</Typography>
              <Typography fontWeight={600}>KD {(stats?.avg_order_value ?? 0).toFixed(3)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Orders This Month</Typography>
              <Typography fontWeight={600}>{stats?.orders_this_month ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Favourite Service</Typography>
              <Typography fontWeight={600} noWrap>{stats?.favourite_service ?? '—'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">Active Plan</Typography>
              <Typography fontWeight={600} noWrap>
                {activeSub?.plan?.name_en ?? '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable">
        <Tab label="Overview" />
        <Tab label={`Orders (${orders.length})`} />
        <Tab label={`Invoices (${invoices.length})`} />
        <Tab label={`Subscriptions (${subscriptions.length})`} />
        <Tab label="Wallet" />
        <Tab label="Statement" />
      </Tabs>

      {/* Overview */}
      {tab === 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Monthly Visit Frequency (Last 12 Months)
          </Typography>
          <Box sx={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(v) => {
                    const [y, m] = v.split('-');
                    return new Date(Number(y), Number(m) - 1).toLocaleString('default', { month: 'short' });
                  }}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  formatter={(val, name) =>
                    name === 'revenue' ? `KD ${Number(val).toFixed(3)}` : val
                  }
                />
                <Bar dataKey="order_count" fill="#1d4ed8" name="Orders" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Customer Since</Typography>
              <Typography>
                {stats?.first_order_date
                  ? new Date(stats.first_order_date).toLocaleDateString()
                  : '—'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">Last Visit</Typography>
              <Typography>
                {stats?.last_order_date
                  ? new Date(stats.last_order_date).toLocaleDateString()
                  : '—'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Orders */}
      {tab === 1 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Total</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((o) => (
              <TableRow key={o.id} hover>
                <TableCell sx={{ fontFamily: 'monospace' }}>{o.order_number}</TableCell>
                <TableCell>
                  <Chip
                    label={o.status}
                    size="small"
                    color={STATUS_COLORS[o.status] ?? 'default'}
                  />
                </TableCell>
                <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {o.invoices[0]
                    ? `KD ${Number(o.invoices[0].total).toFixed(3)}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Button size="small" href={`/${locale}/orders/${o.id}`}>View</Button>
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                  No orders yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Invoices */}
      {tab === 2 && (
        <>
          {outstandingInvoices.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {outstandingInvoices.length} outstanding invoice(s) totalling KD{' '}
              {outstandingInvoices.reduce((s, i) => s + i.total, 0).toFixed(3)}.
              <Button size="small" sx={{ ml: 1 }} onClick={() => setCollectOpen(true)}>
                Collect Payment
              </Button>
            </Alert>
          )}
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Order</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{inv.invoice_number}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{inv.order_number ?? '—'}</TableCell>
                  <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>KD {inv.total.toFixed(3)}</TableCell>
                  <TableCell>
                    <Chip
                      label={inv.status}
                      size="small"
                      color={STATUS_COLORS[inv.status] ?? 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    No invoices yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}

      {/* Subscriptions */}
      {tab === 3 && (
        <Stack spacing={2}>
          {subscriptions.map((sub) => (
            <Card variant="outlined" key={sub.id}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography fontWeight={700}>
                      {sub.plan?.name_en ?? 'Unknown Plan'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {sub.current_period_start} → {sub.current_period_end}
                    </Typography>
                  </Box>
                  <Chip
                    label={sub.status}
                    color={STATUS_COLORS[sub.status] ?? 'default'}
                    size="small"
                  />
                </Box>
                {sub.plan?.included_items && (
                  <Box sx={{ mt: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Items: {sub.used_items} / {sub.plan.included_items}
                    </Typography>
                    <Box
                      sx={{
                        mt: 0.5,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'grey.200',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          height: '100%',
                          width: `${Math.min(100, (sub.used_items / sub.plan.included_items) * 100)}%`,
                          bgcolor: sub.used_items >= sub.plan.included_items ? 'error.main' : 'primary.main',
                          borderRadius: 3,
                          transition: 'width 0.3s',
                        }}
                      />
                    </Box>
                  </Box>
                )}
                {sub.plan?.included_kg && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    KG: {sub.used_kg} / {sub.plan.included_kg}
                  </Typography>
                )}
                {sub.plan?.credit_amount && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Wallet credit: KD {(sub.wallet_credit_balance ?? 0).toFixed(3)} remaining
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
          {subscriptions.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No subscriptions for this customer.
            </Typography>
          )}
        </Stack>
      )}

      {/* Wallet */}
      {tab === 4 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Current Balance</Typography>
              <Typography variant="h5" fontWeight={700} color="info.main">
                KD {(wallet?.balance ?? 0).toFixed(3)}
              </Typography>
            </Box>
            <Button variant="outlined" onClick={() => setTopUpOpen(true)}>
              Top Up
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {walletTransactions.map((txn) => (
                <TableRow key={txn.id} hover>
                  <TableCell>{new Date(txn.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{txn.description}</TableCell>
                  <TableCell>
                    <Chip
                      label={txn.txn_type}
                      size="small"
                      color={txn.txn_type === 'credit' ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: txn.txn_type === 'credit' ? 'success.main' : 'error.main' }}>
                    {txn.txn_type === 'credit' ? '+' : '-'}KD {txn.amount.toFixed(3)}
                  </TableCell>
                </TableRow>
              ))}
              {walletTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    No wallet transactions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Statement */}
      {tab === 5 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', mb: 3, flexWrap: 'wrap' }}>
            <TextField
              label="From"
              type="date"
              value={stmtFrom}
              onChange={(e) => setStmtFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
            />
            <TextField
              label="To"
              type="date"
              value={stmtTo}
              onChange={(e) => setStmtTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              size="small"
            />
            <Button variant="contained" onClick={handleLoadStatement} disabled={isPending}>
              Generate Statement
            </Button>
          </Box>

          {statement && (
            <>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Statement: {stmtFrom} to {stmtTo}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {customer.full_name} · {customer.phone}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Ref</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Credit</TableCell>
                    <TableCell align="right">Balance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statement.lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{line.date}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{line.ref}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell align="right">
                        {line.debit > 0 ? `KD ${line.debit.toFixed(3)}` : ''}
                      </TableCell>
                      <TableCell align="right">
                        {line.credit > 0 ? `KD ${line.credit.toFixed(3)}` : ''}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 600, color: line.balance > 0 ? 'error.main' : 'success.main' }}
                      >
                        KD {line.balance.toFixed(3)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography fontWeight={700}>Closing Balance</Typography>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 700,
                        color: statement.closingBalance > 0 ? 'error.main' : 'success.main',
                      }}
                    >
                      KD {statement.closingBalance.toFixed(3)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </>
          )}
        </Box>
      )}

      {/* Collect Payment Dialog */}
      <Dialog open={collectOpen} onClose={() => { setCollectOpen(false); setCollectPreview(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>Collect Payment — {customer.full_name}</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          {collectError && <Alert severity="error" sx={{ mb: 2 }}>{collectError}</Alert>}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="Amount (KWD)"
              type="number"
              value={collectAmount}
              onChange={(e) => { setCollectAmount(e.target.value); setCollectPreview(null); }}
              inputProps={{ step: '0.001', min: '0.001' }}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              label="Method"
              value={collectMethod}
              onChange={(e) => setCollectMethod(e.target.value as 'cash' | 'knet')}
              sx={{ width: 140 }}
            >
              <option value="cash">Cash</option>
              <option value="knet">KNET</option>
            </TextField>
          </Box>
          <Button variant="outlined" size="small" onClick={handlePreviewFifo} disabled={!collectAmount}>
            Preview Allocation
          </Button>

          {collectPreview && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Payment will be allocated as follows:
              </Typography>
              {collectPreview.allocations.map((a) => (
                <Box key={a.invoiceId} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="body2">{a.invoiceNumber}</Typography>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography variant="body2" fontWeight={600}>
                      KD {a.amountAllocated.toFixed(3)}
                    </Typography>
                    {a.willBeFullyPaid && (
                      <Chip label="Fully paid" size="small" color="success" />
                    )}
                  </Box>
                </Box>
              ))}
              {collectPreview.walletCredit > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, mt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                  <Typography variant="body2" color="info.main">Excess → Wallet credit</Typography>
                  <Typography variant="body2" fontWeight={600} color="info.main">
                    KD {collectPreview.walletCredit.toFixed(3)}
                  </Typography>
                </Box>
              )}
              {collectPreview.allocations.length === 0 && (
                <Alert severity="info">No outstanding invoices. Full amount goes to wallet.</Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCollectOpen(false); setCollectPreview(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleCollect} disabled={!collectAmount || isPending}>
            Collect KD {parseFloat(collectAmount || '0').toFixed(3)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Top Up Dialog */}
      <Dialog open={topUpOpen} onClose={() => setTopUpOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Top Up Wallet</DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <TextField
            label="Amount (KWD)"
            type="number"
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            inputProps={{ step: '0.001', min: '0.001' }}
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTopUpOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleTopUp} disabled={!topUpAmount || isPending}>
            Top Up KD {parseFloat(topUpAmount || '0').toFixed(3)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
