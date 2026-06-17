import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
import { listInventoryItems, getInventoryTransactions } from '@/actions/inventory';

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

const TXN_COLORS: Record<string, 'success' | 'error' | 'default' | 'warning'> = {
  restock: 'success',
  usage: 'error',
  adjustment: 'default',
  waste: 'warning',
};

export default async function InventoryItemPage({ params }: Props) {
  const { id, locale } = await params;
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const [allItems, transactions] = await Promise.all([
    listInventoryItems(),
    getInventoryTransactions(id),
  ]);

  const item = allItems.find((i) => i.id === id);
  if (!item) notFound();

  return (
    <Box>
      <Button
        href={`/${locale}/inventory`}
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Back to Inventory
      </Button>

      <Typography variant="h5" fontWeight={700} gutterBottom>
        {item.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Branch: {item.branch?.name ?? 'All'} &nbsp;·&nbsp;
        Unit: {item.unit} &nbsp;·&nbsp;
        Current qty: <strong>{Number(item.current_qty).toFixed(2)}</strong> &nbsp;·&nbsp;
        Reorder at: {Number(item.reorder_threshold).toFixed(2)}
      </Typography>

      <Card>
        <CardHeader title={<Typography variant="h6" fontWeight={600}>Transaction History</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Delta</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No transactions yet
                    </TableCell>
                  </TableRow>
                )}
                {transactions.map((txn) => (
                  <TableRow key={txn.id} hover>
                    <TableCell>
                      {new Date(txn.created_at).toLocaleDateString('en-KW', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={txn.txn_type}
                        size="small"
                        color={TXN_COLORS[txn.txn_type] ?? 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={Number(txn.qty_delta) >= 0 ? 'success.main' : 'error.main'}
                      >
                        {Number(txn.qty_delta) >= 0 ? '+' : ''}{Number(txn.qty_delta).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {txn.note ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {(txn as unknown as { actor?: { full_name?: string } }).actor?.full_name ?? '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
