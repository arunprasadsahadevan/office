'use client';

import { useState, useTransition } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import BranchComparisonChart from '@/components/reports/BranchComparisonChart';
import { getBranchComparisonReport, type BranchComparisonReport } from '@/actions/reports';

interface Props {
  initialReport: BranchComparisonReport;
  currency: string;
}

export default function ReportsClientPage({ initialReport, currency }: Props) {
  const now = new Date();
  const [from, setFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  );
  const [report, setReport] = useState(initialReport);
  const [pending, startTransition] = useTransition();

  function handleApply() {
    startTransition(async () => {
      const r = await getBranchComparisonReport(from, to);
      setReport(r);
    });
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ mb: 3 }} flexWrap="wrap">
        <TextField
          label="From"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label="To"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <Button variant="contained" onClick={handleApply} loading={pending}>
          Apply
        </Button>
      </Stack>

      <BranchComparisonChart data={report.branches} currency={currency} />

      <Divider sx={{ my: 3 }} />

      {/* Totals row */}
      <Stack direction="row" spacing={4} justifyContent="center">
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={700} color="success.main">
            {currency} {report.totals.revenue.toFixed(3)}
          </Typography>
          <Typography variant="caption" color="text.secondary">Total Revenue</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={700} color="error.main">
            {currency} {report.totals.expenses.toFixed(3)}
          </Typography>
          <Typography variant="caption" color="text.secondary">Total Expenses</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h6"
            fontWeight={700}
            color={report.totals.gross_profit >= 0 ? 'success.main' : 'error.main'}
          >
            {currency} {report.totals.gross_profit.toFixed(3)}
          </Typography>
          <Typography variant="caption" color="text.secondary">Gross Profit</Typography>
        </Box>
      </Stack>
    </Box>
  );
}
