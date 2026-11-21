// orca-fork: Settings › Appearance › Customization: agentes.chat-style color themes and accent, density,
// sidebar style, window opacity and how much of the window material shows through the app. Kept in this
// Mac's settings (`orcaForkAppearance`), so each computer looks its own way.

export type ForkPaletteId =
  | 'orca'
  | 'agentes'
  | 'paper'
  | 'ocean'
  | 'forest'
  | 'plum'
  | 'rose'
  | 'graphite'
export type ForkDensity = 'compact' | 'default' | 'comfortable'
export type ForkSidebarStyle = 'flat' | 'inset'

export type ForkAppearanceSettings = {
  palette: ForkPaletteId
  /** 'default' (the theme's own), a preset of FORK_ACCENTS, or a `#rrggbb` color. */
  accent: string
  /** The whole window, desktop showing through (macOS and Windows). */
  windowOpacity: number
  /** How much of the window material (vibrancy) the app's surfaces let through; 0 keeps them opaque. */
  surfaceTranslucency: number
  density: ForkDensity
  sidebarStyle: ForkSidebarStyle
}

export const DEFAULT_FORK_APPEARANCE: ForkAppearanceSettings = {
  palette: 'orca',
  accent: 'default',
  windowOpacity: 1,
  surfaceTranslucency: 0,
  density: 'default',
  sidebarStyle: 'flat'
}

/** Each color theme tints the app's surfaces with one hue, as agentes.chat's sky-tinted paper. */
export const FORK_PALETTES: readonly { id: ForkPaletteId; tint: string | null }[] = [
  { id: 'orca', tint: null },
  { id: 'agentes', tint: '#0063d1' },
  { id: 'paper', tint: '#b07a2a' },
  { id: 'ocean', tint: '#0f8f86' },
  { id: 'forest', tint: '#1f8a4c' },
  { id: 'plum', tint: '#6e45d1' },
  { id: 'rose', tint: '#c9406a' },
  { id: 'graphite', tint: '#64748b' }
]

/** agentes.chat's agent tones: the deeper one on light, the brighter one on dark. */
export const FORK_ACCENTS: Readonly<Record<string, { light: string; dark: string }>> = {
  sky: { light: '#0063d1', dark: '#5aa8ff' },
  indigo: { light: '#3f4fd6', dark: '#7d8bff' },
  violet: { light: '#6e45d1', dark: '#ae8cf7' },
  rose: { light: '#c9406a', dark: '#f58aa6' },
  amber: { light: '#c07d0b', dark: '#f3c25c' },
  green: { light: '#1f8a4c', dark: '#5fcf8b' },
  teal: { light: '#0f8f86', dark: '#4cd0c0' }
}

export const FORK_WINDOW_OPACITY_MIN = 0.5
export const FORK_SURFACE_TRANSLUCENCY_MAX = 0.8

const HEX = /^#[0-9a-f]{6}$/i

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function pick<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.find((option) => option === value) ?? fallback
}

export function normalizeForkAppearance(value: unknown): ForkAppearanceSettings {
  const record: Record<string, unknown> =
    typeof value === 'object' && value !== null ? { ...value } : {}
  const accent = typeof record.accent === 'string' ? record.accent : 'default'
  return {
    palette: pick(
      record.palette,
      FORK_PALETTES.map((palette) => palette.id),
      DEFAULT_FORK_APPEARANCE.palette
    ),
    accent: accent === 'default' || accent in FORK_ACCENTS || HEX.test(accent) ? accent : 'default',
    windowOpacity: clamp(record.windowOpacity, FORK_WINDOW_OPACITY_MIN, 1, 1),
    surfaceTranslucency: clamp(record.surfaceTranslucency, 0, FORK_SURFACE_TRANSLUCENCY_MAX, 0),
    density: pick(record.density, ['compact', 'default', 'comfortable'], 'default'),
    sidebarStyle: pick(record.sidebarStyle, ['flat', 'inset'], 'flat')
  }
}

/** The accent for this scheme and the text that reads on it; null keeps the theme's own. */
export function forkAccentColors(
  accent: string,
  dark: boolean
): { color: string; onColor: string } | null {
  const preset = FORK_ACCENTS[accent]
  const color = preset ? (dark ? preset.dark : preset.light) : HEX.test(accent) ? accent : null
  if (!color) {
    return null
  }
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255)
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
  return { color, onColor: luminance > 0.55 ? '#0a0a0a' : '#ffffff' }
}
