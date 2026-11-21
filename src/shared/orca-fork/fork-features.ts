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
  botOrganization: true,
  /** Phase 4: a bot the owner lets build a team creates bots from its own offers. */
  agentTeams: true,
  /** Group by Machine in the workspace sidebar: one section per machine, projects inside. */
  workspacesGroupByMachine: true,
  /** "Move to…" in a bot row's menu, listing departments and sections. */
  botMoveToMenu: true,
  /** agentes.chat-style Workspaces at the top of the sidebar; data is keyed by workspace id. */
  workspaces: true,
  /** The Agent Dashboard on by default, opening on a Kanban of every bot's items and workers. */
  agentsBoard: true,
  /** A bot group's own photo in the sidebar and its header, instead of its members' faces. */
  groupPhotos: true,
  /** Status-bar "Machines": memory, CPU, disk and agent processes of this computer and each paired server. */
  resourceMonitor: true,
  /** `#group` in any chat: `#` lists the bot groups, and a sent `#name` opens its group. */
  groupMentions: true
} as const
