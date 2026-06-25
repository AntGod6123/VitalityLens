import React, { createContext, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { COLORS, DARK_COLORS, LIGHT_COLORS } from '../constants';
import { AppTheme } from '../types';

interface ThemeContextValue {
  theme: AppTheme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme: AppTheme = useSelector((s: RootState) => s.user.profile?.theme ?? 'dark');

  useEffect(() => {
    const source = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
    (Object.keys(source) as (keyof typeof DARK_COLORS)[]).forEach(key => {
      (COLORS as any)[key] = source[key];
    });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
