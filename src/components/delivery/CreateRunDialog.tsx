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
import { createDeliveryRun } from '@/actions/delivery';
import type { Branch } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (runId: string) => void;
  branches: Branch[];
  drivers: Array<{ id: string; full_name: string | null }>;
}

export default function CreateRunDialog({ open, onClose, onCreated, branches, drivers }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createDeliveryRun({
        branch_id: fd.get('branch_id') as string,
        driver_id: (fd.get('driver_id') as string) || undefined,
        run_date: fd.get('run_date') as string,
        notes: (fd.get('notes') as string) || undefined,
      });
      if (result.error) {
        setError(result.error);
      } else if (result.runId) {
        onCreated(result.runId);
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create Delivery Run</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField name="branch_id" label="Branch" select required size="small" fullWidth defaultValue={branches[0]?.id ?? ''}>
              {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
            </TextField>
            <TextField name="driver_id" label="Driver (optional)" select size="small" fullWidth defaultValue="">
              <MenuItem value="">— Unassigned —</MenuItem>
              {drivers.map((d) => <MenuItem key={d.id} value={d.id}>{d.full_name ?? d.id}</MenuItem>)}
            </TextField>
            <TextField
              name="run_date"
              label="Date"
              type="date"
              defaultValue={today}
              required
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField name="notes" label="Notes" size="small" fullWidth multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" variant="contained" loading={pending}>Create</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
