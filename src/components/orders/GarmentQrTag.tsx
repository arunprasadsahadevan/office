'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import QRCode from 'react-qr-code';

interface Props {
  qrCode: string;
  garmentType: string;
  orderNumber: string;
  serviceName: string;
}

export default function GarmentQrTag({ qrCode, garmentType, orderNumber, serviceName }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        width: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <QRCode value={qrCode} size={72} />
      <Typography variant="caption" fontWeight={700} align="center" sx={{ fontSize: 9, lineHeight: 1.2 }}>
        {garmentType}
      </Typography>
      <Typography variant="caption" align="center" sx={{ fontSize: 8, color: 'text.secondary' }}>
        {serviceName}
      </Typography>
      <Typography
        variant="caption"
        align="center"
        sx={{ fontSize: 7, color: 'text.secondary', fontFamily: 'monospace' }}
      >
        {qrCode}
      </Typography>
      <Typography
        variant="caption"
        align="center"
        sx={{ fontSize: 7, color: 'text.secondary', fontFamily: 'monospace' }}
      >
        {orderNumber}
      </Typography>
    </Paper>
  );
}
