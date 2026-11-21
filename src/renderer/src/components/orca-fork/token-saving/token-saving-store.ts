// orca-fork: the desktop's token-saving choices and how one bot resolves them
// (bot > department > workspace > global, on when nothing chose).
import {
  emptyTokenSavingSettings,
  normalizeTokenSavingSettings,
  resolveTokenSaving,
  type ResolvedTokenSaving,
  type TokenSavingChoice,
  type TokenSavingSettings
} from '../../../../../shared/orca-fork/token-saving/token-saving'
import {
  forkWorkspaceHomeOf,
  forkWorkspaceOfItem,
  type ForkWorkspacesDocument
} from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import type { BotOrganization } from '../../../../../shared/orca-fork/organization/bot-organization'
import { forkDepartmentTokenSaving } from '../departments/department-token-saving'
import { createForkDocumentStore } from '../fork-document-store'

export const tokenSavingStore = createForkDocumentStore<TokenSavingSettings>({
  storageKey: 'orca-fork:token-saving',
  empty: () => emptyTokenSavingSettings(),
  normalize: (raw) => normalizeTokenSavingSettings(raw),
  bridge: () => window.api?.orcaForkTokenSaving
})

export function useTokenSavingSettings(): TokenSavingSettings {
  return tokenSavingStore.use()
}

function withChoice(
  map: Record<string, boolean>,
  key: string,
  choice: TokenSavingChoice
): Record<string, boolean> {
  const next = { ...map }
  if (choice === undefined) {
    delete next[key]
  } else {
    next[key] = choice
  }
  return next
}

export const tokenSavingEdits = {
  global: (choice: TokenSavingChoice) =>
    tokenSavingStore.edit((doc) => ({ ...doc, global: choice })),
  workspace: (workspaceId: string, choice: TokenSavingChoice) =>
    tokenSavingStore.edit((doc) => ({
      ...doc,
      workspaces: withChoice(doc.workspaces, workspaceId, choice)
    })),
  bot: (botKey: string, choice: TokenSavingChoice) =>
    tokenSavingStore.edit((doc) => ({ ...doc, bots: withChoice(doc.bots, botKey, choice) })),
  proxyMode: (proxyMode: TokenSavingSettings['proxyMode']) =>
    tokenSavingStore.edit((doc) => ({ ...doc, proxyMode }))
}

export function resolveBotTokenSaving(
  settings: TokenSavingSettings,
  workspaces: ForkWorkspacesDocument,
  organization: BotOrganization,
  bot: { hostId: ExecutionHostId; botKey: string }
): ResolvedTokenSaving {
  const workspace = forkWorkspaceOfItem(workspaces, bot.hostId, { botKey: bot.botKey })
  return resolveTokenSaving({
    bot: settings.bots[bot.botKey],
    department: forkDepartmentTokenSaving(bot.botKey, organization),
    workspace: workspace ? settings.workspaces[workspace.id] : undefined,
    global: settings.global
  })
}

/** For a machine's launches that belong to no bot: its home workspace's choice, else global. */
export function resolveHostTokenSaving(
  settings: TokenSavingSettings,
  workspaces: ForkWorkspacesDocument,
  hostId: ExecutionHostId
): ResolvedTokenSaving {
  const home = forkWorkspaceHomeOf(workspaces, hostId)
  return resolveTokenSaving({
    workspace: home ? settings.workspaces[home.id] : undefined,
    global: settings.global
  })
}
