'use client';

import { useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import TuneIcon from '@mui/icons-material/Tune';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { InventoryItem } from '@/types';
import AdjustStockDialog from './AdjustStockDialog';

interface Props {
  items: (InventoryItem & { branch: { id: string; name: string } | null })[];
  onRefresh?: () => void;
}

export default function InventoryTable({ items, onRefresh }: Props) {
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
              <TableCell>Item</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Reorder At</TableCell>
              <TableCell align="right">Cost/Unit</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No inventory items yet
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => {
              const isLow = item.current_qty <= item.reorder_threshold;
              return (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {item.name}
                    </Typography>
                    {item.notes && (
                      <Typography variant="caption" color="text.secondary">
                        {item.notes}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {item.branch?.name ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color={isLow ? 'error.main' : 'inherit'}
                    >
                      {Number(item.current_qty).toFixed(2)} {item.unit}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {Number(item.reorder_threshold).toFixed(2)} {item.unit}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {item.cost_per_unit != null ? `KD ${Number(item.cost_per_unit).toFixed(3)}` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {isLow ? (
                      <Chip
                        icon={<WarningAmberIcon />}
                        label="Low Stock"
                        color="error"
                        size="small"
                        variant="outlined"
                      />
                    ) : (
                      <Chip label="OK" color="success" size="small" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Adjust stock">
                      <IconButton size="small" onClick={() => setAdjustItem(item)}>
                        <TuneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {adjustItem && (
        <AdjustStockDialog
          item={adjustItem}
          open
          onClose={() => setAdjustItem(null)}
          onSaved={() => {
            setAdjustItem(null);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
