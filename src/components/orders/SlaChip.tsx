'use client';

import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

interface Props {
  promisedAt: string | null;
  status: string;
}

export default function SlaChip({ promisedAt, status }: Props) {
  if (!promisedAt || status === 'completed' || status === 'cancelled') {
    return null;
  }

  const now = Date.now();
  const deadline = new Date(promisedAt).getTime();
  const diff = deadline - now;
  const hoursLeft = diff / (1000 * 60 * 60);

  if (diff < 0) {
    const overdueHrs = Math.abs(Math.floor(hoursLeft));
    return (
      <Tooltip title={`Overdue by ${overdueHrs}h`}>
        <Chip
          icon={<ErrorIcon />}
          label={`${overdueHrs}h overdue`}
          size="small"
          color="error"
        />
      </Tooltip>
    );
  }

  if (hoursLeft < 2) {
    const minsLeft = Math.floor(diff / 60000);
    return (
      <Tooltip title="Due very soon">
        <Chip
          icon={<WarningIcon />}
          label={`${minsLeft}m left`}
          size="small"
          color="warning"
        />
      </Tooltip>
    );
  }

  if (hoursLeft < 6) {
    return (
      <Tooltip title="Due soon">
        <Chip
          icon={<WarningIcon />}
          label={`${Math.floor(hoursLeft)}h left`}
          size="small"
          color="warning"
          variant="outlined"
        />
      </Tooltip>
    );
  }

  return (
    <Tooltip title={new Date(promisedAt).toLocaleString()}>
      <Chip
        icon={<CheckCircleIcon />}
        label={`${Math.floor(hoursLeft)}h`}
        size="small"
        color="success"
        variant="outlined"
      />
    </Tooltip>
  );
}
