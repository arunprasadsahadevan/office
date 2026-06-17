'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import AddIcon from '@mui/icons-material/Add';
import InventoryTable from '@/components/inventory/InventoryTable';
import AddItemDialog from '@/components/inventory/AddItemDialog';
import type { InventoryItem, Branch } from '@/types';
import { useRouter } from 'next/navigation';

interface Props {
  items: (InventoryItem & { branch: { id: string; name: string } | null })[];
  branches: Branch[];
}

export default function InventoryClientPage({ items, branches }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [branchFilter, setBranchFilter] = useState('');

  const filtered = branchFilter
    ? items.filter((i) => i.branch_id === branchFilter)
    : items;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        {branches.length > 1 && (
          <TextField
            select
            label="Filter by branch"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All branches</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </TextField>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
        >
          Add Item
        </Button>
      </Stack>

      <InventoryTable items={filtered} onRefresh={() => router.refresh()} />

      <AddItemDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          router.refresh();
        }}
        branches={branches}
      />
    </Box>
  );
}
