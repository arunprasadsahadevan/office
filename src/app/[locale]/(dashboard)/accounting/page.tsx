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
import Button from '@mui/material/Button';
import { getSessionUser } from '@/lib/auth';
import { listExpenses, listChartOfAccounts } from '@/actions/accounting';
import { listBranches } from '@/actions/branches';
import ExpenseFormWrapper from './ExpenseFormWrapper';

export const metadata: Metadata = { title: 'Accounting' };

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AccountingPage({ params }: Props) {
  const { locale } = await params;
  const [user, expenses, accounts, branches] = await Promise.all([
    getSessionUser(),
    listExpenses(),
    listChartOfAccounts(),
    listBranches(),
  ]);

  if (!user?.tenant) return null;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Accounting
        </Typography>
        <Button variant="outlined" href={`/${locale}/accounting/reconciliation`}>
          Cash Reconciliation
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Record Expense */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={600}>Record Expense</Typography>} />
            <CardContent>
              <ExpenseFormWrapper branches={branches} accounts={accounts} />
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Expenses */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader title={<Typography variant="h6" fontWeight={600}>Recent Expenses</Typography>} />
            <CardContent sx={{ pt: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Account</TableCell>
                      <TableCell>Branch</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No expenses recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                    {expenses.slice(0, 20).map((exp) => (
                      <TableRow key={exp.id} hover>
                        <TableCell>
                          {new Date(exp.expense_date).toLocaleDateString('en-KW', {
                            day: '2-digit', month: 'short',
                          })}
                        </TableCell>
                        <TableCell>{exp.description}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {(exp as unknown as { account?: { code: string; name_en: string } }).account
                              ? `${(exp as unknown as { account: { code: string; name_en: string } }).account.code} ${(exp as unknown as { account: { code: string; name_en: string } }).account.name_en}`
                              : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {(exp as unknown as { branch?: { name: string } }).branch?.name ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={600} color="error.main">
                            KD {Number(exp.amount).toFixed(3)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
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
