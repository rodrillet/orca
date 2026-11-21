// orca-fork: workspace settings › Members: the owner (their profile and status), then the people the
// workspace's bots answer through their connectors, each with the bots they may ask.
import React, { useMemo } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import {
  OwnerAvatar,
  useOwnerDisplayName,
  useOwnerPresenceLabel
} from '../owner-profile/OwnerAvatar'
import { openOwnerProfile } from '../owner-profile/owner-profile-open'
import { useOwnerProfile } from '../owner-profile/owner-profile-store'
import { useWorkspaceBots } from './use-workspace-bots'
import { SettingsEmpty, SettingsRow, SettingsSectionTitle } from './workspace-settings-rows'

type Person = {
  key: string
  name: string
  avatarUrl: string | null
  source: string
  bots: string[]
}

function initials(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

export function WorkspaceMembersTab(): React.JSX.Element {
  const t = useTranslate()
  const { bots } = useWorkspaceBots()
  const profile = useOwnerProfile()
  const ownerName = useOwnerDisplayName()
  const presenceLabel = useOwnerPresenceLabel(profile.presence)
  const people = useMemo(() => {
    const byKey = new Map<string, Person>()
    for (const bot of bots) {
      for (const member of bot.members) {
        const source = member.source ?? 'slack'
        const key = `${source}:${member.workspaceId ?? ''}:${member.id}`
        const person = byKey.get(key) ?? {
          key,
          name: member.name || member.id,
          avatarUrl: member.avatarUrl ?? null,
          source,
          bots: []
        }
        person.bots.push(bot.name)
        byKey.set(key, person)
      }
    }
    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [bots])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <SettingsSectionTitle>
          {t('orcaFork.workspaceSettings.members.owner', 'Owner')}
        </SettingsSectionTitle>
        <SettingsRow
          leading={<OwnerAvatar className="size-9" />}
          title={ownerName}
          detail={
            <>
              <span>{presenceLabel}</span>
              {profile.status ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{profile.status}</span>
                </>
              ) : null}
            </>
          }
        >
          <Button variant="ghost" size="sm" onClick={openOwnerProfile}>
            <Pencil className="size-4" />
            {t('orcaFork.workspaceSettings.members.editProfile', 'Edit profile')}
          </Button>
        </SettingsRow>
      </div>
      <div className="flex flex-col gap-1">
        <SettingsSectionTitle>
          {t('orcaFork.workspaceSettings.members.people', 'People your agents answer')}
        </SettingsSectionTitle>
        {people.length === 0 ? (
          <SettingsEmpty>
            {t(
              'orcaFork.workspaceSettings.members.empty',
              'Only you for now. People join when a bot lets them ask through Slack or Linear (Access › Who can ask).'
            )}
          </SettingsEmpty>
        ) : (
          people.map((person) => (
            <SettingsRow
              key={person.key}
              leading={
                person.avatarUrl ? (
                  <img src={person.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                ) : (
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold"
                  >
                    {initials(person.name)}
                  </span>
                )
              }
              title={person.name}
              detail={
                <span className="truncate">
                  {t(
                    'orcaFork.workspaceSettings.members.canAsk',
                    'Via {{source}} · asks {{bots}}',
                    {
                      source: person.source === 'linear' ? 'Linear' : 'Slack',
                      bots: person.bots.join(', ')
                    }
                  )}
                </span>
              }
            />
          ))
        )}
      </div>
    </div>
  )
}
