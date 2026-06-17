'use client';

import Button from '@mui/material/Button';
import LanguageIcon from '@mui/icons-material/Language';
import type { Locale } from '@/i18n/routing';

interface Props {
  locale: Locale;
}

export default function LanguageToggle({ locale }: Props) {
  const otherLocale = locale === 'en' ? 'ar' : 'en';
  const label = locale === 'en' ? 'العربية' : 'English';

  function switchLocale() {
    // Replace locale prefix in the current path
    const current = window.location.pathname;
    const newPath = current.replace(`/${locale}`, `/${otherLocale}`);
    window.location.href = newPath;
  }

  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={<LanguageIcon fontSize="small" />}
      onClick={switchLocale}
      sx={{ borderRadius: 6, minWidth: 100 }}
    >
      {label}
    </Button>
  );
}
