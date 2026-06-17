'use client';

import { useState, useTransition } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import { updateTenantSettings } from '@/actions/settings';

interface InitialValues {
  name: string;
  default_locale: string;
  base_currency: string;
  brand_primary_color: string;
  logo_url: string;
  tax_rate: number;
}

export default function TenantSettingsForm({ initialValues }: { initialValues: InitialValues }) {
  const [result, setResult] = useState<{ error: string | null } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateTenantSettings(formData);
      setResult(res);
    });
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            name="name"
            label="Organisation Name"
            defaultValue={initialValues.name}
            fullWidth
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="default_locale"
            label="Default Language"
            defaultValue={initialValues.default_locale}
            select
            fullWidth
          >
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="ar">العربية (Arabic)</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="base_currency"
            label="Base Currency"
            defaultValue={initialValues.base_currency}
            select
            fullWidth
          >
            <MenuItem value="KWD">KWD — Kuwaiti Dinar</MenuItem>
            <MenuItem value="SAR">SAR — Saudi Riyal</MenuItem>
            <MenuItem value="AED">AED — UAE Dirham</MenuItem>
            <MenuItem value="QAR">QAR — Qatari Riyal</MenuItem>
            <MenuItem value="BHD">BHD — Bahraini Dinar</MenuItem>
            <MenuItem value="OMR">OMR — Omani Rial</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="tax_rate"
            label="Tax Rate (%)"
            type="number"
            defaultValue={initialValues.tax_rate}
            inputProps={{ min: 0, max: 100, step: 0.01 }}
            fullWidth
            helperText="0% for Kuwait (no VAT currently)"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            name="brand_primary_color"
            label="Brand Colour (hex)"
            defaultValue={initialValues.brand_primary_color}
            placeholder="#1d4ed8"
            fullWidth
            helperText="E.g. #1d4ed8"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            name="logo_url"
            label="Logo URL"
            defaultValue={initialValues.logo_url}
            placeholder="https://..."
            fullWidth
          />
        </Grid>

        {result && (
          <Grid item xs={12}>
            {result.error ? (
              <Alert severity="error">{result.error}</Alert>
            ) : (
              <Alert severity="success">Settings saved successfully.</Alert>
            )}
          </Grid>
        )}

        <Grid item xs={12}>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
