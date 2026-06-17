import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import type { BranchPnl } from '@/types';

interface Props {
  data: BranchPnl;
  currency?: string;
}

function fmt(n: number, currency = 'KWD') {
  return `${currency} ${n.toFixed(3)}`;
}

export default function PnLCard({ data, currency = 'KWD' }: Props) {
  const isProfit = data.gross_profit >= 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {data.branch_name}
        </Typography>
        <Divider sx={{ mb: 1.5 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Revenue</Typography>
          <Typography variant="body2" fontWeight={600} color="success.main">
            {fmt(data.revenue, currency)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2" color="text.secondary">Expenses</Typography>
          <Typography variant="body2" fontWeight={600} color="error.main">
            {fmt(data.expenses, currency)}
          </Typography>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight={700}>Gross Profit</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {isProfit
              ? <TrendingUpIcon fontSize="small" color="success" />
              : <TrendingDownIcon fontSize="small" color="error" />}
            <Typography
              variant="body2"
              fontWeight={700}
              color={isProfit ? 'success.main' : 'error.main'}
            >
              {fmt(data.gross_profit, currency)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
