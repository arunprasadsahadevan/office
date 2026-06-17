'use client';

import { useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import DeliveryStopList from '@/components/delivery/DeliveryStopList';
import { updateRunStatus } from '@/actions/delivery';
import { useRouter } from 'next/navigation';
import type { DeliveryRun } from '@/types';

type Stop = {
  id: string;
  sequence: number;
  stop_type: string;
  status: string;
  address: string | null;
  driver_note: string | null;
  completed_at: string | null;
  order: {
    id: string;
    order_number: string;
    customer: { full_name: string; phone: string } | null;
  } | null;
};

interface Props {
  runId: string;
  runStatus: string;
  initialStops: Stop[];
}

export default function DeliveryRunDetailClient({ runId, runStatus, initialStops }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeRunStatus(status: DeliveryRun['status']) {
    startTransition(async () => {
      const result = await updateRunStatus(runId, status);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {runStatus === 'planned' && (
          <Button
            variant="contained"
            color="info"
            onClick={() => changeRunStatus('in_progress')}
            loading={pending}
          >
            Start Run
          </Button>
        )}
        {runStatus === 'in_progress' && (
          <Button
            variant="contained"
            color="success"
            onClick={() => changeRunStatus('completed')}
            loading={pending}
          >
            Complete Run
          </Button>
        )}
        {(runStatus === 'planned' || runStatus === 'in_progress') && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => changeRunStatus('cancelled')}
            loading={pending}
          >
            Cancel
          </Button>
        )}
      </Stack>

      <DeliveryStopList
        stops={initialStops}
        runStatus={runStatus}
        onRefresh={() => router.refresh()}
      />
    </Box>
  );
}
