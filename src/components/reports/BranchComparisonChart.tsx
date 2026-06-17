'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { BranchPnl } from '@/types';

interface Props {
  data: BranchPnl[];
  currency?: string;
}

export default function BranchComparisonChart({ data, currency = 'KWD' }: Props) {
  if (!data.length) {
    return (
      <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">No branch data for the selected period</Typography>
      </Box>
    );
  }

  const chartData = data.map((b) => ({
    name: b.branch_name,
    Revenue: Number(b.revenue.toFixed(3)),
    Expenses: Number(b.expenses.toFixed(3)),
    'Gross Profit': Number(b.gross_profit.toFixed(3)),
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${currency} ${v}`}
        />
        <Tooltip
          formatter={(value) => `${currency} ${Number(value).toFixed(3)}`}
        />
        <Legend />
        <Bar dataKey="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Gross Profit" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
