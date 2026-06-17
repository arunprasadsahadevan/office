import { redirect } from 'next/navigation';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { getSessionUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tap_id?: string; status?: string; plan?: string }>;
}

export default async function UpgradeSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { tap_id, status, plan: planId } = await searchParams;

  const user = await getSessionUser();
  if (!user?.tenant) redirect(`/${locale}/login`);

  const succeeded = status === 'CAPTURED' || status === 'AUTHORIZED';

  if (succeeded && planId) {
    const supabase = await createClient();

    const { data: plan } = await supabase
      .from('platform_plans')
      .select('id')
      .eq('id', planId)
      .single();

    if (plan) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase.from('platform_subscriptions').upsert(
        {
          tenant_id: user.tenant.id,
          plan_id: planId,
          status: 'active',
          current_period_end: periodEnd.toISOString().split('T')[0],
          payment_method: 'tap',
        },
        { onConflict: 'tenant_id' },
      );
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          {succeeded ? (
            <>
              <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Payment Successful!
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                Your plan has been upgraded. Your new limits are active immediately.
              </Typography>
              {tap_id && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                  Reference: {tap_id}
                </Typography>
              )}
            </>
          ) : (
            <>
              <ErrorOutlineIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Payment Not Completed
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                The payment was not captured. Your plan has not been changed.
                Please try again or contact support.
              </Typography>
            </>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              component="a"
              href={`/${locale}/dashboard`}
            >
              Go to Dashboard
            </Button>
            {!succeeded && (
              <Button
                variant="outlined"
                component="a"
                href={`/${locale}/settings/billing`}
              >
                Back to Billing
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
