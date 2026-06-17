'use client';

import { useTranslations, useLocale } from 'next-intl';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import LanguageIcon from '@mui/icons-material/Language';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useState } from 'react';
import { useColorMode } from '@/components/theme/ThemeRegistry';
import { logoutAction } from '@/actions/auth';
import type { SessionUser } from '@/types';

interface Props {
  user: SessionUser;
  onMobileMenuOpen: () => void;
  breadcrumb?: string;
}

export default function AppHeader({ user, onMobileMenuOpen, breadcrumb }: Props) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const { mode, toggleColorMode } = useColorMode();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const otherLocale = locale === 'en' ? 'ar' : 'en';
  const localeLabel = locale === 'en' ? 'العربية' : 'English';

  function switchLocale() {
    const current = window.location.pathname;
    window.location.href = current.replace(`/${locale}`, `/${otherLocale}`);
  }

  async function handleLogout() {
    setAnchorEl(null);
    const fd = new FormData();
    fd.set('locale', locale);
    await logoutAction(locale);
  }

  const initials = (user.profile.full_name ?? user.email)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{ zIndex: (theme) => theme.zIndex.drawer - 1 }}
    >
      <Toolbar sx={{ gap: 1 }}>
        {/* Mobile menu toggle */}
        <IconButton
          edge="start"
          onClick={onMobileMenuOpen}
          sx={{ display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Breadcrumb */}
        {breadcrumb && (
          <Typography variant="h6" component="h1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            {breadcrumb}
          </Typography>
        )}
        {!breadcrumb && <Box sx={{ flexGrow: 1 }} />}

        {/* Language toggle */}
        <Tooltip title={localeLabel}>
          <IconButton size="small" onClick={switchLocale}>
            <LanguageIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Color mode toggle */}
        <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
          <IconButton size="small" onClick={toggleColorMode}>
            {mode === 'light' ? (
              <DarkModeIcon fontSize="small" />
            ) : (
              <LightModeIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>

        {/* Notifications */}
        <Tooltip title="Notifications">
          <IconButton size="small">
            <NotificationsNoneIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Profile menu */}
        <Tooltip title={user.profile.full_name ?? user.email}>
          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{ paper: { sx: { minWidth: 180, mt: 0.5 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {user.profile.full_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            {t('logout')}
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
