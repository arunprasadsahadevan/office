'use client';

import { useState, useTransition } from 'react';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import LockIcon from '@mui/icons-material/Lock';
import { initiatePlatformUpgrade } from '@/actions/payment';

interface Props {
  planId: string;
  planName: string;
  priceKwd: number;
  tenantId: string;
  locale: string;
}

export default function UpgradePayButton({ planId, planName, priceKwd, locale }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    setError(null);
    startTransition(async () => {
      const res = await initiatePlatformUpgrade({ planId, locale });
      if (res.error) {
        setError(res.error);
      } else if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      }
    });
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={isPending ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
        onClick={handlePay}
        disabled={isPending}
      >
        {isPending ? 'Redirecting to payment…' : `Pay KWD ${priceKwd.toFixed(3)} / month`}
      </Button>
    </>
  );
}
