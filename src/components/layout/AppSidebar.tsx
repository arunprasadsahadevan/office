'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory2';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import SettingsIcon from '@mui/icons-material/Settings';
import SubscriptionsIcon from '@mui/icons-material/Subscriptions';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';

const DRAWER_WIDTH = 240;
const DRAWER_COLLAPSED = 68;

interface NavItem {
  key: string;
  icon: React.ReactNode;
  href: string;
  phase?: number;
}

const navItems: NavItem[] = [
  { key: 'dashboard',     icon: <DashboardIcon />,       href: '/dashboard' },
  { key: 'orders',        icon: <ReceiptLongIcon />,      href: '/orders',       phase: 1 },
  { key: 'customers',     icon: <PeopleIcon />,           href: '/customers',    phase: 1 },
  { key: 'inventory',     icon: <InventoryIcon />,        href: '/inventory',    phase: 2 },
  { key: 'accounting',    icon: <AccountBalanceIcon />,   href: '/accounting',   phase: 2 },
  { key: 'delivery',      icon: <LocalShippingIcon />,    href: '/delivery',     phase: 3 },
  { key: 'subscriptions', icon: <SubscriptionsIcon />,    href: '/subscriptions',phase: 3 },
  { key: 'settings',      icon: <SettingsIcon />,         href: '/settings' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function AppSidebar({
  collapsed,
  onToggle,
  isMobile,
  mobileOpen,
  onMobileClose,
}: Props) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const isRtl = locale === 'ar';

  function isActive(href: string) {
    return pathname.includes(href);
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          px: collapsed ? 1.5 : 2.5,
          gap: 1.5,
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LocalLaundryServiceIcon sx={{ color: 'white', fontSize: 20 }} />
        </Box>
        {!collapsed && (
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>
            LaundryOS
          </Typography>
        )}
      </Box>

      <Divider />

      {/* Nav */}
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          const comingSoon = item.phase != null && item.phase > 0;
          const href = `/${locale}${item.href}`;

          const button = (
            <ListItemButton
              key={item.key}
              component={comingSoon ? 'div' : 'a'}
              href={comingSoon ? undefined : href}
              selected={active}
              disabled={comingSoon}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                minHeight: 44,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1.5 : 2,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 'auto' : 36,
                  color: active ? 'inherit' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={t(item.key as any)}
                  slotProps={{ primary: { variant: 'body2', fontWeight: active ? 700 : 500 } }}
                />
              )}
            </ListItemButton>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.key} title={t(item.key as any)} placement={isRtl ? 'left' : 'right'}>
                <span>{button}</span>
              </Tooltip>
            );
          }

          return button;
        })}
      </List>

      <Divider />

      {/* Collapse toggle */}
      <Box sx={{ p: 1, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
        <IconButton size="small" onClick={onToggle}>
          {isRtl
            ? collapsed ? <ChevronLeftIcon /> : <ChevronRightIcon />
            : collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH,
        flexShrink: 0,
        transition: 'width 0.2s',
        '& .MuiDrawer-paper': {
          width: collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          transition: 'width 0.2s',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
