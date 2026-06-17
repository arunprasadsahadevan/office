'use client';

import { useState, useTransition } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import { createService, updateService } from '@/actions/services';
import type { Service } from '@/types';

const CATEGORIES = [
  { value: 'wash_fold', label: 'Wash & Fold' },
  { value: 'dry_clean', label: 'Dry Clean' },
  { value: 'iron_only', label: 'Iron Only' },
  { value: 'special_care', label: 'Special Care' },
];

interface Props {
  open: boolean;
  service: Service | null;
  onClose: () => void;
  onSaved: (service: Service) => void;
}

export default function EditServiceDialog({ open, service, onClose, onSaved }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isEdit = !!service;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      if (isEdit) {
        const res = await updateService(service.id, formData);
        if (res.error) {
          setError(res.error);
        } else {
          onSaved({
            ...service,
            name_en: formData.get('name_en') as string,
            name_ar: formData.get('name_ar') as string,
            category: formData.get('category') as Service['category'],
            base_price: Number(formData.get('base_price')),
            turnaround_hours: Number(formData.get('turnaround_hours')),
          });
        }
      } else {
        const res = await createService(formData);
        if (res.error) {
          setError(res.error);
        } else {
          // For new service we don't have the id back — trigger page reload
          onClose();
          window.location.reload();
        }
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Service' : 'Add Service'}</DialogTitle>
      <DialogContent>
        <Grid
          container
          spacing={2}
          sx={{ mt: 0.5 }}
          component="form"
          id="service-form"
          onSubmit={handleSubmit}
        >
          <Grid item xs={12} sm={6}>
            <TextField
              name="name_en"
              label="Name (English)"
              defaultValue={service?.name_en ?? ''}
              fullWidth
              required
              autoFocus
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="name_ar"
              label="Name (Arabic)"
              defaultValue={service?.name_ar ?? ''}
              fullWidth
              required
              inputProps={{ dir: 'rtl' }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              name="category"
              label="Category"
              select
              defaultValue={service?.category ?? 'wash_fold'}
              fullWidth
              required
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              name="base_price"
              label="Price (KWD)"
              type="number"
              defaultValue={service ? Number(service.base_price) : ''}
              fullWidth
              required
              inputProps={{ min: 0, step: 0.001 }}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              name="turnaround_hours"
              label="Turnaround (h)"
              type="number"
              defaultValue={service?.turnaround_hours ?? 24}
              fullWidth
              required
              inputProps={{ min: 1, step: 1 }}
            />
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button type="submit" form="service-form" variant="contained" disabled={isPending}>
          {isPending ? 'Saving…' : isEdit ? 'Save' : 'Add Service'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
