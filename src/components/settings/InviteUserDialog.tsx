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
import { inviteUser } from '@/actions/settings';
import type { Branch, UserRole } from '@/types';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'tenant_owner', label: 'Owner' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'driver', label: 'Driver' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
}

export default function InviteUserDialog({ open, onClose, branches }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const input = {
      email: fd.get('email') as string,
      full_name: fd.get('full_name') as string,
      role: fd.get('role') as Exclude<UserRole, 'super_admin'>,
      branch_id: (fd.get('branch_id') as string) || undefined,
    };
    startTransition(async () => {
      const res = await inviteUser(input);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      }
    });
  }

  function handleClose() {
    if (!isPending) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Invite Team Member</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }} component="form" id="invite-form" onSubmit={handleSubmit}>
          <Grid item xs={12}>
            <TextField name="email" label="Email" type="email" fullWidth required autoFocus />
          </Grid>
          <Grid item xs={12}>
            <TextField name="full_name" label="Full Name (optional)" fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField name="role" label="Role" select fullWidth defaultValue="cashier" required>
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField name="branch_id" label="Branch (optional)" select fullWidth defaultValue="">
              <MenuItem value="">All branches</MenuItem>
              {branches.map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </TextField>
          </Grid>

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
          {success && (
            <Grid item xs={12}>
              <Alert severity="success">Invitation sent!</Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>Cancel</Button>
        <Button type="submit" form="invite-form" variant="contained" disabled={isPending}>
          {isPending ? 'Sending…' : 'Send Invite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
