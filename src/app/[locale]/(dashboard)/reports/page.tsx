import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { getSessionUser } from '@/lib/auth';
import { getBranchComparisonReport } from '@/actions/reports';
import PnLCard from '@/components/accounting/PnLCard';
import ReportsClientPage from './ReportsClientPage';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  // Default: current month
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const report = await getBranchComparisonReport(from, to);
  const currency = user.tenant.base_currency ?? 'KWD';

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Reports
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Period: {from} – {to}
      </Typography>

      {/* Branch P&L cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {report.branches.map((b) => (
          <Grid item xs={12} sm={6} md={4} key={b.branch_id}>
            <PnLCard data={b} currency={currency} />
          </Grid>
        ))}
        {report.branches.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
              No branch data yet. Create a branch and record some orders and expenses to see the P&amp;L.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Interactive chart with date picker */}
      <Card>
        <CardHeader
          title={<Typography variant="h6" fontWeight={600}>Branch Comparison</Typography>}
        />
        <CardContent>
          <ReportsClientPage initialReport={report} currency={currency} />
        </CardContent>
      </Card>
    </Box>
  );
}
