'use client';

import { useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import {
  createGarmentCategory,
  createGarmentItem,
  deleteGarmentCategory,
  deleteGarmentItem,
  seedGarmentCatalog,
} from '@/actions/items';
import type { GarmentCategory, GarmentItem, Service } from '@/types';

interface Props {
  initialCategories: GarmentCategory[];
  initialItems: GarmentItem[];
  services: Service[];
}

export default function ItemsSettingsClient({ initialCategories, initialItems, services }: Props) {
  const [tab, setTab] = useState(0);
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [catName_en, setCatName_en] = useState('');
  const [catName_ar, setCatName_ar] = useState('');
  const [catIcon, setCatIcon] = useState('');

  // Item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [itemCategoryId, setItemCategoryId] = useState('');
  const [itemName_en, setItemName_en] = useState('');
  const [itemName_ar, setItemName_ar] = useState('');
  const [itemServiceId, setItemServiceId] = useState('');
  const [itemSubEligible, setItemSubEligible] = useState(true);

  function notify(msg: string, isError = false) {
    if (isError) { setError(msg); setSuccess(null); }
    else { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  }

  function handleSeedCatalog() {
    startTransition(async () => {
      const res = await seedGarmentCatalog();
      if (res.error) { notify(res.error, true); return; }
      notify('Default catalog seeded successfully! Reload to see changes.');
    });
  }

  function handleAddCategory() {
    if (!catName_en) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('name_en', catName_en);
      fd.set('name_ar', catName_ar || catName_en);
      fd.set('icon', catIcon);
      const res = await createGarmentCategory(fd);
      if (res.error) { notify(res.error, true); return; }
      notify('Category added.');
      setCatDialog(false);
      setCatName_en(''); setCatName_ar(''); setCatIcon('');
      window.location.reload();
    });
  }

  function handleDeleteCategory(id: string) {
    startTransition(async () => {
      const res = await deleteGarmentCategory(id);
      if (res.error) { notify(res.error, true); return; }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      notify('Category removed.');
    });
  }

  function handleAddItem() {
    if (!itemName_en || !itemCategoryId) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('category_id', itemCategoryId);
      fd.set('name_en', itemName_en);
      fd.set('name_ar', itemName_ar || itemName_en);
      fd.set('default_service_id', itemServiceId);
      fd.set('is_subscription_eligible', String(itemSubEligible));
      const res = await createGarmentItem(fd);
      if (res.error) { notify(res.error, true); return; }
      notify('Item added.');
      setItemDialog(false);
      setItemName_en(''); setItemName_ar(''); setItemServiceId(''); setItemCategoryId('');
      setItemSubEligible(true);
      window.location.reload();
    });
  }

  function handleDeleteItem(id: string) {
    startTransition(async () => {
      const res = await deleteGarmentItem(id);
      if (res.error) { notify(res.error, true); return; }
      setItems((prev) => prev.filter((i) => i.id !== id));
      notify('Item removed.');
    });
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {categories.length === 0 && items.length === 0 && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button
              size="small"
              startIcon={<AutoFixHighIcon />}
              onClick={handleSeedCatalog}
              disabled={isPending}
            >
              Seed Default Catalog
            </Button>
          }
        >
          No items yet. Seed the default catalog (Traditional, Formal, Casual, Ladies, Household, Accessories) or add your own.
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={`Categories (${categories.length})`} />
        <Tab label={`Items (${items.length})`} />
      </Tabs>

      {/* ── Categories tab ── */}
      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCatDialog(true)}
            >
              Add Category
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Icon</TableCell>
                <TableCell>Name (EN)</TableCell>
                <TableCell>Name (AR)</TableCell>
                <TableCell>Items</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id} hover>
                  <TableCell sx={{ fontSize: 20 }}>{cat.icon ?? '—'}</TableCell>
                  <TableCell>{cat.name_en}</TableCell>
                  <TableCell>{cat.name_ar}</TableCell>
                  <TableCell>
                    <Chip
                      label={items.filter((i) => i.category_id === cat.id).length}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDeleteCategory(cat.id)}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    No categories yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}

      {/* ── Items tab ── */}
      {tab === 1 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setItemDialog(true)}
              disabled={categories.length === 0}
            >
              Add Item
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Name (EN)</TableCell>
                <TableCell>Name (AR)</TableCell>
                <TableCell>Default Service</TableCell>
                <TableCell>Bundle?</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const cat = categories.find((c) => c.id === item.category_id);
                const svc = services.find((s) => s.id === item.default_service_id);
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{cat?.icon}</span>
                        <Typography variant="body2">{cat?.name_en ?? '—'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{item.name_en}</TableCell>
                    <TableCell>{item.name_ar}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {svc ? svc.name_en : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={item.is_subscription_eligible ? 'Yes' : 'No'}
                        color={item.is_subscription_eligible ? 'success' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteItem(item.id)}
                        disabled={isPending}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    No items yet. Add categories first, then add items.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}

      {/* Category dialog */}
      <Dialog open={catDialog} onClose={() => setCatDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Name (English)"
            value={catName_en}
            onChange={(e) => setCatName_en(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Name (Arabic)"
            value={catName_ar}
            onChange={(e) => setCatName_ar(e.target.value)}
            inputProps={{ dir: 'rtl' }}
          />
          <TextField
            label="Icon (emoji)"
            value={catIcon}
            onChange={(e) => setCatIcon(e.target.value)}
            placeholder="👕"
            inputProps={{ maxLength: 4 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddCategory} disabled={!catName_en || isPending}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialog} onClose={() => setItemDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Item</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            select
            label="Category"
            value={itemCategoryId}
            onChange={(e) => setItemCategoryId(e.target.value)}
            required
          >
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.icon} {c.name_en}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Name (English)"
            value={itemName_en}
            onChange={(e) => setItemName_en(e.target.value)}
            required
            autoFocus
          />
          <TextField
            label="Name (Arabic)"
            value={itemName_ar}
            onChange={(e) => setItemName_ar(e.target.value)}
            inputProps={{ dir: 'rtl' }}
          />
          <TextField
            select
            label="Default Service (optional)"
            value={itemServiceId}
            onChange={(e) => setItemServiceId(e.target.value)}
          >
            <MenuItem value="">— None —</MenuItem>
            {services.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name_en} — KD {Number(s.base_price).toFixed(3)}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={itemSubEligible}
                onChange={(e) => setItemSubEligible(e.target.checked)}
              />
            }
            label="Subscription-eligible (can use bundle/credit)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={!itemName_en || !itemCategoryId || isPending}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
