// orca-fork: paints Settings › Appearance › Customization on <html> (color theme, accent, density,
// sidebar style, translucent surfaces) and sets this window's opacity.
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { useDocumentDarkTheme } from '@/hooks/theme/use-document-dark-theme'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  FORK_PALETTES,
  forkAccentColors,
  normalizeForkAppearance
} from '../../../../../shared/orca-fork/appearance/fork-appearance'
import './fork-appearance.css'

function setAttribute(root: HTMLElement, name: string, value: string | null): void {
  if (value === null) {
    root.removeAttribute(name)
  } else {
    root.setAttribute(name, value)
  }
}

export function ForkAppearanceRuntime(): null {
  const raw = useAppStore((s) => s.settings?.orcaForkAppearance)
  const dark = useDocumentDarkTheme()
  const look = normalizeForkAppearance(FORK_FEATURES.interfaceCustomization ? raw : null)

  useEffect(() => {
    const root = document.documentElement
    const tint = FORK_PALETTES.find((palette) => palette.id === look.palette)?.tint ?? null
    setAttribute(root, 'data-fork-palette', tint ? look.palette : null)
    root.style.setProperty('--fork-tint', tint ?? 'transparent')
    const accent = forkAccentColors(look.accent, dark)
    setAttribute(root, 'data-fork-accent', accent ? '' : null)
    if (accent) {
      root.style.setProperty('--fork-accent', accent.color)
      root.style.setProperty('--fork-on-accent', accent.onColor)
    }
    setAttribute(root, 'data-fork-density', look.density === 'default' ? null : look.density)
    setAttribute(root, 'data-fork-sidebar', look.sidebarStyle === 'inset' ? 'inset' : null)
    setAttribute(root, 'data-fork-translucent', look.surfaceTranslucency > 0 ? '' : null)
    root.style.setProperty('--fork-surface-clear', `${Math.round(look.surfaceTranslucency * 100)}%`)
  }, [look.palette, look.accent, look.density, look.sidebarStyle, look.surfaceTranslucency, dark])

  useEffect(() => {
    void window.api.orcaForkAppearance?.setWindowOpacity(look.windowOpacity).catch(() => {})
  }, [look.windowOpacity])

  return null
}
