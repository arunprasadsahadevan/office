import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Divider from '@mui/material/Divider';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';

interface Props {
  params: Promise<{ orderNumber: string }>;
}

const STATUS_STEPS = [
  'received', 'sorting', 'washing', 'drying', 'ironing', 'qc', 'ready',
];

const STATUS_LABEL: Record<string, string> = {
  received: 'Received',
  sorting: 'Sorting',
  washing: 'Washing',
  drying: 'Drying',
  ironing: 'Ironing',
  qc: 'Quality Check',
  ready: 'Ready',
  out_for_delivery: 'Out for Delivery',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  received: 'default',
  sorting: 'primary',
  washing: 'primary',
  drying: 'primary',
  ironing: 'primary',
  qc: 'warning',
  ready: 'success',
  out_for_delivery: 'primary',
  completed: 'success',
  cancelled: 'error',
};

export default async function TrackOrderPage({ params }: Props) {
  const { orderNumber } = await params;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  const { data: order } = await supabase
    .from('orders')
    .select(
      `id, order_number, status, promised_at, fulfillment_type, created_at,
       tenant:tenants(name),
       customer:customers(full_name),
       order_items(id, garment_type, status, qr_code, service:services(name_en))`,
    )
    .eq('order_number', orderNumber.toUpperCase())
    .single();

  if (!order) notFound();

  const rawTenant = order.tenant as unknown;
  const tenantName = (Array.isArray(rawTenant) ? rawTenant[0] : rawTenant as { name: string } | null)?.name ?? 'LaundryOS';

  const rawCustomer = order.customer as unknown;
  const customerName = (Array.isArray(rawCustomer) ? rawCustomer[0] : rawCustomer as { full_name: string } | null)?.full_name ?? 'Customer';

  const activeStep = STATUS_STEPS.indexOf(order.status);
  const isFinalState = order.status === 'completed' || order.status === 'cancelled' || order.status === 'out_for_delivery';

  type ItemRow = {
    id: string;
    garment_type: string | null;
    status: string;
    qr_code: string | null;
    service: { name_en: string } | null;
  };

  const items = ((order.order_items ?? []) as unknown as ItemRow[]).map((item) => ({
    ...item,
    service: Array.isArray(item.service) ? (item.service[0] ?? null) : item.service,
  }));

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LocalLaundryServiceIcon sx={{ color: 'white', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>{tenantName}</Typography>
          <Typography variant="caption" color="text.secondary">Order Tracking</Typography>
        </Box>
      </Box>

      {/* Order summary card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h5" fontWeight={700}>{order.order_number}</Typography>
              <Typography variant="body2" color="text.secondary">
                Hello, {customerName}
              </Typography>
            </Box>
            <Chip
              label={STATUS_LABEL[order.status] ?? order.status}
              color={STATUS_COLOR[order.status] ?? 'default'}
              size="small"
            />
          </Box>

          {order.promised_at && (
            <Typography variant="body2" color="text.secondary">
              Ready by:{' '}
              <strong>
                {new Date(order.promised_at).toLocaleString('en-KW', {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: '2-digit', minute: '2-digit',
                })}
              </strong>
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Progress stepper */}
      {!isFinalState && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              Progress
            </Typography>
            <Stepper activeStep={activeStep} alternativeLabel>
              {STATUS_STEPS.map((s) => (
                <Step key={s}>
                  <StepLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.7rem' } }}>
                    {STATUS_LABEL[s]}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      )}

      {isFinalState && order.status === 'completed' && (
        <Card sx={{ mb: 3, bgcolor: 'success.light' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} color="success.dark">
              Your order has been completed. Thank you!
            </Typography>
          </CardContent>
        </Card>
      )}

      {isFinalState && order.status === 'out_for_delivery' && (
        <Card sx={{ mb: 3, bgcolor: 'primary.light' }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} color="primary.dark">
              Your order is on its way to you!
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Garment items */}
      {items.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
              Items ({items.length})
            </Typography>
            {items.map((item, idx) => (
              <Box key={item.id}>
                {idx > 0 && <Divider sx={{ my: 1 }} />}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {item.garment_type ?? 'Garment'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.service?.name_en ?? '—'}
                    </Typography>
                  </Box>
                  <Chip
                    label={STATUS_LABEL[item.status] ?? item.status}
                    size="small"
                    variant="outlined"
                    color={STATUS_COLOR[item.status] ?? 'default'}
                  />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 4 }}>
        Powered by LaundryOS
      </Typography>
    </Container>
  );
}
