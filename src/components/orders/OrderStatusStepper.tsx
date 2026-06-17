'use client';

import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { updateOrderStatus } from '@/actions/orders';
import { notifyOrderReady } from '@/actions/notifications';
import type { OrderStatus } from '@/types';

const STATUSES: OrderStatus[] = [
  'received', 'sorting', 'washing', 'drying',
  'ironing', 'qc', 'ready', 'out_for_delivery', 'completed',
];

const STATUS_LABELS_EN: Record<OrderStatus, string> = {
  received: 'Received', sorting: 'Sorting', washing: 'Washing',
  drying: 'Drying', ironing: 'Ironing', qc: 'QC',
  ready: 'Ready', out_for_delivery: 'Out for Delivery',
  completed: 'Completed', cancelled: 'Cancelled',
};
const STATUS_LABELS_AR: Record<OrderStatus, string> = {
  received: 'مستلم', sorting: 'فرز', washing: 'غسيل',
  drying: 'تجفيف', ironing: 'كوي', qc: 'مراقبة الجودة',
  ready: 'جاهز', out_for_delivery: 'في الطريق',
  completed: 'مكتمل', cancelled: 'ملغى',
};

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
}

export default function OrderStatusStepper({ orderId, currentStatus }: Props) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const labels = ar ? STATUS_LABELS_AR : STATUS_LABELS_EN;

  const [status, setStatus] = useState<OrderStatus>(currentStatus);
  const [error, setError] = useState<string | null>(null);
  const [notified, setNotified] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentIndex = STATUSES.indexOf(status);
  const isFinal = status === 'completed' || status === 'cancelled';
  const nextStatus = !isFinal ? STATUSES[currentIndex + 1] : null;

  function advance() {
    if (!nextStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, nextStatus);
      if (result.error) { setError(result.error); return; }
      setStatus(nextStatus);
      // Auto-notify customer when order becomes ready
      if (nextStatus === 'ready') {
        await notifyOrderReady(orderId);
        setNotified(true);
      }
    });
  }

  return (
    <Box>
      <Stepper
        activeStep={currentIndex}
        alternativeLabel
        sx={{ mb: 3, overflowX: 'auto' }}
      >
        {STATUSES.map((s) => (
          <Step key={s} completed={STATUSES.indexOf(s) < currentIndex}>
            <StepLabel>
              <Box sx={{ fontSize: 11 }}>{labels[s]}</Box>
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notified && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {ar ? 'تم إرسال إشعار واتساب للعميل ✓' : 'WhatsApp notification sent to customer ✓'}
        </Alert>
      )}

      {!isFinal && nextStatus && (
        <Button
          variant="contained"
          onClick={advance}
          loading={isPending}
        >
          {ar
            ? `تقدّم إلى: ${labels[nextStatus]}`
            : `Advance to: ${labels[nextStatus]}`}
        </Button>
      )}
    </Box>
  );
}
