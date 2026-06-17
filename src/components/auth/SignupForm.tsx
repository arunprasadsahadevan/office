'use client';

import { useState, useTransition } from 'react';
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
import { signupAction } from '@/actions/auth';
import LanguageToggle from './LanguageToggle';
import AppLogo from './AppLogo';
import type { Locale } from '@/i18n/routing';

interface Props {
  locale: Locale;
}

export default function SignupForm({ locale }: Props) {
  const t = useTranslations('auth');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function validate(fd: FormData): string | null {
    const pw = fd.get('password') as string;
    const confirm = fd.get('confirmPassword') as string;
    if (pw.length < 8) return t('passwordTooShort');
    if (pw !== confirm) return t('passwordMismatch');
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set('locale', locale);

    const validationError = validate(fd);
    if (validationError) {
      setError(validationError);
      return;
    }

    startTransition(async () => {
      const result = await signupAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 480 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <AppLogo />
        <LanguageToggle locale={locale} />
      </Box>

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            {t('signup')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t('signupSubtitle')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label={t('fullName')}
              name="fullName"
              autoComplete="name"
              required
              fullWidth
              sx={{ mb: 2 }}
              disabled={isPending}
            />
            <TextField
              label={t('businessName')}
              name="businessName"
              required
              fullWidth
              helperText={t('businessNameHelp')}
              sx={{ mb: 2 }}
              disabled={isPending}
            />
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
              autoComplete="new-password"
              required
              fullWidth
              sx={{ mb: 2 }}
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
            <TextField
              label={t('confirmPassword')}
              name="confirmPassword"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              required
              fullWidth
              sx={{ mb: 3 }}
              disabled={isPending}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              loading={isPending}
            >
              {t('signup')}
            </Button>

            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2, textAlign: 'center' }}>
              {t('termsAgreement')}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary" align="center">
            {t('alreadyHaveAccount')}{' '}
            <Box
              component="a"
              href={`/${locale}/login`}
              sx={{ color: 'primary.main', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {t('login')}
            </Box>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
