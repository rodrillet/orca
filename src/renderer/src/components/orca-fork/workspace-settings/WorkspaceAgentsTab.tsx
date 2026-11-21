// orca-fork: workspace settings › Agents: its bots with presence and what they run, its bot groups, and
// New bot on the workspace's machine.
import React, { useState } from 'react'
import { MessageSquare, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { openBotHome } from '@/lib/bot-catalog'
import { openBotGroup } from '@/lib/bot-group-catalog'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { NewBotDialog } from '@/components/bots/NewBotDialog'
import { openBotSettings } from '@/components/bots/bot-settings-open'
import { botAgentLabel } from '@/components/bots/bot-presentation'
import { useForkBotPresence, usePresenceLabel } from '../presence/ForkBotPresenceDot'
import { useActiveForkWorkspace } from '../workspaces/fork-workspaces-store'
import type { Bot } from '../../../../../shared/bot-types'
import { ForkGroupPicture } from '../group-photos/ForkGroupPicture'
import { ForkGroupInitials } from './workspace-group-picture'
import { useWorkspaceBots } from './use-workspace-bots'
import { closeWorkspaceSettings } from './workspace-settings-open'
import { SettingsEmpty, SettingsRow, SettingsSectionTitle } from './workspace-settings-rows'

function PresenceText({ bot }: { bot: Bot }): React.JSX.Element | null {
  const presence = useForkBotPresence(bot)
  const label = usePresenceLabel(presence ?? 'off')
  return presence ? <span>{label}</span> : null
}

export function WorkspaceAgentsTab(): React.JSX.Element {
  const t = useTranslate()
  const workspace = useActiveForkWorkspace()
  const { bots, groups } = useWorkspaceBots()
  const [newBotOpen, setNewBotOpen] = useState(false)
  const open = (run: () => unknown): void => {
    closeWorkspaceSettings()
    run()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <SettingsSectionTitle>
          {t('orcaFork.workspaceSettings.agents.title', 'Agents in this workspace')}
        </SettingsSectionTitle>
        <Button size="sm" onClick={() => setNewBotOpen(true)}>
          <Plus className="size-4" />
          {t('orcaFork.workspaceSettings.agents.new', 'New bot')}
        </Button>
      </div>
      {bots.length === 0 ? (
        <SettingsEmpty>
          {t(
            'orcaFork.workspaceSettings.agents.empty',
            'No bots here yet. New bot creates one on this workspace’s machine.'
          )}
        </SettingsEmpty>
      ) : (
        <div className="flex flex-col">
          {bots.map((bot) => (
            <SettingsRow
              key={`${bot.hostId}/${bot.id}`}
              leading={<BotAvatar bot={bot} className="size-9" />}
              title={bot.name}
              detail={
                <>
                  <PresenceText bot={bot} />
                  <span aria-hidden="true">·</span>
                  <span>{botAgentLabel(bot.agent)}</span>
                  {bot.paused ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{t('orcaFork.workspaceSettings.agents.paused', 'Paused')}</span>
                    </>
                  ) : null}
                </>
              }
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('orcaFork.workspaceSettings.agents.openChat', 'Open chat')}
                title={t('orcaFork.workspaceSettings.agents.openChat', 'Open chat')}
                onClick={() => open(() => openBotHome(bot))}
              >
                <MessageSquare className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('orcaFork.workspaceSettings.agents.settings', 'Bot settings')}
                title={t('orcaFork.workspaceSettings.agents.settings', 'Bot settings')}
                onClick={() => open(() => openBotSettings(bot.id))}
              >
                <Settings className="size-4" />
              </Button>
            </SettingsRow>
          ))}
        </div>
      )}
      {groups.length > 0 ? (
        <div className="flex flex-col gap-2">
          <SettingsSectionTitle>
            {t('orcaFork.workspaceSettings.agents.groups', 'Groups')}
          </SettingsSectionTitle>
          {groups.map((group) => (
            <SettingsRow
              key={`${group.hostId}/${group.id}`}
              leading={
                <ForkGroupPicture groupId={group.id} className="size-9">
                  <ForkGroupInitials name={group.name} className="size-9" />
                </ForkGroupPicture>
              }
              title={group.name}
              detail={t('orcaFork.workspaceSettings.agents.groupMembers', '{{count}} members', {
                count: group.members.length
              })}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('orcaFork.workspaceSettings.agents.openChat', 'Open chat')}
                title={t('orcaFork.workspaceSettings.agents.openChat', 'Open chat')}
                onClick={() => open(() => void openBotGroup(group))}
              >
                <MessageSquare className="size-4" />
              </Button>
            </SettingsRow>
          ))}
        </div>
      ) : null}
      {newBotOpen ? (
        <NewBotDialog
          open
          hosts={[workspace.hostId]}
          onOpenChange={(next) => !next && setNewBotOpen(false)}
        />
      ) : null}
    </div>
  )
}
