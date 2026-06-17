'use client';

import { useEffect, useTransition, useState } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { createCashReconciliation, getExpectedCash } from '@/actions/accounting';
import type { Branch } from '@/types';

interface Props {
  branches: Branch[];
  onSaved: () => void;
}

export default function ReconciliationForm({ branches, onSaved }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState<'day' | 'night'>('day');
  const [counted, setCounted] = useState('');
  const [expected, setExpected] = useState<number | null>(null);
  const [loadingExpected, setLoadingExpected] = useState(false);

  useEffect(() => {
    if (!branchId || !date) return;
    setLoadingExpected(true);
    getExpectedCash(branchId, date)
      .then(setExpected)
      .finally(() => setLoadingExpected(false));
  }, [branchId, date]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCashReconciliation({
        branch_id: branchId,
        reconciliation_date: date,
        shift,
        counted_cash: parseFloat(counted),
        note: undefined,
      });
      if (result.error) {
        setError(result.error);
      } else {
        onSaved();
        setCounted('');
      }
    });
  }

  const variance = expected != null && counted ? parseFloat(counted) - expected : null;

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction="row" spacing={2}>
          <TextField
            label="Branch"
            select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            size="small"
            fullWidth
            required
          >
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            required
          />
          <TextField
            label="Shift"
            select
            value={shift}
            onChange={(e) => setShift(e.target.value as 'day' | 'night')}
            size="small"
            fullWidth
          >
            <MenuItem value="day">Day</MenuItem>
            <MenuItem value="night">Night</MenuItem>
          </TextField>
        </Stack>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            System expected cash:
          </Typography>
          {loadingExpected ? (
            <CircularProgress size={14} />
          ) : (
            <Typography variant="body2" fontWeight={600}>
              {expected != null ? `KD ${expected.toFixed(3)}` : '—'}
            </Typography>
          )}
        </Box>
        <TextField
          label="Counted cash (KD)"
          type="number"
          value={counted}
          onChange={(e) => setCounted(e.target.value)}
          inputProps={{ min: 0, step: 0.001 }}
          size="small"
          required
        />
        {variance != null && (
          <Alert severity={Math.abs(variance) < 0.001 ? 'success' : variance > 0 ? 'info' : 'warning'}>
            Variance: KD {variance.toFixed(3)} {variance > 0 ? '(overage)' : variance < 0 ? '(shortage)' : '(balanced)'}
          </Alert>
        )}
        <Button type="submit" variant="contained" loading={pending}>
          Submit Reconciliation
        </Button>
      </Stack>
    </form>
  );
}
