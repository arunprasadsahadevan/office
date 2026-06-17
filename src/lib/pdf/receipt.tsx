/**
 * Bilingual 80mm thermal receipt using @react-pdf/renderer.
 * Renders EN labels on the left and AR labels on the right for each row,
 * mirroring the "bilingual receipt" convention common in Kuwait.
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image as PdfImage,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';

// 80mm thermal paper in points: 1mm ≈ 2.835pt → 80mm ≈ 226.8pt
const PAGE_WIDTH = 226;

const styles = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#111',
    backgroundColor: '#fff',
  },
  center: { textAlign: 'center', marginBottom: 2 },
  bold: { fontFamily: 'Helvetica-Bold' },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#aaa', marginVertical: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  qrBlock: { alignItems: 'center', marginTop: 6 },
  small: { fontSize: 6, color: '#666' },
});

interface ReceiptItem {
  qr_code: string;
  garment_type: string;
  service_name_en: string;
  service_name_ar: string;
  unit_price: number;
}

interface ReceiptData {
  orderNumber: string;
  orderDate: string;
  promisedAt: string | null;
  tenantName: string;
  tenantPhone?: string | null;
  customerName: string;
  customerPhone: string;
  cashierName: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  currency: string;
}

function fmt(amount: number, currency: string): string {
  // KWD: 3 decimal places
  const decimals = currency === 'KWD' ? 3 : 2;
  return `${currency} ${amount.toFixed(decimals)}`;
}

export async function buildReceiptPdf(data: ReceiptData): Promise<Buffer> {
  // Pre-generate QR code images as base64 data URIs
  const qrImages = await Promise.all(
    data.items.map((item) =>
      QRCode.toDataURL(item.qr_code, { width: 60, margin: 1 }).catch(() => ''),
    ),
  );

  const { renderToBuffer } = await import('@react-pdf/renderer');

  const doc = (
    <Document>
      <Page size={[PAGE_WIDTH, 842]} style={styles.page}>
        {/* Header */}
        <Text style={[styles.center, styles.bold, { fontSize: 9 }]}>
          {data.tenantName}
        </Text>
        {data.tenantPhone && (
          <Text style={[styles.center, styles.small]}>{data.tenantPhone}</Text>
        )}
        <Text style={[styles.center, styles.small, { marginBottom: 4 }]}>
          LaundryOS
        </Text>

        <View style={styles.divider} />

        {/* Order info */}
        <View style={styles.row}>
          <Text style={styles.bold}>{data.orderNumber}</Text>
          <Text>{data.orderDate}</Text>
        </View>
        <View style={styles.row}>
          <Text>Customer / العميل</Text>
          <Text>{data.customerName}</Text>
        </View>
        <View style={styles.row}>
          <Text>Phone / هاتف</Text>
          <Text>{data.customerPhone}</Text>
        </View>
        {data.promisedAt && (
          <View style={styles.row}>
            <Text>Ready / الاستلام</Text>
            <Text>{data.promisedAt}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Items */}
        <View style={[styles.row, { marginBottom: 3 }]}>
          <Text style={styles.bold}>Item / قطعة</Text>
          <Text style={styles.bold}>Price / سعر</Text>
        </View>

        {data.items.map((item, i) => (
          <View key={item.qr_code} style={{ marginBottom: 5 }}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text>{item.garment_type}</Text>
                <Text style={styles.small}>
                  {item.service_name_en} / {item.service_name_ar}
                </Text>
                <Text style={styles.small}>{item.qr_code}</Text>
              </View>
              <Text style={{ marginTop: 1 }}>{fmt(item.unit_price, data.currency)}</Text>
            </View>
            {/* QR tag image (small) */}
            {qrImages[i] && (
              <View style={{ alignItems: 'flex-start' }}>
                <PdfImage src={qrImages[i]} style={{ width: 36, height: 36 }} />
              </View>
            )}
          </View>
        ))}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.row}>
          <Text>Subtotal / المجموع</Text>
          <Text>{fmt(data.subtotal, data.currency)}</Text>
        </View>
        {data.taxAmount > 0 && (
          <View style={styles.row}>
            <Text>Tax / ضريبة</Text>
            <Text>{fmt(data.taxAmount, data.currency)}</Text>
          </View>
        )}
        <View style={[styles.row, { marginTop: 2 }]}>
          <Text style={styles.bold}>TOTAL / الإجمالي</Text>
          <Text style={styles.bold}>{fmt(data.total, data.currency)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Payment / الدفع</Text>
          <Text>{data.paymentMethod}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={[styles.center, styles.small, { marginTop: 4 }]}>
          Thank you! / شكراً لكم
        </Text>
        <Text style={[styles.center, styles.small]}>
          Cashier: {data.cashierName}
        </Text>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
