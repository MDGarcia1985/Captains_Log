/*
 * File: tokens.ts
 *
 * Purpose:
 *     Starship / tactical cyberdeck design tokens independent of screen layout.
 *
 * Author:
 *     Captain's Log contributors
 *     Project owner name pending confirmation.
 *
 * Contact:
 *     Project owner contact information pending confirmation.
 *
 * License:
 *     All rights reserved until the project owner selects a license.
 */

import { Platform } from 'react-native';

export const colors = {
  background: '#070B12',
  surface: '#0C121C',
  panel: '#101826',
  panelAlt: '#152033',
  border: '#1E3A4C',
  borderStrong: '#2A5A6E',
  cyan: '#3DDEE5',
  cyanDim: 'rgba(61, 222, 229, 0.18)',
  orange: '#F5A14A',
  orangeDim: 'rgba(245, 161, 74, 0.16)',
  warning: '#E85D3A',
  text: '#E8EEF4',
  textMuted: '#8A9BB0',
  textDim: '#5C6F86',
  black: '#000000',
} as const;

export const layout = {
  compactMax: 599,
  mediumMax: 899,
  railCompact: 72,
  railExpanded: 220,
  contextWidth: 300,
  hairline: 1,
} as const;

export const fonts = {
  heading: Platform.select({
    ios: 'Helvetica Neue',
    android: 'sans-serif-condensed',
    default: 'system-ui',
    web: 'var(--font-display)',
  }) as string,
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'system-ui',
    web: 'var(--font-body)',
  }) as string,
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
    web: 'var(--font-mono)',
  }) as string,
};
