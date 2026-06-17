import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InventoryIcon from '@mui/icons-material/Inventory2';
import { getSessionUser, getDaysLeftInTrial } from '@/lib/auth';
import { getDashboardKpis } from '@/actions/orders';
import KpiCard from '@/components/dashboard/KpiCard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard');
  return { title: t('title') };
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations('dashboard');
  const [user, kpis] = await Promise.all([getSessionUser(), getDashboardKpis()]);

  if (!user) return null;

  const daysLeft = getDaysLeftInTrial(user.tenant?.trial_ends_at ?? null);
  const isTrialing = user.tenant?.status === 'trial';

  return (
    <Box>
      {/* Trial banner */}
      {isTrialing && (
        <Alert
          severity="info"
          action={
            <Button size="small" variant="outlined" color="inherit">
              {t('upgradePlan')}
            </Button>
          }
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {t('trialBanner', { daysLeft })}
        </Alert>
      )}

      {/* Welcome */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {t('welcome', { name: user.profile.full_name?.split(' ')[0] ?? 'there' })}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {user.tenant?.name}
          </Typography>
          <Chip
            label={user.tenant?.status ?? '—'}
            size="small"
            color={user.tenant?.status === 'active' ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>
        </Box>
        <Button variant="contained" size="large" href={`/${locale}/pos`}
          startIcon={<ReceiptLongIcon />}>
          {locale === 'ar' ? 'طلب جديد' : 'New Order'}
        </Button>
      </Box>

      {/* KPI cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title={t('todayOrders')}
            value={kpis.ordersToday}
            icon={<ReceiptLongIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title={t('todayRevenue')}
            value={`KD ${kpis.revenueToday.toFixed(3)}`}
            icon={<AttachMoneyIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title={t('pendingPickups')}
            value={kpis.pendingPickups}
            icon={<LocalShippingIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title={t('slaAtRisk')}
            value={kpis.slaAtRisk}
            icon={<WarningAmberIcon />}
            color={kpis.slaAtRisk > 0 ? 'error' : 'success'}
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            title={t('lowStock')}
            value={kpis.lowStockItems}
            icon={<InventoryIcon />}
            color={kpis.lowStockItems > 0 ? 'warning' : 'success'}
          />
        </Grid>
      </Grid>

      {/* Recent orders placeholder */}
      <Card>
        <CardHeader
          title={
            <Typography variant="h6" fontWeight={600}>
              {t('recentOrders')}
            </Typography>
          }
        />
        <CardContent>
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              color: 'text.secondary',
            }}
          >
            <ReceiptLongIcon sx={{ fontSize: 48, mb: 2, opacity: 0.3 }} />
            <Typography variant="body2">{t('noOrders')}</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
