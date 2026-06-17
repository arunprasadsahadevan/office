import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices';
import KeyIcon from '@mui/icons-material/Key';
import StoreIcon from '@mui/icons-material/Store';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { getSessionUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'Settings' };

interface SettingsLink {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
}

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  const user = await getSessionUser();
  if (!user?.tenant) return null;

  const links: SettingsLink[] = [
    {
      label: 'Tenant Profile',
      description: 'Name, logo, currency, locale, and brand colour',
      href: `/${locale}/settings/profile`,
      icon: <BusinessIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    },
    {
      label: 'Users & Staff',
      description: 'Invite team members and manage roles',
      href: `/${locale}/settings/users`,
      icon: <PeopleIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    },
    {
      label: 'Services & Pricing',
      description: 'Add, edit, and activate / deactivate services',
      href: `/${locale}/settings/services`,
      icon: <MiscellaneousServicesIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    },
    {
      label: 'API Keys',
      description: 'Manage REST API keys for integrations',
      href: `/${locale}/settings/api-keys`,
      icon: <KeyIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    },
    {
      label: 'Branches',
      description: 'Add and manage your branches',
      href: `/${locale}/settings/branches`,
      icon: <StoreIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    },
    {
      label: 'Billing & Plan',
      description: 'View your current plan and upgrade',
      href: `/${locale}/settings/billing`,
      icon: <CreditCardIcon sx={{ fontSize: 32, color: 'primary.main' }} />,
    },
  ];

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Configure {user.tenant.name}
      </Typography>

      <Grid container spacing={2}>
        {links.map((link) => (
          <Grid item xs={12} sm={6} md={4} key={link.href}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea component="a" href={link.href} sx={{ height: '100%', p: 0.5 }}>
                <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box sx={{ pt: 0.5 }}>{link.icon}</Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {link.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {link.description}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
