import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import QrScanInput from '@/components/scan/QrScanInput';

export const metadata: Metadata = { title: 'QR Scan' };

export default function ScanPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        QR Scan
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Scan or enter a garment QR code to advance its status.
      </Typography>

      <Card sx={{ maxWidth: 480 }}>
        <CardHeader title={<Typography variant="h6" fontWeight={600}>Scan Garment</Typography>} />
        <CardContent>
          <QrScanInput />
        </CardContent>
      </Card>
    </Box>
  );
}
