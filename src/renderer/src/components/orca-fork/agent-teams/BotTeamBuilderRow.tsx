// orca-fork: Bot settings › "Can build a team" and its daily cap. Hidden on a host whose server has
// no agent teams.
import { useCallback, useEffect, useState } from 'react'
import { Gauge, UsersRound } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useTranslate } from '@/i18n/use-translate'
import { callBotRpc, type BotRef } from '@/lib/bot-hosts'
import type { Bot } from '../../../../../shared/bot-types'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  AGENT_TEAMS_GET_METHOD,
  AGENT_TEAMS_SET_METHOD,
  type AgentTeamSettings,
  type AgentTeamView
} from '../../../../../shared/orca-fork/agent-teams'
import { SettingsInsetRow } from '../../bots/settings-view/BotSettingsRows'

const CAPS = [1, 2, 3, 5, 10, 20] as const

export function BotTeamBuilderRow({ bot }: { bot: Bot }): React.JSX.Element | null {
  const t = useTranslate()
  const [team, setTeam] = useState<AgentTeamView | null>(null)
  const { id, hostId } = bot
  useEffect(() => {
    let live = true
    const ref: BotRef = { id, hostId }
    setTeam(null)
    callBotRpc<AgentTeamView>(ref, AGENT_TEAMS_GET_METHOD, { botId: id })
      .then((view) => live && setTeam(view))
      .catch(() => live && setTeam(null))
    return () => {
      live = false
    }
  }, [id, hostId])
  const save = useCallback(
    (previous: AgentTeamView, changes: Partial<AgentTeamSettings>) => {
      const ref: BotRef = { id, hostId }
      const next = { ...previous, ...changes }
      setTeam(next)
      void callBotRpc<AgentTeamView>(ref, AGENT_TEAMS_SET_METHOD, {
        botId: id,
        teamBuilder: next.teamBuilder,
        dailyCap: next.dailyCap
      })
        .then(setTeam)
        .catch(() => setTeam(previous))
    },
    [id, hostId]
  )
  if (!FORK_FEATURES.agentTeams || !team) {
    return null
  }
  const title = t('orcaFork.teams.builder', 'Can build a team')
  const capTitle = t('orcaFork.teams.dailyCap', 'Bots it may create a day')
  const caps: readonly number[] = CAPS.includes(team.dailyCap as (typeof CAPS)[number])
    ? CAPS
    : [...CAPS, team.dailyCap].toSorted((left, right) => left - right)
  return (
    <>
      <SettingsInsetRow
        icon={<UsersRound />}
        title={title}
        detail={t(
          'orcaFork.teams.builderDetail',
          'Creates the bots it proposes without asking you and shares a group with them, where the team hands work to each other without your approval.'
        )}
        wrapDetail
        end={
          <Switch
            checked={team.teamBuilder}
            aria-label={title}
            onCheckedChange={(teamBuilder) => save(team, { teamBuilder })}
          />
        }
      />
      {team.teamBuilder ? (
        <SettingsInsetRow
          icon={<Gauge />}
          title={capTitle}
          detail={t('orcaFork.teams.createdToday', 'Created in the last 24 hours: {{created}}', {
            created: team.createdToday
          })}
          end={
            <Select
              value={String(team.dailyCap)}
              onValueChange={(value) => save(team, { dailyCap: Number(value) })}
            >
              <SelectTrigger size="sm" aria-label={capTitle} className="w-[72px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {caps.map((cap) => (
                  <SelectItem key={cap} value={String(cap)}>
                    {cap}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      ) : null}
    </>
  )
}
