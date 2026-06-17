'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { loginAction } from '@/actions/auth';
import LanguageToggle from './LanguageToggle';
import AppLogo from './AppLogo';
import type { Locale } from '@/i18n/routing';

interface Props {
  locale: Locale;
}

export default function LoginForm({ locale }: Props) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('locale', locale);

    startTransition(async () => {
      try {
        const result = await loginAction(fd);
        if (result?.error) {
          setError(result.error);
        } else if (result?.redirectTo) {
          router.push(result.redirectTo);
        } else {
          setError('Unexpected response from server. Please try again.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Login failed: ${msg}`);
      }
    });
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 440 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <AppLogo />
        <LanguageToggle locale={locale} />
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            {t('login')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('loginSubtitle')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label={t('email')}
              name="email"
              type="email"
              autoComplete="email"
              required
              fullWidth
              sx={{ mb: 2 }}
              disabled={isPending}
            />
            <TextField
              label={t('password')}
              name="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              required
              fullWidth
              sx={{ mb: 3 }}
              disabled={isPending}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPw((v) => !v)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={isPending}
            >
              {t('login')}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary" align="center">
            {t('noAccount')}{' '}
            <Box
              component="a"
              href={`/${locale}/signup`}
              sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {t('signup')}
            </Box>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
