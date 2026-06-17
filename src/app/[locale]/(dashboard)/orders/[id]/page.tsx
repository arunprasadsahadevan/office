import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { getOrder } from '@/actions/orders';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import OrderStatusStepper from '@/components/orders/OrderStatusStepper';
import SlaChip from '@/components/orders/SlaChip';
import GarmentQrTag from '@/components/orders/GarmentQrTag';
import type { OrderStatus } from '@/types';

export const metadata: Metadata = { title: 'Order Detail' };

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function OrderDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  const ar = locale === 'ar';
  const customer = order.customer as { full_name: string; phone: string; email: string | null } | null;
  const branch = order.branch as { name: string; area: string | null } | null;
  const items = (order.order_items ?? []) as Array<{
    id: string;
    qr_code: string | null;
    garment_type: string | null;
    service: { name_en: string; name_ar: string } | null;
    status: string;
    unit_price: string | number | null;
    special_instructions: string | null;
    pre_existing_condition: Record<string, unknown> | null;
  }>;
  const invoices = Array.isArray(order.invoices) ? order.invoices : [order.invoices].filter(Boolean);
  const invoice = invoices[0] as { id: string; total: string | number; status: string } | null;

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(ar ? 'ar-KW' : 'en-KW', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }) : '—';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button variant="text" startIcon={<ArrowBackIcon />} href={`/${locale}/orders`} size="small">
          {ar ? 'الطلبات' : 'Orders'}
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          {order.order_number}
        </Typography>
        <OrderStatusBadge status={order.status as OrderStatus} locale={locale} />
        <SlaChip promisedAt={order.promised_at} status={order.status} />
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          href={`/api/receipt/${order.id}`}
          target="_blank"
          size="small"
        >
          {ar ? 'طباعة الإيصال' : 'Print Receipt'}
        </Button>
      </Box>

      {/* Status stepper */}
      {order.status !== 'cancelled' && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <OrderStatusStepper
              orderId={order.id}
              currentStatus={order.status as OrderStatus}
            />
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Order info */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title={ar ? 'معلومات الطلب' : 'Order Info'} />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Row label={ar ? 'العميل' : 'Customer'} value={customer?.full_name ?? '—'} />
                <Row label={ar ? 'الهاتف' : 'Phone'} value={customer?.phone ?? '—'} />
                <Row label={ar ? 'الفرع' : 'Branch'} value={branch?.name ?? '—'} />
                <Row label={ar ? 'أُنشئ' : 'Created'} value={formatDate(order.created_at)} />
                <Row label={ar ? 'الموعد المحدد' : 'Promised by'} value={formatDate(order.promised_at)} />
                <Row
                  label={ar ? 'الدفع' : 'Invoice'}
                  value={
                    invoice ? (
                      <Chip
                        label={`KD ${Number(invoice.total).toFixed(3)} — ${invoice.status.toUpperCase()}`}
                        size="small"
                        color={invoice.status === 'paid' ? 'success' : 'warning'}
                      />
                    ) : '—'
                  }
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Garments */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title={ar ? `الملابس (${items.length})` : `Garments (${items.length})`} />
            <CardContent>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>{ar ? 'القطعة' : 'Item'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{ar ? 'الخدمة' : 'Service'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{ar ? 'الحالة' : 'Status'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{ar ? 'السعر' : 'Price'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>QR</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.garment_type ?? '—'}
                        </Typography>
                        {item.special_instructions && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {item.special_instructions}
                          </Typography>
                        )}
                        {item.pre_existing_condition && Object.entries(item.pre_existing_condition)
                          .filter(([k, v]) => v === true && k !== 'photo_urls')
                          .map(([k]) => (
                            <Chip key={k} label={k.replace('_', ' ')} size="small" color="warning" variant="outlined" sx={{ mr: 0.5, mt: 0.5, fontSize: 10 }} />
                          ))}
                      </TableCell>
                      <TableCell>
                        {ar ? item.service?.name_ar : item.service?.name_en ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Chip label={item.status} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {item.unit_price != null ? `KD ${Number(item.unit_price).toFixed(3)}` : '—'}
                      </TableCell>
                      <TableCell>
                        {item.qr_code && (
                          <GarmentQrTag
                            qrCode={item.qr_code}
                            garmentType={item.garment_type ?? ''}
                            orderNumber={order.order_number}
                            serviceName={ar ? (item.service?.name_ar ?? '') : (item.service?.name_en ?? '')}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      {typeof value === 'string' ? (
        <Typography variant="body2" fontWeight={500} align="right">{value}</Typography>
      ) : value}
    </Box>
  );
}
