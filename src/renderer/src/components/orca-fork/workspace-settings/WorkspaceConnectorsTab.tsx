// orca-fork: workspace settings › Connectors: Slack, Linear, GitHub and Google, and which of the
// workspace's bots each one reaches.
import React from 'react'
import { Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { openBotConnectorsTab } from '@/components/bots/bot-settings-open'
import type { Bot } from '../../../../../shared/bot-types'
import { useWorkspaceBots } from './use-workspace-bots'
import { closeWorkspaceSettings } from './workspace-settings-open'
import { SettingsEmpty, SettingsRow, SettingsSectionTitle } from './workspace-settings-rows'

type Connector = { id: string; name: string; connected: (bot: Bot) => boolean }

const CONNECTORS: readonly Connector[] = [
  {
    id: 'slack',
    name: 'Slack',
    connected: (bot) => !!bot.slack || (bot.slackApps?.length ?? 0) > 0
  },
  {
    id: 'linear',
    name: 'Linear',
    connected: (bot) => !!bot.linear || (bot.linearWorkspaces?.length ?? 0) > 0
  },
  { id: 'github', name: 'GitHub', connected: (bot) => !!bot.github },
  { id: 'google', name: 'Google', connected: (bot) => bot.google === true }
]

export function WorkspaceConnectorsTab(): React.JSX.Element {
  const t = useTranslate()
  const { bots } = useWorkspaceBots()
  const manage = (bot: Bot): void => {
    closeWorkspaceSettings()
    openBotConnectorsTab(bot)
  }
  if (bots.length === 0) {
    return (
      <SettingsEmpty>
        {t(
          'orcaFork.workspaceSettings.connectors.noBots',
          'Connectors belong to bots: create one in this workspace to connect Slack, Linear, GitHub or Google.'
        )}
      </SettingsEmpty>
    )
  }
  return (
    <div className="flex flex-col gap-5">
      {CONNECTORS.map((connector) => {
        const reached = bots.filter(connector.connected)
        return (
          <div key={connector.id} className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Plug className="size-4 text-muted-foreground" aria-hidden="true" />
              <SettingsSectionTitle>{connector.name}</SettingsSectionTitle>
              <span className="text-xs text-muted-foreground">
                {reached.length > 0
                  ? t('orcaFork.workspaceSettings.connectors.botCount', 'Bots: {{count}}', {
                      count: reached.length
                    })
                  : t('orcaFork.workspaceSettings.connectors.none', 'Not connected')}
              </span>
            </div>
            {reached.map((bot) => (
              <SettingsRow
                key={`${bot.hostId}/${bot.id}`}
                leading={<BotAvatar bot={bot} className="size-7" />}
                title={bot.name}
                className="min-h-10"
              >
                <Button variant="ghost" size="sm" onClick={() => manage(bot)}>
                  {t('orcaFork.workspaceSettings.connectors.manage', 'Manage')}
                </Button>
              </SettingsRow>
            ))}
          </div>
        )
      })}
      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <SettingsSectionTitle>
          {t('orcaFork.workspaceSettings.connectors.add', 'Connect a bot')}
        </SettingsSectionTitle>
        {bots.map((bot) => (
          <SettingsRow
            key={`${bot.hostId}/${bot.id}`}
            leading={<BotAvatar bot={bot} className="size-7" />}
            title={bot.name}
            className="min-h-10"
          >
            <Button variant="outline" size="sm" onClick={() => manage(bot)}>
              {t('orcaFork.workspaceSettings.connectors.connect', 'Connectors…')}
            </Button>
          </SettingsRow>
        ))}
      </div>
    </div>
  )
}
