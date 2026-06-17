'use client';

import { useState, useTransition } from 'react';
import { useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { createBranch } from '@/actions/branches';

export default function SetupBranchForm() {
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createBranch(fd);
      if (result.error) { setError(result.error); return; }
      window.location.reload();
    });
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField label="Branch name" name="name" required fullWidth sx={{ mb: 2 }} disabled={isPending} />
      <TextField label="Area (e.g. Salmiya)" name="area" fullWidth sx={{ mb: 2 }} disabled={isPending} />
      <TextField label="Phone" name="phone" fullWidth sx={{ mb: 3 }} disabled={isPending} />
      <Button type="submit" variant="contained" fullWidth loading={isPending}>
        Create Branch & Continue
      </Button>
    </Box>
  );
}
