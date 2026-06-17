'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Collapse from '@mui/material/Collapse';
import Alert from '@mui/material/Alert';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PersonIcon from '@mui/icons-material/Person';
import type { Customer, Service } from '@/types';
import type { GarmentDraft } from './PosWizard';

const GARMENT_TYPES_EN = [
  'Shirt', 'T-Shirt', 'Trousers / Pants', 'Suit Jacket', 'Suit (2-pc)',
  'Abaya', 'Dishdasha', 'Dress', 'Skirt', 'Jeans', 'Jacket / Coat',
  'Blanket / Comforter', 'Curtain', 'Bedsheet', 'Towel', 'Other',
];
const GARMENT_TYPES_AR = [
  'قميص', 'تي شيرت', 'بنطلون', 'جاكيت بدلة', 'بدلة (قطعتان)',
  'عباءة', 'دشداشة', 'فستان', 'تنورة', 'جينز', 'جاكيت / معطف',
  'بطانية / لحاف', 'ستارة', 'ملاءة سرير', 'منشفة', 'أخرى',
];

function newGarment(): GarmentDraft {
  return {
    id: crypto.randomUUID(),
    garment_type: '',
    service_id: '',
    service_name_en: '',
    service_name_ar: '',
    unit_price: 0,
    special_instructions: '',
    condition: { stain: false, tear: false, missing_button: false, faded: false, photo_urls: [] },
    item_id: null,
    category_name_en: '',
    is_express: false,
    express_surcharge: 0,
  };
}

interface Props {
  customer: Customer;
  services: Service[];
  initial: GarmentDraft[];
  onConfirm: (garments: GarmentDraft[]) => void;
  onBack: () => void;
}

