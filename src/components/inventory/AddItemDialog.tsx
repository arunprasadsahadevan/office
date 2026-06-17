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
import { createInventoryItem } from '@/actions/inventory';
import type { Branch } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  branches: Branch[];
}

const UNITS = ['pcs', 'kg', 'litre', 'box', 'roll'] as const;

export default function AddItemDialog({ open, onClose, onSaved, branches }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createInventoryItem(formData);
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
        <DialogTitle>Add Inventory Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField name="name" label="Item name" required size="small" fullWidth />
            <TextField name="unit" label="Unit" select defaultValue="pcs" size="small" fullWidth>
              {UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </TextField>
            <TextField
              name="branch_id"
              label="Branch (optional)"
              select
              defaultValue=""
              size="small"
              fullWidth
            >
              <MenuItem value="">All branches</MenuItem>
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                name="current_qty"
                label="Opening qty"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                defaultValue="0"
                size="small"
                fullWidth
              />
              <TextField
                name="reorder_threshold"
                label="Reorder at"
                type="number"
                inputProps={{ min: 0, step: 0.01 }}
                defaultValue="0"
                size="small"
                fullWidth
              />
            </Stack>
            <TextField
              name="cost_per_unit"
              label="Cost per unit (KD)"
              type="number"
              inputProps={{ min: 0, step: 0.001 }}
              size="small"
              fullWidth
            />
            <TextField
              name="notes"
              label="Notes"
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" variant="contained" loading={pending}>Add Item</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
