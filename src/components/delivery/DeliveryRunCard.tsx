import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import type { DeliveryRun } from '@/types';

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'error'> = {
  planned: 'default',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'error',
};

interface Props {
  run: DeliveryRun & {
    branch: { id: string; name: string } | null;
    driver: { id: string; full_name: string | null } | null;
    delivery_stops: Array<{ id: string; status: string }>;
  };
  href: string;
}

export default function DeliveryRunCard({ run, href }: Props) {
  const total = run.delivery_stops.length;
  const done = run.delivery_stops.filter((s) => s.status === 'completed').length;

  return (
    <Card variant="outlined">
      <CardActionArea component="a" href={href}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                {new Date(run.run_date).toLocaleDateString('en-KW', {
                  weekday: 'short', day: '2-digit', month: 'short',
                })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {run.branch?.name ?? '—'}
              </Typography>
            </Box>
            <Chip
              label={run.status.replace('_', ' ')}
              size="small"
              color={STATUS_COLOR[run.status] ?? 'default'}
            />
          </Stack>
          <Stack direction="row" spacing={2} sx={{ mt: 1.5 }} alignItems="center">
            <DirectionsCarIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {run.driver?.full_name ?? 'Unassigned'}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {done}/{total} stops
            </Typography>
          </Stack>
          {run.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {run.notes}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
