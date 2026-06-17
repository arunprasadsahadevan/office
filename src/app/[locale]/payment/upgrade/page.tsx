import { notFound, redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import CheckIcon from '@mui/icons-material/Check';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth';
import type { PlatformPlan } from '@/types';
import UpgradePayButton from '@/components/payment/UpgradePayButton';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plan?: string }>;
}

export default async function UpgradePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { plan: planId } = await searchParams;

  if (!planId) redirect(`/${locale}/settings/billing`);

  const user = await getSessionUser();
  if (!user?.tenant) redirect(`/${locale}/login`);

  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('platform_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (!plan) notFound();

  const p = plan as PlatformPlan;
  const features = p.features ?? {};

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LocalLaundryServiceIcon sx={{ color: 'white', fontSize: 22 }} />
        </Box>
        <Typography variant="h6" fontWeight={700}>LaundryOS</Typography>
      </Box>

      <Typography variant="h4" fontWeight={700} gutterBottom>
        Upgrade to {p.name}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        You are upgrading the LaundryOS subscription for{' '}
        <strong>{user.tenant.name}</strong>.
      </Typography>

      {/* Plan summary */}
      <Card sx={{ mb: 3, border: '2px solid', borderColor: 'primary.main' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>{p.name} Plan</Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h5" fontWeight={700} color="primary.main">
                KWD {Number(p.price_kwd).toFixed(3)}
              </Typography>
              <Typography variant="caption" color="text.secondary">per month</Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {p.max_branches && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <CheckIcon fontSize="small" color="success" />
              <Typography variant="body2">Up to {p.max_branches} branch{p.max_branches !== 1 ? 'es' : ''}</Typography>
            </Box>
          )}
          {p.max_users && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <CheckIcon fontSize="small" color="success" />
              <Typography variant="body2">Up to {p.max_users} users</Typography>
            </Box>
          )}
          {p.max_orders_per_month && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              <CheckIcon fontSize="small" color="success" />
              <Typography variant="body2">{p.max_orders_per_month.toLocaleString()} orders/month</Typography>
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
        </CardContent>
      </Card>

      {/* Pay button — client component handles the server action call */}
      <UpgradePayButton
        planId={p.id}
        planName={p.name}
        priceKwd={Number(p.price_kwd)}
        tenantId={user.tenant.id}
        locale={locale}
      />

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
        Payments are processed securely via Tap Payments. Card data never touches LaundryOS servers.
      </Typography>
    </Container>
  );
}
