import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Alert from '@mui/material/Alert';
import { getSessionUser } from '@/lib/auth';
import { listApiKeys } from '@/actions/apiKeys';
import ApiKeysClient from '@/components/settings/ApiKeysClient';

export const metadata: Metadata = { title: 'API Keys' };

export default async function ApiKeysPage() {
  const [user, keys] = await Promise.all([getSessionUser(), listApiKeys()]);
  if (!user?.tenant) return null;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        API Keys
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        API keys grant full read access to your tenant data. Keep them secret. Each key is shown
        only once at creation — store it securely immediately.
      </Alert>

      <Card>
        <CardHeader title={<Typography variant="h6" fontWeight={600}>Active Keys</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <ApiKeysClient keys={keys} />
        </CardContent>
      </Card>
    </Box>
  );
}
