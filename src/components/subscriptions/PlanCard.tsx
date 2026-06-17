import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import type { CustomerSubscriptionPlan } from '@/types';

interface Props {
  plan: CustomerSubscriptionPlan;
  currency?: string;
  locale?: string;
  actions?: React.ReactNode;
}

export default function PlanCard({ plan, currency = 'KWD', locale = 'en', actions }: Props) {
  const name = locale === 'ar' ? plan.name_ar : plan.name_en;
  const cycleLabel = { monthly: 'month', quarterly: '3 months', annual: 'year' }[plan.billing_cycle];

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
          <Typography variant="subtitle1" fontWeight={700}>{name}</Typography>
          <Chip label={plan.billing_cycle} size="small" variant="outlined" />
        </Stack>
        <Typography variant="h5" fontWeight={800} color="primary.main">
          {currency} {Number(plan.price).toFixed(3)}
          <Typography component="span" variant="body2" color="text.secondary" fontWeight={400}>
            /{cycleLabel}
          </Typography>
        </Typography>
        <Divider sx={{ my: 1.5 }} />
        <Stack spacing={0.5}>
          {plan.included_kg != null && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Included kg</Typography>
              <Typography variant="body2" fontWeight={600}>{plan.included_kg} kg</Typography>
            </Box>
          )}
          {plan.included_items != null && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Included items</Typography>
              <Typography variant="body2" fontWeight={600}>{plan.included_items} pcs</Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
      {actions && <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>{actions}</CardActions>}
    </Card>
  );
}
