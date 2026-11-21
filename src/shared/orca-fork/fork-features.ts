// orca-fork: rodrillet/orca feature switches; upstream never edits this file, so merges keep it.

export const FORK_REPOSITORY = 'rodrillet/orca'

export const FORK_FEATURES = {
  /** Upstream's updater would replace the custom build (and a paired fork server) with a stock one. */
  upstreamUpdater: false,
  /** A bot's chat rows in the sidebar show their last message under the title, as agentes.chat's. */
  sidebarChatPreviews: true,
  /** A bot's row counts its unread chats. */
  sidebarUnreadChatCount: true,
  /** "Change photo…" in a bot's row menu. */
  sidebarChangePhoto: true,
  /** Tasks page "Agents" view: every bot on every paired machine, its items and its workers' PRs. */
  agentsInTasks: true,
  /** Departments > Sections and Group by machine in the Bots sidebar (Phase 2). */
  botOrganization: true
} as const
