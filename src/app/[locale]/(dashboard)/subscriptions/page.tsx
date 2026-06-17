import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { getSessionUser } from '@/lib/auth';
import { listSubscriptionPlans, listCustomerSubscriptions } from '@/actions/subscriptions';
import { listCustomers } from '@/actions/customers';
import PlanCard from '@/components/subscriptions/PlanCard';
import SubscriptionsClient from './SubscriptionsClient';

export const metadata: Metadata = { title: 'Subscriptions' };

interface Props {
  params: Promise<{ locale: string }>;
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'default' | 'error'> = {
  active: 'success',
  past_due: 'warning',
  paused: 'default',
  cancelled: 'error',
};

export default async function SubscriptionsPage({ params }: Props) {
  const { locale } = await params;
  const [user, plans, subscriptions, customers] = await Promise.all([
    getSessionUser(),
    listSubscriptionPlans(),
    listCustomerSubscriptions(),
    listCustomers(0, 200),
  ]);

  if (!user?.tenant) return null;

  const currency = user.tenant.base_currency ?? 'KWD';

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Subscriptions
      </Typography>

      {/* Plans */}
      <Card sx={{ mb: 4 }}>
        <CardHeader
          title={<Typography variant="h6" fontWeight={600}>Subscription Plans</Typography>}
        />
        <CardContent>
          <SubscriptionsClient
            plans={plans}
            customers={customers.data as Parameters<typeof SubscriptionsClient>[0]['customers']}
            subscriptions={subscriptions}
            currency={currency}
            locale={locale}
          />
        </CardContent>
      </Card>

      {/* Active subscriptions */}
      <Card>
        <CardHeader
          title={<Typography variant="h6" fontWeight={600}>Customer Subscriptions</Typography>}
        />
        <CardContent sx={{ pt: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                  <TableCell>Customer</TableCell>
                  <TableCell>Plan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Period</TableCell>
                  <TableCell>Usage (kg)</TableCell>
                  <TableCell>Usage (items)</TableCell>
                  <TableCell>Payment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No subscriptions yet
                    </TableCell>
                  </TableRow>
                )}
                {subscriptions.map((sub) => {
                  const plan = sub.plan;
                  const kgPct = plan?.included_kg
                    ? Math.min(100, (Number(sub.used_kg) / plan.included_kg) * 100)
                    : null;
                  const itemsPct = plan?.included_items
                    ? Math.min(100, (Number(sub.used_items) / plan.included_items) * 100)
                    : null;
                  const customer = sub.customer as { full_name: string; phone: string } | null;
                  return (
                    <TableRow key={sub.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {customer?.full_name ?? '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {customer?.phone}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {plan?.name_en ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sub.status}
                          size="small"
                          color={STATUS_COLOR[sub.status] ?? 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {sub.current_period_start} → {sub.current_period_end}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ minWidth: 100 }}>
                        {plan?.included_kg != null ? (
                          <Box>
                            <Typography variant="caption">
                              {Number(sub.used_kg).toFixed(1)} / {plan.included_kg} kg
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={kgPct ?? 0}
                              color={kgPct && kgPct >= 90 ? 'error' : 'primary'}
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell sx={{ minWidth: 100 }}>
                        {plan?.included_items != null ? (
                          <Box>
                            <Typography variant="caption">
                              {sub.used_items} / {plan.included_items} pcs
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={itemsPct ?? 0}
                              color={itemsPct && itemsPct >= 90 ? 'error' : 'primary'}
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {sub.payment_method === 'knet_manual_renewal' ? 'KNET' : 'Card auto'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
