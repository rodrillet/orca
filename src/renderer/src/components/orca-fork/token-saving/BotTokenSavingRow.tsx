// orca-fork: a bot's token saving: its own choice (or what it inherits) and what the proxy recorded
// for it. Used in the bot's settings and, as one line, on its Tasks card.
import React, { useMemo } from 'react'
import { Leaf } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { botSidebarEntryKey } from '@/components/bots/bot-sidebar-entry-keys'
import { ipcOrRuntimeTargetForHostId } from '@/runtime/rpc/targets/runtime-client-target'
import type { Bot } from '../../../../../shared/bot-types'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import type { ResolvedTokenSaving } from '../../../../../shared/orca-fork/token-saving/token-saving'
import type { TokenSavingAgentStats } from '../../../../../shared/orca-fork/token-saving/token-saving-rpc'
import { SettingsInsetRow } from '../../bots/settings-view/BotSettingsRows'
import { useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import {
  formatTokenCount,
  tokenSavingSourceLabel,
  TokenSavingChoiceToggle
} from './TokenSavingChoiceToggle'
import { useTokenSavingHost } from './token-saving-host'
import {
  resolveBotTokenSaving,
  tokenSavingEdits,
  useTokenSavingSettings
} from './token-saving-store'

type BotOnHost = Pick<Bot, 'id' | 'hostId'>

export function useBotTokenSaving(
  bot: BotOnHost,
  withStats: boolean
): {
  botKey: string
  resolved: ResolvedTokenSaving
  /** What it would be without the bot's own choice. */
  inherited: ResolvedTokenSaving
  stats: TokenSavingAgentStats | null
} {
  const settings = useTokenSavingSettings()
  const workspaces = useForkWorkspaces()
  const botKey = botSidebarEntryKey(bot)
  const target = useMemo(
    () => ipcOrRuntimeTargetForHostId(bot.hostId) ?? { kind: 'local' as const },
    [bot.hostId]
  )
  const { result } = useTokenSavingHost(target, withStats, 60_000)
  const resolved = resolveBotTokenSaving(settings, workspaces, { hostId: bot.hostId, botKey })
  const inherited = resolveBotTokenSaving({ ...settings, bots: {} }, workspaces, {
    hostId: bot.hostId,
    botKey
  })
  const stats =
    result?.status === 'ok'
      ? (result.data.stats?.agents.find((row) => row.botId === bot.id) ?? null)
      : null
  return { botKey, resolved, inherited, stats }
}

/** One short line: on/off and the last 30 days' tokens. */
export function useBotTokenSavingSummary(bot: BotOnHost, withStats: boolean): string | null {
  const t = useTranslate()
  const { resolved, stats } = useBotTokenSaving(bot, withStats)
  if (!FORK_FEATURES.tokenSaving) {
    return null
  }
  if (!resolved.enabled) {
    return t('orcaFork.tokenSaving.summaryOff', 'Token saving off')
  }
  return stats
    ? t('orcaFork.tokenSaving.summaryStats', 'Token saving · −{{saved}} · out {{output}} (30 d)', {
        saved: formatTokenCount(stats.savedTokens),
        output: formatTokenCount(stats.outputTokens)
      })
    : t('orcaFork.tokenSaving.summaryOn', 'Token saving on')
}

export function BotTokenSavingRow({ bot }: { bot: Bot }): React.JSX.Element | null {
  const t = useTranslate()
  const settings = useTokenSavingSettings()
  const { botKey, resolved, inherited, stats } = useBotTokenSaving(bot, true)
  if (!FORK_FEATURES.tokenSaving) {
    return null
  }
  const title = t('orcaFork.tokenSaving.botTitle', 'Token saving (Caveman)')
  const state = resolved.enabled
    ? t('orcaFork.tokenSaving.on', 'On')
    : t('orcaFork.tokenSaving.off', 'Off')
  const detail = [
    resolved.source === 'bot'
      ? state
      : t('orcaFork.tokenSaving.inheritedFrom', '{{state}}, from {{source}}', {
          state,
          source: tokenSavingSourceLabel(t, resolved.source)
        }),
    stats
      ? t(
          'orcaFork.tokenSaving.botStats',
          '30 days: −{{saved}} context tokens · in {{input}} · out {{output}}',
          {
            saved: formatTokenCount(stats.savedTokens),
            input: formatTokenCount(stats.inputTokens),
            output: formatTokenCount(stats.outputTokens)
          }
        )
      : null
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <SettingsInsetRow
      icon={<Leaf />}
      title={title}
      detail={detail}
      wrapEnd
      end={
        <TokenSavingChoiceToggle
          choice={settings.bots[botKey]}
          inherited={inherited}
          onChange={(choice) => tokenSavingEdits.bot(botKey, choice)}
          label={title}
        />
      }
    />
  )
}
