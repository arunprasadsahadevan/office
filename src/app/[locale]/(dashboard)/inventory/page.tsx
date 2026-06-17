import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Alert from '@mui/material/Alert';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { getSessionUser } from '@/lib/auth';
import { listInventoryItems } from '@/actions/inventory';
import { listBranches } from '@/actions/branches';
import InventoryClientPage from './InventoryClientPage';

export const metadata: Metadata = { title: 'Inventory' };

export default async function InventoryPage() {
  const [user, items, branches] = await Promise.all([
    getSessionUser(),
    listInventoryItems(),
    listBranches(),
  ]);

  if (!user?.tenant) return null;

  const lowStock = items.filter((i) => i.current_qty <= i.reorder_threshold);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Inventory
      </Typography>

      {lowStock.length > 0 && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {lowStock.length} item{lowStock.length > 1 ? 's are' : ' is'} at or below reorder threshold:{' '}
          <strong>{lowStock.map((i) => i.name).join(', ')}</strong>
        </Alert>
      )}

      <Card>
        <CardHeader
          title={<Typography variant="h6" fontWeight={600}>Stock Levels</Typography>}
        />
        <CardContent sx={{ pt: 0 }}>
          <InventoryClientPage items={items} branches={branches} />
        </CardContent>
      </Card>
    </Box>
  );
}
