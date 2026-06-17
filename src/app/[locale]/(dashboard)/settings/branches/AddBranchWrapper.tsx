'use client';

import { useTransition, useState } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { createBranch } from '@/actions/branches';
import { useRouter } from 'next/navigation';

export default function AddBranchWrapper() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createBranch(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2} maxWidth={480}>
        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">Branch created successfully</Alert>}
        <TextField name="name" label="Branch name" required size="small" />
        <TextField name="area" label="Area / location" size="small" />
        <TextField name="phone" label="Phone number" size="small" />
        <Button type="submit" variant="contained" loading={pending} sx={{ alignSelf: 'flex-start' }}>
          Create Branch
        </Button>
      </Stack>
    </form>
  );
}
