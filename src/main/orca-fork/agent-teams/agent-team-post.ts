// orca-fork: `orca bot team post`: a team member posts in its team's room as itself, so teammates it
// @mentions take the work without waiting for the owner.
import { randomUUID } from 'node:crypto'
import { isBotGroupMemberSession } from '../../../shared/bots/bot-group'
import type { Bot } from '../../../shared/bot-types'
import { FORK_FEATURES } from '../../../shared/orca-fork/fork-features'
import { runtimeBotGroups } from '../../bots/bot-group-runtime'
import { sendBotGroupMessage } from '../../bots/bot-group-delivery'
import { botOfSession } from '../../bots/bot-session-tabs'
import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import { agentTeamStore } from './agent-team-store'

/** Posts a team's bots may make in their room per 24 hours, so two bots can't loop forever. */
export const TEAM_POSTS_PER_DAY = 60
const DAY = 24 * 60 * 60 * 1000
const posts = new Map<string, number[]>()

function callerBot(runtime: OrcaRuntimeService, sessionId: string): Bot | null {
  if (isBotGroupMemberSession(sessionId)) {
    const botId = runtimeBotGroups(runtime).store.memberOf(sessionId)?.member.botId
    return runtime.bots.list().find((bot) => bot.id === botId) ?? null
  }
  return botOfSession(runtime.bots, sessionId)
}

export async function postInTeamRoom(
  runtime: OrcaRuntimeService,
  input: { callerSessionId: string; text: string; team?: string }
): Promise<{ groupName: string; messageId: string }> {
  runtime.bots.assertEnabled()
  if (!FORK_FEATURES.agentTeams) {
    throw new Error('Agent teams are off in this build.')
  }
  const bot = callerBot(runtime, input.callerSessionId)
  if (!bot) {
    throw new Error("Run this from a bot's chat.")
  }
  const groups = runtimeBotGroups(runtime)
  const listing = groups.store.listing()
  const rooms = (await agentTeamStore().autonomousGroups())
    .map((entry) => ({ ...entry, group: listing.find((group) => group.id === entry.groupId) }))
    .filter(
      (entry) =>
        entry.group?.members.some((member) => member.botId === bot.id) &&
        (input.team === undefined || entry.group.name.toLowerCase() === input.team.toLowerCase())
    )
  // Its own team first when it leads one.
  const room = rooms.find((entry) => entry.leadId === bot.id) ?? rooms[0]
  if (!room?.group) {
    throw new Error(
      "You aren't in a team whose lead may build a team, so ask your teammates with `orca orchestration send --to bot:<name> --type handoff` instead."
    )
  }
  const now = Date.now()
  const recent = (posts.get(room.groupId) ?? []).filter((at) => now - at < DAY)
  if (recent.length >= TEAM_POSTS_PER_DAY) {
    throw new Error(
      `Your team posted ${TEAM_POSTS_PER_DAY} times in its room today; wait or ask your owner.`
    )
  }
  const message = await sendBotGroupMessage(
    groups,
    {
      groupId: room.group.id,
      revision: room.group.revision,
      messageId: randomUUID(),
      text: input.text
    },
    { kind: 'bot', id: bot.id, name: bot.name }
  )
  posts.set(room.groupId, [...recent, now])
  return { groupName: room.group.name, messageId: message.id }
}
