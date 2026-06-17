import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { getSessionUser } from '@/lib/auth';
import TenantSettingsForm from '@/components/settings/TenantSettingsForm';

export const metadata: Metadata = { title: 'Tenant Profile' };

export default async function TenantProfilePage() {
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const tenant = user.tenant as typeof user.tenant & { tax_rate?: number };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Tenant Profile
      </Typography>

      <Card sx={{ maxWidth: 600 }}>
        <CardHeader title={<Typography variant="h6" fontWeight={600}>Organisation Settings</Typography>} />
        <CardContent>
          <TenantSettingsForm
            initialValues={{
              name: tenant.name,
              default_locale: tenant.default_locale,
              base_currency: tenant.base_currency,
              brand_primary_color: tenant.brand_primary_color ?? '',
              logo_url: tenant.logo_url ?? '',
              tax_rate: tenant.tax_rate ?? 0,
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
