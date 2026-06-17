'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import { searchCustomers, createCustomer } from '@/actions/customers';
import type { Customer } from '@/types';

interface Props {
  onSelect: (customer: Customer) => void;
}

export default function CustomerStep({ onSelect }: Props) {
  const locale = useLocale();
  const ar = locale === 'ar';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      searchCustomers(query).then((r) => {
        setResults(r);
        setSearching(false);
      });
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCustomer(fd);
      if (result.error) { setError(result.error); return; }
      if (result.data) onSelect(result.data);
    });
  }

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {ar ? 'ابحث عن العميل أو أنشئ جديداً' : 'Search or create a customer'}
      </Typography>

      <TextField
        fullWidth
        placeholder={ar ? 'اسم العميل أو رقم الهاتف…' : 'Customer name or phone…'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{
          startAdornment: searching ? (
            <CircularProgress size={16} sx={{ mr: 1 }} />
          ) : (
            <SearchIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
          ),
        }}
        sx={{ mb: 2 }}
        autoFocus
      />

      {results.length > 0 && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <List disablePadding>
            {results.map((c, i) => (
              <Box key={c.id}>
                {i > 0 && <Divider />}
                <ListItemButton onClick={() => onSelect(c)} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.light', fontSize: 13 }}>
                      {c.full_name.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={c.full_name}
                    secondary={c.phone}
                    slotProps={{ primary: { fontWeight: 600 } }}
                  />
                </ListItemButton>
              </Box>
            ))}
          </List>
        </Card>
      )}

      {query.length >= 2 && results.length === 0 && !searching && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {ar ? 'لم يُعثر على عميل. أنشئ عميلاً جديداً.' : 'No customer found. Create a new one.'}
        </Alert>
      )}

      {/* Create customer */}
      <Button
        variant={showCreate ? 'contained' : 'outlined'}
        startIcon={<PersonAddIcon />}
        onClick={() => setShowCreate((v) => !v)}
        sx={{ mb: 2 }}
      >
        {ar ? 'عميل جديد' : 'New customer'}
      </Button>

      {showCreate && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {ar ? 'إنشاء عميل جديد' : 'Create new customer'}
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Box component="form" onSubmit={handleCreate} noValidate>
              <TextField
                label={ar ? 'الاسم الكامل' : 'Full name'}
                name="full_name"
                fullWidth
                required
                sx={{ mb: 2 }}
                disabled={isPending}
              />
              <TextField
                label={ar ? 'رقم الهاتف' : 'Phone'}
                name="phone"
                fullWidth
                required
                sx={{ mb: 2 }}
                disabled={isPending}
                defaultValue={query.match(/^\d/) ? query : ''}
              />
              <TextField
                label={ar ? 'البريد الإلكتروني (اختياري)' : 'Email (optional)'}
                name="email"
                type="email"
                fullWidth
                sx={{ mb: 2 }}
                disabled={isPending}
              />
              <input type="hidden" name="preferred_locale" value={locale} />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                loading={isPending}
                startIcon={<PersonIcon />}
              >
                {ar ? 'إنشاء واختيار' : 'Create & select'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
