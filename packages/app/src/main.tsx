/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The entry point.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/newsreader/latin-500.css';
import '@fontsource/newsreader/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// The service worker makes the app work offline.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* the app works without it */
    });
  });
}
