import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildReceiptPdf } from '@/lib/pdf/receipt';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const user = await getSessionUser();
  if (!user?.tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: order } = await supabase
    .from('orders')
    .select(
      `*, customer:customers(full_name,phone),
       branch:branches(name,phone),
       order_items(*, service:services(name_en,name_ar)),
       invoices(total,subtotal,tax_amount,status)`,
    )
    .eq('id', orderId)
    .eq('tenant_id', user.tenant.id)
    .single();

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const customer = order.customer as { full_name: string; phone: string } | null;
  const branch = order.branch as { name: string; phone: string | null } | null;
  const invoice = Array.isArray(order.invoices) ? order.invoices[0] : order.invoices;
  const items = (order.order_items ?? []) as Array<{
    qr_code: string;
    garment_type: string;
    unit_price: number;
    service: { name_en: string; name_ar: string } | null;
  }>;

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-KW', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  let paymentMethod = 'Cash';
  if (invoice?.status === 'paid') {
    const { data: payment } = await supabase
      .from('payments')
      .select('method')
      .eq('invoice_id', invoice.id as string)
      .limit(1)
      .single();
    if (payment) {
      const methodMap: Record<string, string> = {
        cash: 'Cash / نقداً',
        knet: 'KNET',
        visa_mc: 'Visa/Mastercard',
        wallet: 'Wallet',
        credit_account: 'Credit',
      };
      paymentMethod = methodMap[payment.method] ?? payment.method;
    }
  }

  try {
    const pdfBuffer = await buildReceiptPdf({
      orderNumber: order.order_number,
      orderDate: formatDate(order.created_at),
      promisedAt: order.promised_at ? formatDate(order.promised_at) : null,
      tenantName: user.tenant.name,
      tenantPhone: branch?.phone,
      customerName: customer?.full_name ?? '—',
      customerPhone: customer?.phone ?? '—',
      cashierName: user.profile.full_name ?? 'Staff',
      items: items.map((it) => ({
        qr_code: it.qr_code ?? '',
        garment_type: it.garment_type ?? '',
        service_name_en: it.service?.name_en ?? '',
        service_name_ar: it.service?.name_ar ?? '',
        unit_price: Number(it.unit_price ?? 0),
      })),
      subtotal: Number(invoice?.subtotal ?? 0),
      taxAmount: Number(invoice?.tax_amount ?? 0),
      total: Number(invoice?.total ?? 0),
      paymentMethod,
      currency: user.tenant.base_currency ?? 'KWD',
    });

    return new NextResponse(new Uint8Array(pdfBuffer as Buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${order.order_number}.pdf"`,
      },
    });
  } catch (err) {
    console.error('PDF generation error:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
