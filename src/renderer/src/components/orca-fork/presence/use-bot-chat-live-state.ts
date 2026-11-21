// orca-fork: the bot's Chat as the presence reads it: its own status only while fresh and awake, so a
// turn that ended unreported (host restart, slept chat) never leaves the bot "working".
import { useAppStore } from '@/store'
import { useNow } from '@/lib/window-activity/use-now'
import { structuredAgentSessionStatusPaneKey } from '../../../../../shared/agent-session/view/structured-agent-session-tab'
import type { AgentStatusState } from '../../../../../shared/agent-status/contracts/agent-status-types'
import { isFreshNonDoneAgentStatus } from '../../../../../shared/agent-status/contracts/agent-status-freshness'

export function useBotChatLiveState(
  chatSessionId: string | null | undefined
): AgentStatusState | null {
  const now = useNow(60_000)
  const paneKey = chatSessionId ? structuredAgentSessionStatusPaneKey(chatSessionId) : null
  const entry = useAppStore((s) => (paneKey ? s.agentStatusByPaneKey.get(paneKey) : undefined))
  const slept = useAppStore((s) =>
    paneKey ? typeof s.structuredChatSleptAtByPaneKey[paneKey] === 'number' : false
  )
  return entry && !slept && isFreshNonDoneAgentStatus(entry, now) ? entry.state : null
}
