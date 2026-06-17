import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import { getSessionUser } from '@/lib/auth';
import { listStaff } from '@/actions/settings';
import { listBranches } from '@/actions/branches';
import UserTable from '@/components/settings/UserTable';

export const metadata: Metadata = { title: 'Users & Staff' };

export default async function UsersPage() {
  const [user, staff, branches] = await Promise.all([
    getSessionUser(),
    listStaff(),
    listBranches(),
  ]);
  if (!user?.tenant) return null;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Users & Staff
      </Typography>

      <Card>
        <CardHeader title={<Typography variant="h6" fontWeight={600}>Team Members</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <UserTable
            staff={staff}
            branches={branches}
            currentUserId={user.id}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
