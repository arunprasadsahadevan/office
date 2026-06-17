'use client';

import { useState, useTransition } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { toggleService } from '@/actions/services';
import EditServiceDialog from './EditServiceDialog';
import type { Service } from '@/types';

const CATEGORY_LABEL: Record<string, string> = {
  wash_fold: 'Wash & Fold',
  dry_clean: 'Dry Clean',
  iron_only: 'Iron Only',
  special_care: 'Special Care',
};

interface Props {
  services: Service[];
}

export default function ServiceTable({ services: initialServices }: Props) {
  const [services, setServices] = useState(initialServices);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleToggle(service: Service) {
    const newActive = !service.is_active;
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_active: newActive } : s)),
    );
    startTransition(async () => {
      const res = await toggleService(service.id, newActive);
      if (res.error) {
        // Revert optimistic update on error
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, is_active: !newActive } : s)),
        );
      }
    });
  }

  function handleUpdated(updated: Service) {
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setEditTarget(null);
  }

  function handleAdded(added: Service) {
    setServices((prev) => [...prev, added]);
    setAddOpen(false);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => setAddOpen(true)}
        >
          Add Service
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700 } }}>
              <TableCell>Service (EN)</TableCell>
              <TableCell>Arabic</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Price (KWD)</TableCell>
              <TableCell>Turnaround</TableCell>
              <TableCell>Active</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {services.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No services yet
                </TableCell>
              </TableRow>
            )}
            {services.map((svc) => (
              <TableRow key={svc.id} hover sx={{ opacity: svc.is_active ? 1 : 0.5 }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{svc.name_en}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" dir="rtl">{svc.name_ar}</Typography>
                </TableCell>
                <TableCell>
                  <Chip label={CATEGORY_LABEL[svc.category] ?? svc.category} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {Number(svc.base_price).toFixed(3)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {svc.turnaround_hours}h
                  </Typography>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={svc.is_active}
                    onChange={() => handleToggle(svc)}
                    size="small"
                    color="success"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => setEditTarget(svc)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit dialog */}
      {editTarget && (
        <EditServiceDialog
          open
          service={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleUpdated}
        />
      )}

      {/* Add dialog */}
      <EditServiceDialog
        open={addOpen}
        service={null}
        onClose={() => setAddOpen(false)}
        onSaved={handleAdded}
      />
    </Box>
  );
}
