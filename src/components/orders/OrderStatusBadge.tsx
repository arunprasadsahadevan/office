import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';
import type { OrderStatus } from '@/types';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label_en: string; label_ar: string; color: ChipProps['color'] }
> = {
  received:         { label_en: 'Received',          label_ar: 'مستلم',          color: 'default' },
  sorting:          { label_en: 'Sorting',            label_ar: 'فرز',            color: 'default' },
  washing:          { label_en: 'Washing',            label_ar: 'غسيل',           color: 'info' },
  drying:           { label_en: 'Drying',             label_ar: 'تجفيف',          color: 'info' },
  ironing:          { label_en: 'Ironing',            label_ar: 'كوي',            color: 'info' },
  qc:               { label_en: 'QC',                 label_ar: 'مراقبة الجودة',  color: 'warning' },
  ready:            { label_en: 'Ready',              label_ar: 'جاهز',           color: 'success' },
  out_for_delivery: { label_en: 'Out for Delivery',   label_ar: 'في الطريق',      color: 'primary' },
  completed:        { label_en: 'Completed',          label_ar: 'مكتمل',          color: 'success' },
  cancelled:        { label_en: 'Cancelled',          label_ar: 'ملغى',           color: 'error' },
};

interface Props {
  status: OrderStatus;
  locale?: string;
}

export default function OrderStatusBadge({ status, locale = 'en' }: Props) {
  const cfg = STATUS_CONFIG[status] ?? { label_en: status, label_ar: status, color: 'default' };
  return (
    <Chip
      label={locale === 'ar' ? cfg.label_ar : cfg.label_en}
      color={cfg.color}
      size="small"
      sx={{ fontWeight: 600 }}
    />
  );
}
