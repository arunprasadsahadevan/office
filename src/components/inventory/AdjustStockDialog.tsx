'use client';

import { useTransition, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { adjustStock } from '@/actions/inventory';
import type { InventoryItem, InventoryTxnType } from '@/types';

interface Props {
  item: InventoryItem;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const TXN_TYPES: { value: InventoryTxnType; label: string; sign: '+' | '-' }[] = [
  { value: 'restock', label: 'Restock (add)', sign: '+' },
  { value: 'usage', label: 'Usage (consume)', sign: '-' },
  { value: 'adjustment', label: 'Manual adjustment', sign: '+' },
  { value: 'waste', label: 'Waste / damage', sign: '-' },
];

export default function AdjustStockDialog({ item, open, onClose, onSaved }: Props) {
  const [pending, startTransition] = useTransition();
  const [txnType, setTxnType] = useState<InventoryTxnType>('restock');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedType = TXN_TYPES.find((t) => t.value === txnType)!;

  function handleSubmit() {
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Enter a positive quantity');
      return;
    }

    const delta = selectedType.sign === '-' ? -qtyNum : qtyNum;

    startTransition(async () => {
      const result = await adjustStock({
        item_id: item.id,
        txn_type: txnType,
        qty_delta: delta,
        note: note || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        onSaved();
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Adjust Stock — {item.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current: <strong>{Number(item.current_qty).toFixed(2)} {item.unit}</strong>
        </Typography>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            select
            label="Transaction type"
            value={txnType}
            onChange={(e) => setTxnType(e.target.value as InventoryTxnType)}
            fullWidth
            size="small"
          >
            {TXN_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label={`Quantity (${item.unit})`}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            type="number"
            inputProps={{ min: 0, step: 0.01 }}
            size="small"
            fullWidth
          />
          <TextField
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            size="small"
            fullWidth
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={pending}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} loading={pending}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
