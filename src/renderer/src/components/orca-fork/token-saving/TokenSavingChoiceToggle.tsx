// orca-fork: one level's token-saving choice: inherit (with what it inherits), on, or off.
import React from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import type {
  ResolvedTokenSaving,
  TokenSavingChoice,
  TokenSavingSource
} from '../../../../../shared/orca-fork/token-saving/token-saving'

export function tokenSavingSourceLabel(t: Translate, source: TokenSavingSource): string {
  switch (source) {
    case 'bot':
      return t('orcaFork.tokenSaving.source.bot', 'this bot')
    case 'department':
      return t('orcaFork.tokenSaving.source.department', 'its department')
    case 'workspace':
      return t('orcaFork.tokenSaving.source.workspace', 'its workspace')
    case 'global':
      return t('orcaFork.tokenSaving.source.global', 'the global setting')
    case 'default':
      return t('orcaFork.tokenSaving.source.default', 'the default')
  }
}

export function TokenSavingChoiceToggle({
  choice,
  inherited,
  onChange,
  allowInherit = true,
  label
}: {
  choice: TokenSavingChoice
  /** What "Inherit" resolves to now; absent at the top level. */
  inherited?: ResolvedTokenSaving
  onChange: (choice: TokenSavingChoice) => void
  allowInherit?: boolean
  label: string
}): React.JSX.Element {
  const t = useTranslate()
  const value = choice === undefined ? 'inherit' : choice ? 'on' : 'off'
  const inheritLabel = inherited
    ? t('orcaFork.tokenSaving.inheritValue', 'Inherit ({{value}})', {
        value: inherited.enabled
          ? t('orcaFork.tokenSaving.on', 'On')
          : t('orcaFork.tokenSaving.off', 'Off')
      })
    : t('orcaFork.tokenSaving.inherit', 'Inherit')
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      spacing={0}
      value={value}
      aria-label={label}
      onValueChange={(next) => {
        if (next === 'inherit') {
          onChange(undefined)
        } else if (next === 'on' || next === 'off') {
          onChange(next === 'on')
        }
      }}
    >
      {allowInherit ? <ToggleGroupItem value="inherit">{inheritLabel}</ToggleGroupItem> : null}
      <ToggleGroupItem value="on">{t('orcaFork.tokenSaving.on', 'On')}</ToggleGroupItem>
      <ToggleGroupItem value="off">{t('orcaFork.tokenSaving.off', 'Off')}</ToggleGroupItem>
    </ToggleGroup>
  )
}

/** 12.3k / 4.5M, as the stats read at a glance. */
export function formatTokenCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`
  }
  return String(value)
}
