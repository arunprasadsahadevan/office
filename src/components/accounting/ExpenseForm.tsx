'use client';

import { useTransition, useState } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { createExpense } from '@/actions/accounting';
import type { Branch, ChartOfAccount } from '@/types';

interface Props {
  branches: Branch[];
  accounts: ChartOfAccount[];
  onSaved: () => void;
}

export default function ExpenseForm({ branches, accounts, onSaved }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const expenseAccounts = accounts.filter((a) => a.account_type === 'expense');
  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createExpense(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
        onSaved();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">Expense recorded</Alert>}
        <TextField
          name="description"
          label="Description"
          required
          size="small"
          fullWidth
        />
        <Stack direction="row" spacing={2}>
          <TextField
            name="amount"
            label="Amount (KD)"
            type="number"
            required
            inputProps={{ min: 0.001, step: 0.001 }}
            size="small"
            fullWidth
          />
          <TextField
            name="expense_date"
            label="Date"
            type="date"
            defaultValue={today}
            required
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            name="account_id"
            label="Account"
            select
            defaultValue=""
            size="small"
            fullWidth
          >
            <MenuItem value="">— Select account —</MenuItem>
            {expenseAccounts.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.code} {a.name_en}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            name="branch_id"
            label="Branch"
            select
            defaultValue=""
            size="small"
            fullWidth
          >
            <MenuItem value="">All / unassigned</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
        </Stack>
        <Button type="submit" variant="contained" loading={pending}>
          Record Expense
        </Button>
      </Stack>
    </form>
  );
}
