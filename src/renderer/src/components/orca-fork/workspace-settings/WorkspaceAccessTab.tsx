// orca-fork: workspace settings › Access: what each bot may do on its own and who may ask it.
import React from 'react'
import { ShieldCheck, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { openBotSettings } from '@/components/bots/bot-settings-open'
import { botAgentLabel } from '@/components/bots/bot-presentation'
import { agentPermissionChoiceLabel } from '@/components/agent/launch-settings/agent-permission-choice-label'
import { useWorkspaceBots } from './use-workspace-bots'
import { closeWorkspaceSettings } from './workspace-settings-open'
import { SettingsEmpty, SettingsRow, SettingsSectionTitle } from './workspace-settings-rows'

export function WorkspaceAccessTab(): React.JSX.Element {
  const t = useTranslate()
  const { bots } = useWorkspaceBots()
  const open = (botId: string, place: 'permissions' | 'who-can-ask'): void => {
    closeWorkspaceSettings()
    openBotSettings(botId, place)
  }
  return (
    <div className="flex flex-col gap-3">
      <SettingsSectionTitle>
        {t('orcaFork.workspaceSettings.access.title', 'What each agent may do')}
      </SettingsSectionTitle>
      <p className="text-xs text-muted-foreground">
        {t(
          'orcaFork.workspaceSettings.access.hint',
          'Permissions decide what a bot does without asking you; people it answers come from its connectors.'
        )}
      </p>
      {bots.length === 0 ? (
        <SettingsEmpty>
          {t('orcaFork.workspaceSettings.access.empty', 'No bots in this workspace yet.')}
        </SettingsEmpty>
      ) : (
        bots.map((bot) => (
          <SettingsRow
            key={`${bot.hostId}/${bot.id}`}
            leading={<BotAvatar bot={bot} className="size-9" />}
            title={bot.name}
            detail={
              <>
                <span className="truncate">
                  {agentPermissionChoiceLabel(
                    bot.permissionMode ?? 'own',
                    botAgentLabel(bot.agent),
                    t
                  )}
                </span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">
                  {t('orcaFork.workspaceSettings.access.whoCanAsk', '{{count}} can ask', {
                    count: bot.members.length
                  })}
                </span>
              </>
            }
          >
            <Button variant="ghost" size="sm" onClick={() => open(bot.id, 'permissions')}>
              <ShieldCheck className="size-4" />
              {t('orcaFork.workspaceSettings.access.permissions', 'Permissions')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => open(bot.id, 'who-can-ask')}>
              <Users className="size-4" />
              {t('orcaFork.workspaceSettings.access.people', 'Who can ask')}
            </Button>
          </SettingsRow>
        ))
      )}
    </div>
  )
}
