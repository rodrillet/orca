// orca-fork: Settings › Appearance › Customization: color theme and accent (agentes.chat's palette),
// density, sidebar style, window opacity and translucent surfaces over the window material.
import React from 'react'
import { Check } from 'lucide-react'
import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import {
  FORK_ACCENTS,
  FORK_PALETTES,
  FORK_SURFACE_TRANSLUCENCY_MAX,
  FORK_WINDOW_OPACITY_MIN,
  normalizeForkAppearance,
  type ForkAppearanceSettings
} from '../../../../../shared/orca-fork/appearance/fork-appearance'
import { Slider } from '@/components/ui/slider'
import {
  SettingsRow,
  SettingsSegmentedControl
} from '@/components/settings/form-controls/SettingsFormControls'
import { WindowMaterialSetting } from '@/components/settings/appearance/WindowMaterialSetting'
import { activeWindowMaterial } from '@/app-shell/appearance/window-material-runtime'
import { getRendererAppPlatform } from '@/app-shell/platform/renderer-app-platform'
import { isWebClientLocation } from '@/app-shell/platform/web-client-location'
import { useDocumentDarkTheme } from '@/hooks/theme/use-document-dark-theme'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { SettingsGroup } from '@/components/settings/section-layout/SettingsGroup'
import { matchesSettingsSearch } from '@/components/settings/search/settings-search'
import { cn } from '@/lib/class-names'

type Props = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

function Swatch({
  color,
  selected,
  label,
  onClick,
  children
}: {
  color: string
  selected: boolean
  label: string
  onClick: () => void
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'relative flex size-7 items-center justify-center rounded-full border border-border shadow-xs',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background'
      )}
      style={{ background: color }}
    >
      {children}
      {selected ? <Check className="size-3.5 text-white mix-blend-difference" /> : null}
    </button>
  )
}

/** A color theme's card: its sidebar paper beside its page, as the app will look. */
function PaletteCard({
  tint,
  label,
  selected,
  dark,
  onClick
}: {
  tint: string | null
  label: string
  selected: boolean
  dark: boolean
  onClick: () => void
}): React.JSX.Element {
  const mix = (amount: number, base: string) =>
    tint ? `color-mix(in srgb, ${tint} ${amount}%, ${base})` : base
  const side = dark ? mix(6, '#0d0e10') : mix(5, '#f7f7f6')
  const page = dark ? mix(4, '#131312') : mix(1.5, '#ffffff')
  const line = dark ? mix(14, '#222326') : mix(11, '#ebebe9')
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex w-28 flex-col gap-1.5 rounded-lg border border-border p-1.5 text-left text-xs hover:bg-accent',
        selected && 'ring-2 ring-ring'
      )}
    >
      <span className="flex h-14 overflow-hidden rounded-md border border-border">
        <span className="flex w-1/3 flex-col gap-1 p-1" style={{ background: side }}>
          <span className="h-1.5 rounded-sm" style={{ background: line }} />
          <span className="h-1.5 w-2/3 rounded-sm" style={{ background: line }} />
        </span>
        <span className="flex flex-1 flex-col gap-1 p-1.5" style={{ background: page }}>
          <span className="h-1.5 w-3/4 rounded-sm" style={{ background: line }} />
          <span className="h-1.5 w-1/2 rounded-sm" style={{ background: line }} />
          {tint ? (
            <span className="mt-auto h-2 w-6 rounded-sm" style={{ background: tint }} />
          ) : null}
        </span>
      </span>
      <span className="truncate px-0.5 font-medium">{label}</span>
    </button>
  )
}

