'use client';

import { useState, useRef, useTransition } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { scanGarment } from '@/actions/orders';

const SCAN_STATUSES = [
  { value: 'sorting',  label: 'Sorting' },
  { value: 'washing',  label: 'Washing' },
  { value: 'drying',   label: 'Drying' },
  { value: 'ironing',  label: 'Ironing' },
  { value: 'qc',       label: 'QC Check' },
  { value: 'ready',    label: 'Ready' },
];

const STATUS_COLOR: Record<string, 'default' | 'primary' | 'success' | 'warning'> = {
  sorting: 'primary',
  washing: 'primary',
  drying: 'primary',
  ironing: 'primary',
  qc: 'warning',
  ready: 'success',
};

export default function QrScanInput() {
  const [qrCode, setQrCode] = useState('');
  const [newStatus, setNewStatus] = useState('sorting');
  const [result, setResult] = useState<{ garment_type: string | null; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!qrCode.trim()) return;
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await scanGarment(qrCode.trim().toUpperCase(), newStatus);
      if (res.error) {
        setError(res.error);
      } else if (res.item) {
        setResult({ garment_type: res.item.garment_type, status: res.item.status });
        setQrCode('');
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    });
  }

  return (
    <Box component="form" onSubmit={handleScan}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <QrCodeScannerIcon color="primary" />
        <Typography variant="body2" color="text.secondary">
          Scan a garment tag with a barcode scanner, or type the QR code manually.
        </Typography>
      </Box>

      <TextField
        inputRef={inputRef}
        label="QR / Barcode"
        value={qrCode}
        onChange={(e) => setQrCode(e.target.value)}
        placeholder="LOS-XXXXXXXXXXXX"
        fullWidth
        autoFocus
        inputProps={{ style: { fontFamily: 'monospace', letterSpacing: 2 } }}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Advance to Status"
        value={newStatus}
        onChange={(e) => setNewStatus(e.target.value)}
        select
        fullWidth
        sx={{ mb: 2 }}
      >
        {SCAN_STATUSES.map((s) => (
          <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
        ))}
      </TextField>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isPending || !qrCode.trim()}
      >
        {isPending ? 'Updating…' : 'Confirm Scan'}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      )}

      {result && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Alert severity="success" sx={{ mb: 1 }}>
            Status updated
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" fontWeight={600}>
              {result.garment_type ?? 'Garment'}
            </Typography>
            <Chip
              label={result.status.replace(/_/g, ' ')}
              color={STATUS_COLOR[result.status] ?? 'default'}
              size="small"
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
