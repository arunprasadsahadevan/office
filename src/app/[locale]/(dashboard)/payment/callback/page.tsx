import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { createClient } from '@/lib/supabase/server';
import { retrieveCharge, tapStatusToInvoiceStatus } from '@/lib/tap/client';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Payment Result' };

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invoice?: string; tap_id?: string; status?: string }>;
}

export default async function PaymentCallbackPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { invoice: invoiceId, tap_id: tapChargeId, status: tapStatus } = await searchParams;
  const ar = locale === 'ar';

  let success = false;
  let orderId: string | null = null;
  let errorMsg: string | null = null;

  if (invoiceId && tapChargeId) {
    try {
      const user = await getSessionUser();
      if (user?.tenant) {
        const charge = await retrieveCharge(tapChargeId);
        const invoiceStatus = tapStatusToInvoiceStatus(charge.status);
        success = invoiceStatus === 'paid';

        const supabase = await createClient();
        await supabase
          .from('invoices')
          .update({ status: invoiceStatus })
          .eq('id', invoiceId)
          .eq('tenant_id', user.tenant.id);

        // Also update payment row
        await supabase
          .from('payments')
          .update({ paid_at: new Date().toISOString() })
          .eq('tap_charge_id', tapChargeId)
          .eq('tenant_id', user.tenant.id);

        // Fetch order id for the "view order" button
        const { data: inv } = await supabase
          .from('invoices')
          .select('order_id')
          .eq('id', invoiceId)
          .single();
        orderId = inv?.order_id ?? null;
      }
    } catch (err) {
      errorMsg = (err as Error).message;
    }
  } else {
    errorMsg = 'Missing payment reference';
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', mt: 4 }}>
      <Card>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          {success ? (
            <>
              <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {ar ? 'تم الدفع بنجاح!' : 'Payment Successful!'}
              </Typography>
            </>
          ) : (
            <>
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" fontWeight={700} gutterBottom>
                {ar ? 'فشل الدفع' : 'Payment Failed'}
              </Typography>
              {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
            </>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap', mt: 3 }}>
            {success && orderId && (
              <>
                <Button variant="contained" href={`/api/receipt/${orderId}`} target="_blank">
                  {ar ? 'طباعة الإيصال' : 'Print Receipt'}
                </Button>
                <Button variant="outlined" href={`/${locale}/orders/${orderId}`}>
                  {ar ? 'عرض الطلب' : 'View Order'}
                </Button>
              </>
            )}
            <Button variant={success ? 'text' : 'contained'} href={`/${locale}/pos`}>
              {ar ? 'طلب جديد' : 'New Order'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
