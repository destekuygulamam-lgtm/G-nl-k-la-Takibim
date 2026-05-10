import { useState, useEffect } from 'react';

export type ThemeColor = 'blue' | 'emerald' | 'violet' | 'rose' | 'amber';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeColor>(() => {
    return (localStorage.getItem('medtrack-theme') as ThemeColor) || 'blue';
  });

  useEffect(() => {
    localStorage.setItem('medtrack-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return { theme, setTheme };
}
