'use client';

import { useState, useMemo } from 'react';
import { useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import type { Customer, GarmentCategory, GarmentItem, Service } from '@/types';
import type { GarmentDraft } from './PosWizard';

interface Props {
  customer: Customer;
  services: Service[];
  categories: GarmentCategory[];
  items: GarmentItem[];
  initial: GarmentDraft[];
  onConfirm: (garments: GarmentDraft[]) => void;
  onBack: () => void;
}

function newDraft(
  item: GarmentItem,
  category: GarmentCategory,
  svc: Service | null,
): GarmentDraft {
  return {
    id: crypto.randomUUID(),
    item_id: item.id,
    garment_type: item.name_en,
    category_name_en: category.name_en,
    service_id: svc?.id ?? '',
    service_name_en: svc?.name_en ?? '',
    service_name_ar: svc?.name_ar ?? '',
    unit_price: svc ? Number(svc.base_price) : 0,
    is_express: false,
    express_surcharge: 0,
    special_instructions: '',
    condition: { stain: false, tear: false, missing_button: false, faded: false, photo_urls: [] },
  };
}

export default function ItemStep({
  customer, services, categories, items, initial, onConfirm, onBack,
}: Props) {
  const locale = useLocale();
  const ar = locale === 'ar';

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [basket, setBasket] = useState<GarmentDraft[]>(initial.length ? initial : []);
  const [editingDraft, setEditingDraft] = useState<GarmentDraft | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  const filteredItems = useMemo(() => {
    if (!selectedCategoryId) return [];
    return items.filter((it) => it.category_id === selectedCategoryId);
  }, [items, selectedCategoryId]);

  function getDefaultService(item: GarmentItem): Service | null {
    if (item.default_service_id) {
      return services.find((s) => s.id === item.default_service_id) ?? null;
    }
    if (item.allowed_service_categories?.length) {
      return services.find((s) => item.allowed_service_categories!.includes(s.category)) ?? null;
    }
    return services[0] ?? null;
  }

  function allowedServices(item: GarmentItem): Service[] {
    if (!item.allowed_service_categories?.length) return services;
    return services.filter((s) => item.allowed_service_categories!.includes(s.category));
  }

  function addItem(item: GarmentItem) {
    if (!selectedCategory) return;
    const svc = getDefaultService(item);
    const draft = newDraft(item, selectedCategory, svc);
    setEditingDraft(draft);
    setDetailOpen(true);
  }

  function confirmDraft(draft: GarmentDraft) {
    setBasket((prev) => {
      const exists = prev.find((d) => d.id === draft.id);
      if (exists) return prev.map((d) => (d.id === draft.id ? draft : d));
      return [...prev, draft];
    });
    setDetailOpen(false);
    setEditingDraft(null);
  }

  function removeDraft(id: string) {
    setBasket((prev) => prev.filter((d) => d.id !== id));
  }

  function editDraft(draft: GarmentDraft) {
    setEditingDraft({ ...draft });
    setDetailOpen(true);
  }

  const expressCount = basket.filter((d) => d.is_express).length;
  const subtotal = basket.reduce((s, d) => s + d.unit_price + d.express_surcharge, 0);

  const isValid = basket.length > 0 && basket.every((d) => d.service_id);

  return (
    <Box sx={{ display: 'flex', gap: 2, minHeight: 600 }}>
      {/* LEFT: category + item grid */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Chip
          icon={<PersonIcon />}
          label={`${customer.full_name} — ${customer.phone}`}
          variant="outlined"
          sx={{ mb: 2 }}
        />

        {/* Category grid */}
        {!selectedCategoryId ? (
          <>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {ar ? 'اختر الفئة' : 'Select Category'}
            </Typography>
            <Grid container spacing={1.5}>
              {categories.map((cat) => (
                <Grid item xs={6} sm={4} md={3} key={cat.id}>
                  <Paper
                    elevation={0}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    sx={{
                      p: 2,
                      minHeight: 96,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0.5,
                      cursor: 'pointer',
                      border: '1.5px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      transition: 'all .15s',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
                      userSelect: 'none',
                    }}
                  >
                    <Typography fontSize={28} lineHeight={1}>{cat.icon ?? '🧺'}</Typography>
                    <Typography variant="body2" fontWeight={600} align="center" mt={0.5}>
                      {ar ? cat.name_ar : cat.name_en}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            {categories.length === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                {ar
                  ? 'لا توجد فئات بعد. أضف فئات من الإعدادات → العناصر.'
                  : 'No categories yet. Add categories in Settings → Items.'}
              </Alert>
            )}
          </>
        ) : (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <IconButton size="small" onClick={() => setSelectedCategoryId(null)}>
                <ArrowBackIcon />
              </IconButton>
              <Typography fontSize={20}>{selectedCategory?.icon}</Typography>
              <Typography variant="h6" fontWeight={600}>
                {ar ? selectedCategory?.name_ar : selectedCategory?.name_en}
              </Typography>
            </Box>

            <Grid container spacing={1.5}>
              {filteredItems.map((item) => (
                <Grid item xs={6} sm={4} md={3} key={item.id}>
                  <Paper
                    elevation={0}
                    onClick={() => addItem(item)}
                    sx={{
                      p: 1.5,
                      minHeight: 80,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      border: '1.5px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      transition: 'all .15s',
                      '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.50' },
                      userSelect: 'none',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} align="center">
                      {ar ? item.name_ar : item.name_en}
                    </Typography>
                    {!item.is_subscription_eligible && (
                      <Typography variant="caption" color="text.disabled">
                        {ar ? 'خارج الباقة' : 'Not in bundle'}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
              {filteredItems.length === 0 && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    {ar ? 'لا توجد عناصر في هذه الفئة.' : 'No items in this category yet.'}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </Box>

      {/* RIGHT: basket */}
      <Box
        sx={{
          width: { xs: '100%', md: 300 },
          flexShrink: 0,
          display: { xs: selectedCategoryId ? 'none' : 'block', md: 'block' },
        }}
      >
        <Paper
          elevation={0}
          sx={{ border: '1.5px solid', borderColor: 'divider', borderRadius: 2, p: 2, height: '100%' }}
        >
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            {ar ? `الطلب (${basket.length})` : `Order (${basket.length})`}
          </Typography>

          {basket.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {ar ? 'اضغط على عنصر لإضافته' : 'Tap an item to add it'}
            </Typography>
          ) : (
            <Stack spacing={1} sx={{ mb: 2 }}>
              {basket.map((d) => (
                <Box
                  key={d.id}
                  onClick={() => editDraft(d)}
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    cursor: 'pointer',
                    bgcolor: d.is_express ? 'warning.50' : 'grey.50',
                    border: '1px solid',
                    borderColor: d.is_express ? 'warning.300' : 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    '&:hover': { opacity: 0.85 },
                  }}
                >
                  {d.is_express && (
                    <FlashOnIcon sx={{ fontSize: 16, color: 'warning.main', flexShrink: 0 }} />
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {d.garment_type}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {ar ? d.service_name_ar : d.service_name_en}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {(d.unit_price + d.express_surcharge).toFixed(3)}
                    </Typography>
                    {d.is_express && (
                      <Typography variant="caption" color="warning.dark">
                        ⚡ Express
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); removeDraft(d.id); }}
                    sx={{ color: 'error.main', p: 0.5 }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
          )}

          {basket.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              {expressCount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="warning.dark">
                    ⚡ {expressCount} {ar ? 'عاجل' : 'express'}
                  </Typography>
                  <Typography variant="caption" color="warning.dark">
                    +{basket
                      .filter((d) => d.is_express)
                      .reduce((s, d) => s + d.express_surcharge, 0)
                      .toFixed(3)} KD
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {ar ? 'الإجمالي' : 'Total'}
                </Typography>
                <Typography variant="subtitle2" fontWeight={700}>
                  KD {subtotal.toFixed(3)}
                </Typography>
              </Box>
            </>
          )}

          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={!isValid}
            onClick={() => onConfirm(basket)}
            sx={{ mt: 2 }}
          >
            {ar ? 'التالي: المراجعة' : 'Next: Review'}
          </Button>
          <Button variant="text" fullWidth onClick={onBack} sx={{ mt: 1 }}>
            {ar ? 'رجوع' : 'Back'}
          </Button>
        </Paper>
      </Box>

      {/* Item detail drawer */}
      {editingDraft && (
        <ItemDetailDrawer
          draft={editingDraft}
          services={services}
          items={items}
          ar={ar}
          onConfirm={confirmDraft}
          onClose={() => { setDetailOpen(false); setEditingDraft(null); }}
          open={detailOpen}
        />
      )}
    </Box>
  );
}

// ── Item detail drawer (qty, service, normal/express, conditions) ──────────────

interface DetailProps {
  draft: GarmentDraft;
  services: Service[];
  items: GarmentItem[];
  ar: boolean;
  open: boolean;
  onConfirm: (d: GarmentDraft) => void;
  onClose: () => void;
}

function ItemDetailDrawer({ draft: initial, services, items, ar, open, onConfirm, onClose }: DetailProps) {
  const [draft, setDraft] = useState<GarmentDraft>(initial);
  const [qty, setQty] = useState(1);

  const item = items.find((i) => i.id === initial.item_id);
  const svcOptions = item
    ? (item.allowed_service_categories?.length
        ? services.filter((s) => item.allowed_service_categories!.includes(s.category))
        : services)
    : services;

  function handleServiceChange(serviceId: string) {
    const svc = svcOptions.find((s) => s.id === serviceId);
    if (!svc) return;
    setDraft((d) => ({
      ...d,
      service_id: svc.id,
      service_name_en: svc.name_en,
      service_name_ar: svc.name_ar,
      unit_price: d.is_express && svc.express_price
        ? Number(svc.express_price)
        : Number(svc.base_price),
      express_surcharge: d.is_express && svc.express_price
        ? Number(svc.express_price) - Number(svc.base_price)
        : 0,
    }));
  }

  function handleExpressToggle(express: boolean) {
    const svc = svcOptions.find((s) => s.id === draft.service_id);
    const basePrice = svc ? Number(svc.base_price) : draft.unit_price;
    const expressPrice = svc?.express_price ? Number(svc.express_price) : basePrice * 1.5;
    setDraft((d) => ({
      ...d,
      is_express: express,
      unit_price: express ? expressPrice : basePrice,
      express_surcharge: express ? expressPrice - basePrice : 0,
    }));
  }

  function handleAdd() {
    const drafts = Array.from({ length: qty }, (_, i) =>
      i === 0 ? draft : { ...draft, id: crypto.randomUUID() },
    );
    drafts.forEach((d) => onConfirm(d));
  }

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { borderRadius: '16px 16px 0 0', p: 3, maxHeight: '85vh', overflow: 'auto' } }}
    >
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {ar ? initial.garment_type : initial.garment_type}
      </Typography>

      {/* Quantity */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {ar ? 'الكمية' : 'Quantity'}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1}
          sx={{ width: 48, height: 48, border: '1.5px solid', borderColor: 'divider' }}
        >
          <RemoveIcon />
        </IconButton>
        <Typography variant="h4" fontWeight={700} sx={{ minWidth: 48, textAlign: 'center' }}>
          {qty}
        </Typography>
        <IconButton
          onClick={() => setQty((q) => Math.min(99, q + 1))}
          sx={{ width: 48, height: 48, border: '1.5px solid', borderColor: 'divider' }}
        >
          <AddIcon />
        </IconButton>
      </Box>

      {/* Normal / Express toggle */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {ar ? 'نوع الخدمة' : 'Service Speed'}
      </Typography>
      <ToggleButtonGroup
        exclusive
        value={draft.is_express ? 'express' : 'normal'}
        onChange={(_, v) => { if (v) handleExpressToggle(v === 'express'); }}
        sx={{ mb: 3, width: '100%' }}
      >
        <ToggleButton
          value="normal"
          sx={{
            flex: 1,
            py: 1.5,
            fontSize: 15,
            fontWeight: 600,
            '&.Mui-selected': { bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } },
          }}
        >
          {ar ? 'عادي' : 'Normal'}
        </ToggleButton>
        <ToggleButton
          value="express"
          sx={{
            flex: 1,
            py: 1.5,
            fontSize: 15,
            fontWeight: 600,
            '&.Mui-selected': {
              bgcolor: 'warning.main',
              color: 'white',
              '&:hover': { bgcolor: 'warning.dark' },
            },
          }}
        >
          ⚡ {ar ? 'عاجل' : 'Express'}
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Service */}
      <TextField
        select
        label={ar ? 'الخدمة' : 'Service'}
        value={draft.service_id}
        onChange={(e) => handleServiceChange(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
        required
      >
        {svcOptions.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {ar ? s.name_ar : s.name_en}
            {' — '}
            {draft.is_express && s.express_price
              ? `KD ${Number(s.express_price).toFixed(3)} (express)`
              : `KD ${Number(s.base_price).toFixed(3)}`}
          </MenuItem>
        ))}
      </TextField>

      {/* Special instructions */}
      <TextField
        label={ar ? 'تعليمات خاصة' : 'Special instructions'}
        value={draft.special_instructions}
        onChange={(e) => setDraft((d) => ({ ...d, special_instructions: e.target.value }))}
        fullWidth
        multiline
        rows={2}
        sx={{ mb: 3 }}
      />

      {/* Condition flags */}
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {ar ? 'حالة القطعة' : 'Pre-existing condition'}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {(['stain', 'tear', 'missing_button', 'faded'] as const).map((cond) => {
          const labels: Record<string, [string, string]> = {
            stain: ['Stain', 'بقعة'],
            tear: ['Tear', 'تمزق'],
            missing_button: ['Missing button', 'زر مفقود'],
            faded: ['Faded', 'باهت'],
          };
          const active = draft.condition[cond];
          return (
            <Chip
              key={cond}
              label={ar ? labels[cond][1] : labels[cond][0]}
              color={active ? 'warning' : 'default'}
              variant={active ? 'filled' : 'outlined'}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  condition: { ...d.condition, [cond]: !d.condition[cond] },
                }))
              }
              sx={{ cursor: 'pointer', fontWeight: active ? 700 : 400 }}
            />
          );
        })}
      </Box>

      {/* Price summary */}
      <Box
        sx={{
          p: 2,
          bgcolor: draft.is_express ? 'warning.50' : 'grey.50',
          borderRadius: 2,
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            {qty} × KD {draft.unit_price.toFixed(3)}
          </Typography>
          {draft.is_express && (
            <Typography variant="caption" color="warning.dark">
              ⚡ +KD {draft.express_surcharge.toFixed(3)} express surcharge each
            </Typography>
          )}
        </Box>
        <Typography variant="h6" fontWeight={700} color={draft.is_express ? 'warning.dark' : 'text.primary'}>
          KD {(qty * (draft.unit_price + draft.express_surcharge)).toFixed(3)}
        </Typography>
      </Box>

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={!draft.service_id}
        onClick={handleAdd}
        sx={{ mb: 1 }}
      >
        {ar ? `إضافة ${qty} قطعة` : `Add ${qty} item${qty > 1 ? 's' : ''}`}
      </Button>
      <Button variant="text" fullWidth onClick={onClose}>
        {ar ? 'إلغاء' : 'Cancel'}
      </Button>
    </Drawer>
  );
}
