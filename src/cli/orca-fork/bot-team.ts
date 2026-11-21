// orca-fork: `orca bot team post`: a team member posts in its team's room, mentioning the teammates
// who should take the work.
import { readInjectedAgentSessionId } from '../../shared/agent-session/lifecycle/launch/agent-session-caller-env'
import { AGENT_TEAMS_POST_METHOD } from '../../shared/orca-fork/agent-teams'
import type { CommandHandler } from '../dispatch/dispatch'
import { getOptionalStringFlag, getRequiredStringFlag } from '../arguments/flags'
import { printResult } from '../output/command-result-output'
import { RuntimeClientError } from '../runtime/connection/types'
import { callBots } from '../bots/bot'

export const BOT_TEAM_HANDLERS: Record<string, CommandHandler> = {
  'bot team post': async ({ flags, client, json }) => {
    const callerSessionId = readInjectedAgentSessionId()
    if (!callerSessionId) {
      throw new RuntimeClientError('invalid_argument', "Run this from a bot's chat.")
    }
    const team = getOptionalStringFlag(flags, 'team')
    const result = await callBots<{ messageId: string; message: string }>(
      client,
      AGENT_TEAMS_POST_METHOD,
      { callerSessionId, text: getRequiredStringFlag(flags, 'text'), ...(team ? { team } : {}) }
    )
    printResult(result, json, (value) => value.message)
  }
}
