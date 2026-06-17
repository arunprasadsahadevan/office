'use client';

import { useTransition, useState } from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { completeStop, updateStopStatus } from '@/actions/delivery';

interface Stop {
  id: string;
  sequence: number;
  stop_type: string;
  status: string;
  address: string | null;
  driver_note: string | null;
  completed_at: string | null;
  order: {
    id: string;
    order_number: string;
    customer: { full_name: string; phone: string } | null;
  } | null;
}

interface Props {
  stops: Stop[];
  runStatus: string;
  onRefresh: () => void;
}

const STOP_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'default',
  arrived: 'warning',
  completed: 'success',
  failed: 'error',
};

export default function DeliveryStopList({ stops, runStatus, onRefresh }: Props) {
  const [pending, startTransition] = useTransition();
  const [activeStop, setActiveStop] = useState<string | null>(null);
  const [eta, setEta] = useState('15');

  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const canAct = runStatus === 'in_progress';

  function handleComplete(stopId: string) {
    setActiveStop(stopId);
    startTransition(async () => {
      await completeStop(stopId, eta ? parseInt(eta) : undefined);
      setActiveStop(null);
      onRefresh();
    });
  }

  function handleArrive(stopId: string) {
    setActiveStop(stopId);
    startTransition(async () => {
      await updateStopStatus(stopId, 'arrived');
      setActiveStop(null);
      onRefresh();
    });
  }

  return (
    <List disablePadding>
      {sorted.map((stop, idx) => (
        <ListItem
          key={stop.id}
          divider={idx < sorted.length - 1}
          alignItems="flex-start"
          sx={{ py: 1.5, opacity: stop.status === 'completed' ? 0.6 : 1 }}
        >
          <Box sx={{ mr: 2, mt: 0.5, minWidth: 24, textAlign: 'center' }}>
            {stop.status === 'completed' ? (
              <CheckCircleIcon color="success" fontSize="small" />
            ) : (
              <Typography variant="body2" fontWeight={700} color="text.secondary">
                {stop.sequence}
              </Typography>
            )}
          </Box>
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={600}>
                  {stop.order?.customer?.full_name ?? '—'}
                </Typography>
                <Chip
                  label={stop.stop_type}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10 }}
                />
                <Chip
                  label={stop.status}
                  size="small"
                  color={STOP_COLOR[stop.status] ?? 'default'}
                />
              </Stack>
            }
            secondary={
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {stop.order?.order_number} &nbsp;·&nbsp; {stop.order?.customer?.phone}
                </Typography>
                {stop.address && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    📍 {stop.address}
                  </Typography>
                )}
              </Box>
            }
          />
          <ListItemSecondaryAction>
            {canAct && stop.status === 'pending' && (
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleArrive(stop.id)}
                loading={pending && activeStop === stop.id}
              >
                Arrived
              </Button>
            )}
            {canAct && stop.status === 'arrived' && (
              <Stack direction="row" spacing={1} alignItems="center">
                {stop.stop_type === 'dropoff' && (
                  <TextField
                    label="Next ETA (min)"
                    type="number"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                    size="small"
                    sx={{ width: 110 }}
                    inputProps={{ min: 1 }}
                  />
                )}
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() => handleComplete(stop.id)}
                  loading={pending && activeStop === stop.id}
                >
                  Complete
                </Button>
              </Stack>
            )}
          </ListItemSecondaryAction>
        </ListItem>
      ))}
      {sorted.length === 0 && (
        <ListItem>
          <ListItemText
            primary={
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No stops on this run yet
              </Typography>
            }
          />
        </ListItem>
      )}
    </List>
  );
}
