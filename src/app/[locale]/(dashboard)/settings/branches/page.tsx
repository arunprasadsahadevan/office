import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import { getSessionUser } from '@/lib/auth';
import { listBranches } from '@/actions/branches';
import AddBranchWrapper from './AddBranchWrapper';

export const metadata: Metadata = { title: 'Branches' };

export default async function BranchesSettingsPage() {
  const [user, branches] = await Promise.all([getSessionUser(), listBranches()]);
  if (!user?.tenant) return null;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Branches
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardHeader title={<Typography variant="h6" fontWeight={600}>All Branches</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                  <TableCell>Name</TableCell>
                  <TableCell>Area</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {branches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      No branches yet
                    </TableCell>
                  </TableRow>
                )}
                {branches.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{b.name}</Typography>
                    </TableCell>
                    <TableCell>{b.area ?? '—'}</TableCell>
                    <TableCell>{b.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={b.is_active ? 'Active' : 'Inactive'}
                        color={b.is_active ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(b.created_at).toLocaleDateString('en-KW', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={<Typography variant="h6" fontWeight={600}>Add Branch</Typography>} />
        <CardContent>
          <AddBranchWrapper />
        </CardContent>
      </Card>
    </Box>
  );
}