export default function GarmentStep({ customer, services, initial, onConfirm, onBack }: Props) {
  const locale = useLocale();
  const ar = locale === 'ar';
  const [garments, setGarments] = useState<GarmentDraft[]>(
    initial.length > 0 ? initial : [newGarment()],
  );
  const [expandedId, setExpandedId] = useState<string | null>(garments[0]?.id ?? null);

  const garmentTypes = ar ? GARMENT_TYPES_AR : GARMENT_TYPES_EN;

  function addGarment() {
    const g = newGarment();
    setGarments((prev) => [...prev, g]);
    setExpandedId(g.id);
  }

  function removeGarment(id: string) {
    setGarments((prev) => prev.filter((g) => g.id !== id));
  }

  function updateGarment(id: string, patch: Partial<GarmentDraft>) {
    setGarments((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    );
  }

  function handleServiceChange(id: string, serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    updateGarment(id, {
      service_id: serviceId,
      service_name_en: svc.name_en,
      service_name_ar: svc.name_ar,
      unit_price: Number(svc.base_price),
    });
  }

  function handleConditionChange(id: string, field: keyof GarmentDraft['condition'], value: boolean) {
    setGarments((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, condition: { ...g.condition, [field]: value } }
          : g,
      ),
    );
  }

  const isValid = garments.every((g) => g.garment_type && g.service_id);
  const total = garments.reduce((sum, g) => sum + g.unit_price, 0);

  function handleSubmit() {
    if (!isValid) return;
    onConfirm(garments);
  }

  return (
    <Box sx={{ maxWidth: 680 }}>
      {/* Customer summary */}
      <Chip
        icon={<PersonIcon />}
        label={`${customer.full_name} — ${customer.phone}`}
        variant="outlined"
        sx={{ mb: 3 }}
      />

      <Typography variant="h6" fontWeight={600} gutterBottom>
        {ar ? `الملابس (${garments.length})` : `Garments (${garments.length})`}
      </Typography>

      {garments.map((g, idx) => {
        const expanded = expandedId === g.id;
        const hasCondition = g.condition.stain || g.condition.tear || g.condition.missing_button || g.condition.faded;

        return (
          <Card key={g.id} variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ pb: '12px !important' }}>
              {/* Row header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: expanded ? 2 : 0 }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 24 }}>
                  #{idx + 1}
                </Typography>
                <Box sx={{ flex: 1, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {!expanded && g.garment_type && (
                    <Chip label={g.garment_type} size="small" />
                  )}
                  {!expanded && g.service_name_en && (
                    <Chip label={ar ? g.service_name_ar : g.service_name_en} size="small" variant="outlined" />
                  )}
                  {!expanded && g.unit_price > 0 && (
                    <Chip
                      label={`KD ${g.unit_price.toFixed(3)}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {hasCondition && !expanded && (
                    <Chip label={ar ? 'حالة مسجّلة' : 'Condition noted'} size="small" color="warning" />
                  )}
                </Box>
                <IconButton size="small" onClick={() => setExpandedId(expanded ? null : g.id)}>
                  {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
                {garments.length > 1 && (
                  <IconButton size="small" color="error" onClick={() => removeGarment(g.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Collapse in={expanded}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                  <TextField
                    select
                    label={ar ? 'نوع القطعة' : 'Garment type'}
                    value={g.garment_type}
                    onChange={(e) => updateGarment(g.id, { garment_type: e.target.value })}
                    sx={{ minWidth: 160 }}
                    required
                  >
                    {garmentTypes.map((t) => (
                      <MenuItem key={t} value={t}>{t}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label={ar ? 'الخدمة' : 'Service'}
                    value={g.service_id}
                    onChange={(e) => handleServiceChange(g.id, e.target.value)}
                    sx={{ minWidth: 200 }}
                    required
                  >
                    {services.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {ar ? s.name_ar : s.name_en} — KD {Number(s.base_price).toFixed(3)}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label={ar ? 'السعر' : 'Price (KD)'}
                    type="number"
                    inputProps={{ step: '0.001', min: '0' }}
                    value={g.unit_price}
                    onChange={(e) => updateGarment(g.id, { unit_price: Number(e.target.value) })}
                    sx={{ width: 130 }}
                  />
                </Box>

                <TextField
                  label={ar ? 'تعليمات خاصة' : 'Special instructions'}
                  value={g.special_instructions}
                  onChange={(e) => updateGarment(g.id, { special_instructions: e.target.value })}
                  fullWidth
                  multiline
                  rows={1}
                  placeholder={ar ? 'حساسية ألوان، بقعة خاصة…' : 'Color sensitivity, specific stain…'}
                  sx={{ mb: 2 }}
                />

                {/* Condition tags */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  {ar ? 'حالة القطعة عند الاستلام' : 'Pre-existing condition at intake'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(['stain', 'tear', 'missing_button', 'faded'] as const).map((cond) => {
                    const labels: Record<string, [string, string]> = {
                      stain: ['Stain', 'بقعة'],
                      tear: ['Tear', 'تمزق'],
                      missing_button: ['Missing button', 'زر مفقود'],
                      faded: ['Faded', 'باهت'],
                    };
                    return (
                      <FormControlLabel
                        key={cond}
                        control={
                          <Checkbox
                            size="small"
                            checked={g.condition[cond]}
                            onChange={(e) => handleConditionChange(g.id, cond, e.target.checked)}
                          />
                        }
                        label={ar ? labels[cond][1] : labels[cond][0]}
                        sx={{ '& .MuiFormControlLabel-label': { fontSize: 13 } }}
                      />
                    );
                  })}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        );
      })}

      <Button
        startIcon={<AddCircleIcon />}
        onClick={addGarment}
        variant="outlined"
        sx={{ mb: 3 }}
      >
        {ar ? 'إضافة قطعة' : 'Add garment'}
      </Button>

      {!isValid && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {ar
            ? 'يرجى تحديد النوع والخدمة لكل قطعة.'
            : 'Please set garment type and service for every item.'}
        </Alert>
      )}

      {/* Total */}
      {garments.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            {ar ? 'الإجمالي:' : 'Total:'} KD {total.toFixed(3)}
          </Typography>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="outlined" onClick={onBack}>{ar ? 'رجوع' : 'Back'}</Button>
        <Button
          variant="contained"
          disabled={!isValid || garments.length === 0}
          onClick={handleSubmit}
        >
          {ar ? 'التالي: المراجعة' : 'Next: Review'}
        </Button>
      </Box>
    </Box>
  );
}