export function ForkAppearanceSection({ settings, updateSettings }: Props): React.JSX.Element {
  const t = useTranslate()
  const dark = useDocumentDarkTheme()
  const look = normalizeForkAppearance(settings.orcaForkAppearance)
  const set = (patch: Partial<ForkAppearanceSettings>) =>
    updateSettings({ orcaForkAppearance: { ...look, ...patch } })
  const platform = getRendererAppPlatform()
  const desktop = !isWebClientLocation()
  const opacityWorks = desktop && platform !== 'linux'
  const material = desktop ? activeWindowMaterial() : 'off'
  const paletteLabels: Record<string, string> = {
    orca: t('orcaFork.appearance.palette.orca', 'Orca'),
    agentes: t('orcaFork.appearance.palette.agentes', 'Agentes'),
    paper: t('orcaFork.appearance.palette.paper', 'Paper'),
    ocean: t('orcaFork.appearance.palette.ocean', 'Ocean'),
    forest: t('orcaFork.appearance.palette.forest', 'Forest'),
    plum: t('orcaFork.appearance.palette.plum', 'Plum'),
    rose: t('orcaFork.appearance.palette.rose', 'Rosé'),
    graphite: t('orcaFork.appearance.palette.graphite', 'Graphite')
  }

  return (
    <div className="flex flex-col divide-y divide-border/60">
      <SettingsRow
        alignTop
        label={t('orcaFork.appearance.colorTheme', 'Color theme')}
        description={t(
          'orcaFork.appearance.colorThemeHint',
          'Tints the sidebar and pages with one hue, as agentes.chat. Works with light and dark.'
        )}
        control={
          <div role="radiogroup" className="flex max-w-[30rem] flex-wrap justify-end gap-2">
            {FORK_PALETTES.map((palette) => (
              <PaletteCard
                key={palette.id}
                tint={palette.tint}
                dark={dark}
                label={paletteLabels[palette.id] ?? palette.id}
                selected={look.palette === palette.id}
                onClick={() => set({ palette: palette.id })}
              />
            ))}
          </div>
        }
      />
      <SettingsRow
        label={t('orcaFork.appearance.accent', 'Accent color')}
        description={t(
          'orcaFork.appearance.accentHint',
          'Buttons, links, focus and selected marks. agentes.chat’s agent tones, or your own.'
        )}
        control={
          <div role="radiogroup" className="flex flex-wrap items-center gap-2">
            <Swatch
              color="var(--background)"
              label={t('orcaFork.appearance.accentDefault', 'Theme default')}
              selected={look.accent === 'default'}
              onClick={() => set({ accent: 'default' })}
            >
              {look.accent === 'default' ? null : (
                <span className="h-px w-5 rotate-45 bg-muted-foreground" />
              )}
            </Swatch>
            {Object.entries(FORK_ACCENTS).map(([id, tones]) => (
              <Swatch
                key={id}
                color={dark ? tones.dark : tones.light}
                label={id.charAt(0).toUpperCase() + id.slice(1)}
                selected={look.accent === id}
                onClick={() => set({ accent: id })}
              />
            ))}
            <label
              className={cn(
                'relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border text-2xs text-muted-foreground',
                look.accent.startsWith('#') &&
                  'ring-2 ring-ring ring-offset-2 ring-offset-background'
              )}
              title={t('orcaFork.appearance.accentCustom', 'Your own color')}
              style={look.accent.startsWith('#') ? { background: look.accent } : undefined}
            >
              {look.accent.startsWith('#') ? null : '+'}
              <input
                type="color"
                aria-label={t('orcaFork.appearance.accentCustom', 'Your own color')}
                className="absolute inset-0 cursor-pointer opacity-0"
                value={look.accent.startsWith('#') ? look.accent : '#0063d1'}
                onChange={(event) => set({ accent: event.target.value })}
              />
            </label>
          </div>
        }
      />
      <SettingsRow
        label={t('orcaFork.appearance.density', 'Density')}
        description={t(
          'orcaFork.appearance.densityHint',
          'How much room rows, buttons and panels take.'
        )}
        control={
          <SettingsSegmentedControl
            value={look.density}
            onChange={(density) => set({ density })}
            ariaLabel={t('orcaFork.appearance.density', 'Density')}
            options={[
              { value: 'compact', label: t('orcaFork.appearance.compact', 'Compact') },
              { value: 'default', label: t('orcaFork.appearance.standard', 'Standard') },
              { value: 'comfortable', label: t('orcaFork.appearance.comfortable', 'Comfortable') }
            ]}
          />
        }
      />
      <SettingsRow
        label={t('orcaFork.appearance.sidebarStyle', 'Sidebar style')}
        description={t(
          'orcaFork.appearance.sidebarStyleHint',
          'Inset sets the work area as a sheet on the sidebar’s paper, as agentes.chat.'
        )}
        control={
          <SettingsSegmentedControl
            value={look.sidebarStyle}
            onChange={(sidebarStyle) => set({ sidebarStyle })}
            ariaLabel={t('orcaFork.appearance.sidebarStyle', 'Sidebar style')}
            options={[
              { value: 'flat', label: t('orcaFork.appearance.flat', 'Flat') },
              { value: 'inset', label: t('orcaFork.appearance.inset', 'Inset') }
            ]}
          />
        }
      />
      <SettingsRow
        label={t('orcaFork.appearance.windowOpacity', 'Window opacity')}
        description={
          opacityWorks
            ? t(
                'orcaFork.appearance.windowOpacityHint',
                'See the desktop through the whole window.'
              )
            : t('orcaFork.appearance.windowOpacityLinux', 'Available on macOS and Windows.')
        }
        control={
          <div className="flex w-56 items-center gap-3">
            <Slider
              min={FORK_WINDOW_OPACITY_MIN * 100}
              max={100}
              step={1}
              disabled={!opacityWorks}
              value={[Math.round(look.windowOpacity * 100)]}
              onValueChange={([value]) => set({ windowOpacity: (value ?? 100) / 100 })}
              thumbLabels={[t('orcaFork.appearance.windowOpacity', 'Window opacity')]}
            />
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(look.windowOpacity * 100)}%
            </span>
          </div>
        }
      />
      {desktop ? (
        <WindowMaterialSetting settings={settings} updateSettings={updateSettings} />
      ) : null}
      <SettingsRow
        label={t('orcaFork.appearance.translucency', 'Translucent interface')}
        description={
          material === 'off'
            ? t(
                'orcaFork.appearance.translucencyNeedsMaterial',
                'Lets the window material (blur on macOS) show through the sidebar and pages. Pick Blurred or Translucent above and restart.'
              )
            : t(
                'orcaFork.appearance.translucencyHint',
                'How much of the window material shows through the sidebar and pages.'
              )
        }
        control={
          <div className="flex w-56 items-center gap-3">
            <Slider
              min={0}
              max={FORK_SURFACE_TRANSLUCENCY_MAX * 100}
              step={1}
              value={[Math.round(look.surfaceTranslucency * 100)]}
              onValueChange={([value]) => set({ surfaceTranslucency: (value ?? 0) / 100 })}
              thumbLabels={[t('orcaFork.appearance.translucency', 'Translucent interface')]}
            />
            <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(look.surfaceTranslucency * 100)}%
            </span>
          </div>
        }
      />
    </div>
  )
}

/** The Customization group at the top of Settings › Appearance; a search shows it when its words match. */
export function ForkAppearanceGroup(props: Props): React.JSX.Element | null {
  const t = useTranslate()
  const query = useAppStore((state) => state.settingsSearchQuery)
  const title = t('orcaFork.appearance.title', 'Customization')
  const description = t(
    'orcaFork.appearance.description',
    'Color theme, accent, density, sidebar style, window opacity and translucency on this computer.'
  )
  if (
    !FORK_FEATURES.interfaceCustomization ||
    !matchesSettingsSearch(query, { title, description })
  ) {
    return null
  }
  return (
    <SettingsGroup title={title} description={description}>
      <ForkAppearanceSection {...props} />
    </SettingsGroup>
  )
}
