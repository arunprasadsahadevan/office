'use client';

import { useState, useMemo, createContext, useContext, useCallback } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { ThemeProvider, createTheme, type PaletteMode } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';

// ─── Color mode context ───────────────────────────────────────────────────────

interface ColorModeContextValue {
  mode: PaletteMode;
  toggleColorMode: () => void;
}

export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: 'light',
  toggleColorMode: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

// ─── Build MUI theme ──────────────────────────────────────────────────────────

function buildTheme(mode: PaletteMode, dir: 'ltr' | 'rtl') {
  return createTheme({
    direction: dir,
    palette: {
      mode,
      primary: {
        main: '#1d4ed8',
        light: '#3b82f6',
        dark: '#1e40af',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#7c3aed',
        light: '#a78bfa',
        dark: '#5b21b6',
        contrastText: '#ffffff',
      },
      error:   { main: '#ef4444' },
      warning: { main: '#f59e0b' },
      success: { main: '#10b981' },
      background: {
        default: mode === 'light' ? '#f8fafc' : '#0f172a',
        paper:   mode === 'light' ? '#ffffff' : '#1e293b',
      },
      text: {
        primary:   mode === 'light' ? '#0f172a' : '#f1f5f9',
        secondary: mode === 'light' ? '#475569' : '#94a3b8',
      },
    },
    typography: {
      fontFamily: '"Inter", "Public Sans", "Helvetica Neue", Arial, sans-serif',
      h1: { fontWeight: 700, fontSize: '2rem' },
      h2: { fontWeight: 700, fontSize: '1.5rem' },
      h3: { fontWeight: 600, fontSize: '1.25rem' },
      h4: { fontWeight: 600, fontSize: '1.125rem' },
      h5: { fontWeight: 600, fontSize: '1rem' },
      h6: { fontWeight: 600, fontSize: '0.875rem' },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.6 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 10 },
    shadows: [
      'none',
      '0px 1px 2px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.1)',
      '0px 1px 5px rgba(0,0,0,0.08), 0px 2px 8px rgba(0,0,0,0.12)',
      '0px 2px 6px rgba(0,0,0,0.08), 0px 4px 12px rgba(0,0,0,0.12)',
      '0px 4px 8px rgba(0,0,0,0.08), 0px 6px 16px rgba(0,0,0,0.12)',
      '0px 6px 10px rgba(0,0,0,0.08), 0px 8px 24px rgba(0,0,0,0.12)',
      ...Array(19).fill('none'),
    ] as any,
    components: {
      MuiCard: {
        defaultProps: { elevation: 1 },
        styleOverrides: {
          root: {
            borderRadius: 12,
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8, paddingTop: 10, paddingBottom: 10 },
          sizeLarge: { paddingTop: 12, paddingBottom: 12 },
        },
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined', size: 'small' },
      },
      MuiOutlinedInput: {
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiChip: {
        styleOverrides: { root: { borderRadius: 6 } },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderBottom: mode === 'light'
              ? '1px solid rgba(0,0,0,0.08)'
              : '1px solid rgba(255,255,255,0.08)',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            borderRight: mode === 'light'
              ? '1px solid rgba(0,0,0,0.08)'
              : '1px solid rgba(255,255,255,0.08)',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 8, marginBottom: 2 },
        },
      },
    },
  });
}

// ─── Emotion cache factory ────────────────────────────────────────────────────

function createEmotionCache(dir: 'ltr' | 'rtl') {
  const cache = createCache({
    key: dir === 'rtl' ? 'muirtl' : 'mui',
    stylisPlugins: dir === 'rtl' ? [prefixer, rtlPlugin as any] : [prefixer],
    prepend: true,
  });
  cache.compat = true;
  return cache;
}

// ─── ThemeRegistry ────────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
  dir?: 'ltr' | 'rtl';
}

export default function ThemeRegistry({ children, dir = 'ltr' }: Props) {
  const [mode, setMode] = useState<PaletteMode>('light');

  const toggleColorMode = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Emotion cache with SSR streaming support
  const [{ cache, flush }] = useState(() => {
    const cache = createEmotionCache(dir);
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args: Parameters<typeof prevInsert>) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prev = inserted;
      inserted = [];
      return prev;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (names.length === 0) return null;
    let styles = '';
    for (const name of names) {
      styles += cache.inserted[name];
    }
    return (
      <style
        key={cache.key}
        data-emotion={`${cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  const theme = useMemo(() => buildTheme(mode, dir), [mode, dir]);

  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
      <CacheProvider value={cache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </CacheProvider>
    </ColorModeContext.Provider>
  );
}
