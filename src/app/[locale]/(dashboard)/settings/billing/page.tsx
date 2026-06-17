import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CheckIcon from '@mui/icons-material/Check';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { PlatformPlan } from '@/types';

export const metadata: Metadata = { title: 'Billing & Plan' };

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function BillingPage({ params }: Props) {
  const { locale } = await params;
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const supabase = await createClient();

  const [{ data: plans }, { data: currentSub }] = await Promise.all([
    supabase
      .from('platform_plans')
      .select('*')
      .order('price_kwd'),
    supabase
      .from('platform_subscriptions')
      .select('*, plan:platform_plans(*)')
      .eq('tenant_id', user.tenant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ]);

  const activePlanId = (currentSub as { plan_id?: string } | null)?.plan_id;
  const status = (currentSub as { status?: string } | null)?.status ?? 'trial';
  const trialEndsAt = user.tenant.trial_ends_at;

  const daysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Billing & Plan
      </Typography>

      {/* Current status */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>Current Status</Typography>
              <Typography variant="body2" color="text.secondary">
                {status === 'trial'
                  ? `Free trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
                  : `Active subscription`}
              </Typography>
            </Box>
            <Chip
              label={status.charAt(0).toUpperCase() + status.slice(1)}
              color={status === 'active' ? 'success' : status === 'trial' ? 'warning' : 'error'}
              size="small"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Plans */}
      <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
        Available Plans
      </Typography>

      <Grid container spacing={2}>
        {(plans ?? []).map((plan: PlatformPlan) => {
          const isCurrent = plan.id === activePlanId;
          const features = plan.features ?? {};

          return (
            <Grid item xs={12} sm={4} key={plan.id}>
              <Card
                sx={{
                  height: '100%',
                  border: isCurrent ? '2px solid' : '1px solid',
                  borderColor: isCurrent ? 'primary.main' : 'divider',
                }}
              >
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" fontWeight={700}>{plan.name}</Typography>
                      {isCurrent && <Chip label="Current" color="primary" size="small" />}
                    </Box>
                  }
                  subheader={
                    <Typography variant="h5" fontWeight={700} color="primary.main" sx={{ mt: 0.5 }}>
                      KWD {Number(plan.price_kwd).toFixed(3)}
                      <Typography component="span" variant="caption" color="text.secondary"> /mo</Typography>
                    </Typography>
                  }
                />
                <Divider />
                <CardContent>
                  {plan.max_branches && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                      <CheckIcon fontSize="small" color="success" />
                      <Typography variant="body2">Up to {plan.max_branches} branch{plan.max_branches !== 1 ? 'es' : ''}</Typography>
                    </Box>
                  )}
                  {plan.max_users && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                      <CheckIcon fontSize="small" color="success" />
                      <Typography variant="body2">Up to {plan.max_users} users</Typography>
                    </Box>
                  )}
                  {plan.max_orders_per_month && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                      <CheckIcon fontSize="small" color="success" />
                      <Typography variant="body2">{plan.max_orders_per_month.toLocaleString()} orders/month</Typography>
                    </Box>
                  )}
                  {Object.entries(features).filter(([, v]) => v).map(([key]) => (
                    <Box key={key} sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                      <CheckIcon fontSize="small" color="success" />
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {key.replace(/_/g, ' ')}
                      </Typography>
                    </Box>
                  ))}

                  {!isCurrent && (
                    <Button
                      variant="contained"
                      fullWidth
                      size="small"
                      sx={{ mt: 2 }}
                      component="a"
                      href={`/${locale}/payment/upgrade?plan=${plan.id}`}
                    >
                      Upgrade
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
