'use client';

import { useTransition, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { enrollCustomer } from '@/actions/subscriptions';
import type { CustomerSubscriptionPlan, Customer } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onEnrolled: () => void;
  plans: CustomerSubscriptionPlan[];
  customers: Customer[];
  preselectedCustomerId?: string;
}

export default function EnrollDialog({
  open,
  onClose,
  onEnrolled,
  plans,
  customers,
  preselectedCustomerId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await enrollCustomer({
        customer_id: fd.get('customer_id') as string,
        plan_id: fd.get('plan_id') as string,
        payment_method: fd.get('payment_method') as 'tokenized_card' | 'knet_manual_renewal',
      });
      if (result.error) {
        setError(result.error);
      } else {
        onEnrolled();
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Enroll Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              name="customer_id"
              label="Customer"
              select
              required
              size="small"
              fullWidth
              defaultValue={preselectedCustomerId ?? ''}
            >
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.full_name} — {c.phone}
                </MenuItem>
              ))}
            </TextField>
            <TextField name="plan_id" label="Plan" select required size="small" fullWidth defaultValue="">
              <MenuItem value="" disabled>— Select plan —</MenuItem>
              {plans.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name_en} — KD {Number(p.price).toFixed(3)}/{p.billing_cycle}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              name="payment_method"
              label="Payment method"
              select
              required
              size="small"
              fullWidth
              defaultValue="knet_manual_renewal"
            >
              <MenuItem value="knet_manual_renewal">KNET (manual renewal)</MenuItem>
              <MenuItem value="tokenized_card">Card (auto-renew)</MenuItem>
            </TextField>
            <Typography variant="caption" color="text.secondary">
              KNET subscriptions generate a WhatsApp payment link at renewal time.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" variant="contained" loading={pending}>Enroll</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
