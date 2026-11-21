// orca-fork: one presence for a bot everywhere its picture shows (sidebar, chats, groups, mentions).
import type { WorktreeStatus } from '../../worktree/row-display/worktree-status-rollup'

/** working: an agent is on a turn · idle: loaded, waiting · blocked: stopped, failed or waiting on its
 *  owner · off: nothing loaded, using no memory. */
export type BotPresence = 'working' | 'idle' | 'blocked' | 'off'

export function botPresence({
  status,
  paused,
  offline,
  sleeping,
  blocked = false
}: {
  status: WorktreeStatus | null
  paused: boolean
  offline: boolean
  sleeping: boolean
  /** Stopped for a reason its home's panes don't show (a usage limit). */
  blocked?: boolean
}): BotPresence {
  if (offline) {
    return 'off'
  }
  if (paused || blocked || status === 'permission' || status === 'failed') {
    return 'blocked'
  }
  if (status === 'working' || status === 'monitoring') {
    return 'working'
  }
  if (status === null || status === 'inactive' || sleeping) {
    return 'off'
  }
  return 'idle'
}
