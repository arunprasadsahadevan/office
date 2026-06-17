'use client';

import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import PaymentsIcon from '@mui/icons-material/Payments';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { createOrder, recordCashPayment } from '@/actions/orders';
import { initiateTapPayment } from '@/actions/payments';
import type { Customer } from '@/types';
import type { GarmentDraft } from './PosWizard';

type PaymentMethod = 'cash' | 'knet' | 'card';

interface Props {
  customer: Customer;
  garments: GarmentDraft[];
  branchId: string;
  onBack: () => void;
  onOrderCreated: (orderId: string, invoiceId: string) => void;
}

export default function ReviewStep({ customer, garments, branchId, onBack, onOrderCreated }: Props) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const subtotal = garments.reduce((sum, g) => sum + g.unit_price, 0);

  async function handleConfirm() {
    setError(null);
    startTransition(async () => {
      // 1. Create order
      const result = await createOrder({
        customer_id: customer.id,
        branch_id: branchId,
        fulfillment_type: 'walk_in',
        garments: garments.map((g) => ({
          garment_type: g.garment_type,
          service_id: g.service_id,
          unit_price: g.unit_price,
          special_instructions: g.special_instructions || undefined,
          pre_existing_condition: {
            stain: g.condition.stain,
            tear: g.condition.tear,
            missing_button: g.condition.missing_button,
            faded: g.condition.faded,
            photo_urls: g.condition.photo_urls,
          },
        })),
      });

      if (result.error) { setError(result.error); return; }
      if (!result.orderId || !result.invoiceId) {
        setError('Unexpected error creating order');
        return;
      }

      if (paymentMethod === 'cash') {
        const payResult = await recordCashPayment(result.invoiceId);
        if (payResult.error) { setError(payResult.error); return; }
        onOrderCreated(result.orderId, result.invoiceId);
        return;
      }

      // KNET or card → Tap hosted checkout
      const sourceId = paymentMethod === 'knet' ? 'src_kw.knet' : 'src_card';
      const baseUrl = window.location.origin;
      const tapResult = await initiateTapPayment({
        invoiceId: result.invoiceId,
        sourceId,
        redirectBaseUrl: `${baseUrl}/${locale}`,
      });

      if (tapResult.error) { setError(tapResult.error); return; }
      if (tapResult.checkoutUrl) {
        window.location.href = tapResult.checkoutUrl;
      }
    });
  }

  return (
    <Box sx={{ maxWidth: 520 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {ar ? 'مراجعة الطلب' : 'Order Review'}
      </Typography>

      {/* Customer */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ py: '12px !important' }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {ar ? 'العميل' : 'Customer'}
          </Typography>
          <Typography fontWeight={600}>{customer.full_name}</Typography>
          <Typography variant="body2" color="text.secondary">{customer.phone}</Typography>
        </CardContent>
      </Card>

      {/* Items */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {ar ? `الملابس (${garments.length})` : `Garments (${garments.length})`}
          </Typography>
          <List disablePadding dense>
            {garments.map((g, i) => (
              <ListItem key={g.id} disablePadding sx={{ py: 0.5 }}>
                <ListItemText
                  primary={`${i + 1}. ${g.garment_type}`}
                  secondary={ar ? g.service_name_ar : g.service_name_en}
                  slotProps={{ primary: { variant: 'body2', fontWeight: 500 } }}
                />
                <Typography variant="body2" fontWeight={600}>
                  KD {g.unit_price.toFixed(3)}
                </Typography>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {ar ? 'المجموع الفرعي' : 'Subtotal'}
            </Typography>
            <Typography variant="body2">KD {subtotal.toFixed(3)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {ar ? 'الضريبة (0%)' : 'Tax (0%)'}
            </Typography>
            <Typography variant="body2">KD 0.000</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography fontWeight={700}>{ar ? 'الإجمالي' : 'Total'}</Typography>
            <Typography fontWeight={700} color="primary.main">KD {subtotal.toFixed(3)}</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Payment method */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {ar ? 'طريقة الدفع' : 'Payment method'}
          </Typography>
          <ToggleButtonGroup
            value={paymentMethod}
            exclusive
            onChange={(_, v) => { if (v) setPaymentMethod(v); }}
            fullWidth
          >
            <ToggleButton value="cash">
              <PaymentsIcon sx={{ mr: 1 }} />
              {ar ? 'نقداً' : 'Cash'}
            </ToggleButton>
            <ToggleButton value="knet">
              <AccountBalanceIcon sx={{ mr: 1 }} />
              KNET
            </ToggleButton>
            <ToggleButton value="card">
              <CreditCardIcon sx={{ mr: 1 }} />
              {ar ? 'بطاقة' : 'Card'}
            </ToggleButton>
          </ToggleButtonGroup>
          {paymentMethod !== 'cash' && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {ar
                ? 'سيتم توجيهك إلى صفحة الدفع الآمنة من Tap Payments.'
                : 'You will be redirected to Tap Payments secure checkout.'}
            </Typography>
          )}
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={onBack} disabled={isPending}>
          {ar ? 'رجوع' : 'Back'}
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleConfirm}
          loading={isPending}
          sx={{ flex: 1 }}
        >
          {paymentMethod === 'cash'
            ? (ar ? 'تأكيد الطلب وتحصيل المبلغ' : 'Confirm & collect cash')
            : (ar ? 'الدفع عبر Tap' : 'Pay via Tap')}
        </Button>
      </Box>
    </Box>
  );
}
