import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import { listCustomers } from '@/actions/customers';

export const metadata: Metadata = { title: 'Customers' };

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function CustomersPage({ params }: Props) {
  const { locale } = await params;
  const ar = locale === 'ar';
  const { data: customers, count } = await listCustomers();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {ar ? 'العملاء' : 'Customers'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ar ? `${count} عميل` : `${count} total`}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} href={`/${locale}/pos`}>
          {ar ? 'إضافة عميل' : 'Add via POS'}
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{ar ? 'العميل' : 'Customer'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{ar ? 'الهاتف' : 'Phone'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{ar ? 'البريد الإلكتروني' : 'Email'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{ar ? 'النوع' : 'Type'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{ar ? 'تاريخ الانضمام' : 'Joined'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <PeopleIcon sx={{ fontSize: 40, opacity: 0.2, mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography variant="body2" color="text.secondary">
                      {ar ? 'لا يوجد عملاء بعد.' : 'No customers yet. Create your first order via POS.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', fontSize: 13 }}>
                          {c.full_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>{c.full_name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={c.customer_type === 'corporate'
                          ? (ar ? 'مؤسسي' : 'Corporate')
                          : (ar ? 'عادي' : 'Retail')}
                        size="small"
                        variant="outlined"
                        color={c.customer_type === 'corporate' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(c.created_at).toLocaleDateString(ar ? 'ar-KW' : 'en-KW', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
