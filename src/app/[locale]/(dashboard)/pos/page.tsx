import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import { listServices } from '@/actions/services';
import { getDefaultBranch, createBranch } from '@/actions/branches';
import PosWizard from '@/components/pos/PosWizard';
import SetupBranchForm from '@/components/pos/SetupBranchForm';

export const metadata: Metadata = { title: 'Point of Sale' };

export default async function PosPage() {
  const branch = await getDefaultBranch();

  if (!branch) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Point of Sale
        </Typography>
        <Card sx={{ maxWidth: 480 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" gutterBottom>
              Set up your first branch
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Before you can create orders, you need at least one branch. This takes 30 seconds.
            </Typography>
            <SetupBranchForm />
          </CardContent>
        </Card>
      </Box>
    );
  }

  const services = await listServices();

  if (services.length === 0) {
    return (
      <Box>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Point of Sale
        </Typography>
        <Card sx={{ maxWidth: 480 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No services found. Please add services in Settings → Services before creating orders.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Point of Sale
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Branch: {branch.name}{branch.area ? ` — ${branch.area}` : ''}
      </Typography>

      <PosWizard services={services} branchId={branch.id} />
    </Box>
  );
}
