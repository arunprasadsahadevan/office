import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { listAllServices } from '@/actions/services';
import ServiceTable from '@/components/services/ServiceTable';

export const metadata: Metadata = { title: 'Services & Pricing' };

export default async function ServicesSettingsPage() {
  const services = await listAllServices();

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Services & Pricing
      </Typography>

      <Card>
        <CardHeader title={<Typography variant="h6" fontWeight={600}>All Services</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <ServiceTable services={services} />
        </CardContent>
      </Card>
    </Box>
  );
}
