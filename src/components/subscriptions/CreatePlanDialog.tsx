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
import { createSubscriptionPlan } from '@/actions/subscriptions';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function CreatePlanDialog({ open, onClose, onSaved }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createSubscriptionPlan(fd);
      if (result.error) {
        setError(result.error);
      } else {
        onSaved();
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create Subscription Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction="row" spacing={2}>
              <TextField name="name_en" label="Plan name (EN)" required size="small" fullWidth />
              <TextField name="name_ar" label="اسم الخطة (AR)" required size="small" fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                name="price"
                label="Price (KD)"
                type="number"
                required
                inputProps={{ min: 0.001, step: 0.001 }}
                size="small"
                fullWidth
              />
              <TextField name="billing_cycle" label="Billing cycle" select defaultValue="monthly" size="small" fullWidth>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="annual">Annual</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                name="included_kg"
                label="Included kg (optional)"
                type="number"
                inputProps={{ min: 0, step: 0.5 }}
                size="small"
                fullWidth
              />
              <TextField
                name="included_items"
                label="Included items (optional)"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                size="small"
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" variant="contained" loading={pending}>Create Plan</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
