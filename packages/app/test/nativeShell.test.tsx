/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The native shell must not offer links to the live site: Capacitor hands a top-level navigation to
 * Safari (iOS) or Chrome (Android), where the player can install the PWA again.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));

import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsSheet } from '../src/components/SettingsSheet';
import { DEFAULT_SETTINGS } from '../src/ui';

const noop = () => {};

describe('native shell', () => {
  it('does not link the settings panel to the live site', () => {
    const html = renderToStaticMarkup(
      <SettingsSheet settings={DEFAULT_SETTINGS} onChange={noop} onClose={noop} />,
    );
    expect(html).toContain('Revisited Labs');
    expect(html).not.toContain('href="https://revisitedlabs.com');
    expect(html).not.toContain('href="https://kakurorevisited.com');
  });
});
