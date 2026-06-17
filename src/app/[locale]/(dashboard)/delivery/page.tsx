import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { getSessionUser } from '@/lib/auth';
import { listDeliveryRuns, listDrivers } from '@/actions/delivery';
import { listBranches } from '@/actions/branches';
import DeliveryRunCard from '@/components/delivery/DeliveryRunCard';
import DeliveryPageClient from './DeliveryPageClient';

export const metadata: Metadata = { title: 'Delivery' };

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function DeliveryPage({ params }: Props) {
  const { locale } = await params;
  const [user, runs, branches, drivers] = await Promise.all([
    getSessionUser(),
    listDeliveryRuns(),
    listBranches(),
    listDrivers(),
  ]);

  if (!user?.tenant) return null;

  const today = new Date().toISOString().slice(0, 10);
  const todayRuns = runs.filter((r) => r.run_date === today);
  const pastRuns = runs.filter((r) => r.run_date < today);

  return (
    <Box>
      <DeliveryPageClient branches={branches} drivers={drivers} locale={locale} />

      {todayRuns.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Today</Typography>
          <Grid container spacing={2}>
            {todayRuns.map((run) => (
              <Grid item xs={12} sm={6} md={4} key={run.id}>
                <DeliveryRunCard run={run} href={`/${locale}/delivery/${run.id}`} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {runs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <Typography variant="body1">No delivery runs yet. Create your first run above.</Typography>
        </Box>
      )}

      {pastRuns.length > 0 && (
        <Box>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>Past Runs</Typography>
          <Grid container spacing={2}>
            {pastRuns.map((run) => (
              <Grid item xs={12} sm={6} md={4} key={run.id}>
                <DeliveryRunCard run={run} href={`/${locale}/delivery/${run.id}`} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
