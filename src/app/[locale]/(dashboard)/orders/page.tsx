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
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { listOrders } from '@/actions/orders';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import SlaChip from '@/components/orders/SlaChip';
import type { OrderStatus } from '@/types';

export const metadata: Metadata = { title: 'Orders' };

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function OrdersPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { status, page: pageStr } = await searchParams;
  const page = pageStr ? parseInt(pageStr, 10) : 0;

  const { data: orders, count } = await listOrders(
    page,
    30,
    status as OrderStatus | undefined,
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-KW' : 'en-KW', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {locale === 'ar' ? 'الطلبات' : 'Orders'}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} href={`/${locale}/pos`}>
          {locale === 'ar' ? 'طلب جديد' : 'New Order'}
        </Button>
      </Box>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>
                  {locale === 'ar' ? 'رقم الطلب' : 'Order #'}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {locale === 'ar' ? 'العميل' : 'Customer'}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {locale === 'ar' ? 'الفرع' : 'Branch'}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {locale === 'ar' ? 'الحالة' : 'Status'}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SLA</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {locale === 'ar' ? 'الإجمالي' : 'Total'}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {locale === 'ar' ? 'التاريخ' : 'Date'}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <ReceiptLongIcon sx={{ fontSize: 40, opacity: 0.2, mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography variant="body2" color="text.secondary">
                      {locale === 'ar' ? 'لا توجد طلبات بعد.' : 'No orders yet.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order: any) => {
                  const invoice = Array.isArray(order.invoices) ? order.invoices[0] : null;
                  return (
                    <TableRow
                      key={order.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => window.location.href = `/${locale}/orders/${order.id}`}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {order.order_number}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {order.customer?.full_name ?? '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.customer?.phone}
                        </Typography>
                      </TableCell>
                      <TableCell>{order.branch?.name ?? '—'}</TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} locale={locale} />
                      </TableCell>
                      <TableCell>
                        <SlaChip promisedAt={order.promised_at} status={order.status} />
                      </TableCell>
                      <TableCell>
                        {invoice ? `KD ${Number(invoice.total).toFixed(3)}` : '—'}
                      </TableCell>
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
