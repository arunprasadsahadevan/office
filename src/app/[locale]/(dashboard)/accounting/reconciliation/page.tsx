import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getSessionUser } from '@/lib/auth';
import { listReconciliations } from '@/actions/accounting';
import { listBranches } from '@/actions/branches';
import ReconciliationFormWrapper from './ReconciliationFormWrapper';

export const metadata: Metadata = { title: 'Cash Reconciliation' };

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ReconciliationPage({ params }: Props) {
  const { locale } = await params;
  const [user, reconciliations, branches] = await Promise.all([
    getSessionUser(),
    listReconciliations(),
    listBranches(),
  ]);

  if (!user?.tenant) return null;

  return (
    <Box>
      <Button href={`/${locale}/accounting`} startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Accounting
      </Button>

      <Typography variant="h4" fontWeight={700} gutterBottom>
        Cash Reconciliation
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={600}>New Reconciliation</Typography>} />
            <CardContent>
              <ReconciliationFormWrapper branches={branches} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={600}>History</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                      <TableCell>Date</TableCell>
                      <TableCell>Branch</TableCell>
                      <TableCell>Shift</TableCell>
                      <TableCell align="right">Expected</TableCell>
                      <TableCell align="right">Counted</TableCell>
                      <TableCell align="right">Variance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reconciliations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No reconciliations yet
                        </TableCell>
                      </TableRow>
                    )}
                    {reconciliations.map((r) => {
                      const variance = Number(r.variance);
                      return (
                        <TableRow key={r.id} hover>
                          <TableCell>
                            {new Date(r.reconciliation_date).toLocaleDateString('en-KW', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            {(r as unknown as { branch?: { name: string } }).branch?.name ?? '—'}
                          </TableCell>
                          <TableCell>
                            <Chip label={r.shift} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">KD {Number(r.expected_cash).toFixed(3)}</TableCell>
                          <TableCell align="right">KD {Number(r.counted_cash).toFixed(3)}</TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color={
                                Math.abs(variance) < 0.001
                                  ? 'success.main'
                                  : variance > 0
                                  ? 'info.main'
                                  : 'error.main'
                              }
                            >
                              {variance >= 0 ? '+' : ''}{variance.toFixed(3)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
