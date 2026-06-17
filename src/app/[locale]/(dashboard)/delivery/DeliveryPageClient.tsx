'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CreateRunDialog from '@/components/delivery/CreateRunDialog';
import { useRouter } from 'next/navigation';
import type { Branch } from '@/types';

interface Props {
  branches: Branch[];
  drivers: Array<{ id: string; full_name: string | null }>;
  locale: string;
}

export default function DeliveryPageClient({ branches, drivers, locale }: Props) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Typography variant="h4" fontWeight={700}>Delivery</Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setCreateOpen(true)}
      >
        New Run
      </Button>
      <CreateRunDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(runId) => {
          setCreateOpen(false);
          router.push(`/${locale}/delivery/${runId}`);
        }}
        branches={branches}
        drivers={drivers}
      />
    </Box>
  );
}
