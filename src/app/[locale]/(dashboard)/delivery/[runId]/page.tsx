import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getSessionUser } from '@/lib/auth';
import { getDeliveryRun } from '@/actions/delivery';
import DeliveryRunDetailClient from './DeliveryRunDetailClient';

interface Props {
  params: Promise<{ runId: string; locale: string }>;
}

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'error'> = {
  planned: 'default',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'error',
};

export default async function DeliveryRunPage({ params }: Props) {
  const { runId, locale } = await params;
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const run = await getDeliveryRun(runId);
  if (!run) notFound();

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

  const branch = run.branch as { name: string } | null;
  const driver = run.driver as { full_name: string | null } | null;
  const stops = (run.delivery_stops ?? []) as Stop[];

  return (
    <Box>
      <Button href={`/${locale}/delivery`} startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Delivery
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Delivery Run — {new Date(run.run_date).toLocaleDateString('en-KW', {
              weekday: 'long', day: '2-digit', month: 'long',
            })}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {branch?.name ?? '—'} &nbsp;·&nbsp; Driver: {driver?.full_name ?? 'Unassigned'}
          </Typography>
        </Box>
        <Chip
          label={run.status.replace('_', ' ')}
          color={STATUS_COLOR[run.status] ?? 'default'}
          size="medium"
        />
      </Stack>

      <Card>
        <CardHeader title={<Typography variant="h6" fontWeight={600}>Stops ({stops.length})</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <DeliveryRunDetailClient
            runId={runId}
            runStatus={run.status as string}
            initialStops={stops}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
