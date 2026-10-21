/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The player's settings: stored, and the theme applied to the page.
 */
import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '../store';
import type { Settings } from '../ui';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings(window.localStorage));

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const onSettings = (next: Settings) => {
    setSettings(next);
    saveSettings(window.localStorage, next);
  };

  return { settings, onSettings };
}
