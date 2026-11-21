// orca-fork: token saving (Caveman) for every agent Orca launches, set at global > workspace >
// department > bot level. Each level may be unset, which inherits the next one up; nothing set is on.

export const TOKEN_SAVING_VERSION = 1

/** On when no level says otherwise: the owner wants every agent to save tokens by default. */
export const TOKEN_SAVING_DEFAULT = true

export type TokenSavingSource = 'bot' | 'department' | 'workspace' | 'global' | 'default'

/** One level's choice; undefined (absent) inherits. */
export type TokenSavingChoice = boolean | undefined

export type TokenSavingLevels = {
  bot?: TokenSavingChoice
  department?: TokenSavingChoice
  workspace?: TokenSavingChoice
  global?: TokenSavingChoice
}

export type ResolvedTokenSaving = { enabled: boolean; source: TokenSavingSource }

/** The nearest level that chose wins: bot, then its department, its workspace, then global. */
export function resolveTokenSaving(levels: TokenSavingLevels): ResolvedTokenSaving {
  for (const source of ['bot', 'department', 'workspace', 'global'] as const) {
    const choice = levels[source]
    if (typeof choice === 'boolean') {
      return { enabled: choice, source }
    }
  }
  return { enabled: TOKEN_SAVING_DEFAULT, source: 'default' }
}

/** How the proxy treats traffic: `compress` shrinks eligible context, `record` only measures it. */
export type TokenSavingProxyMode = 'compress' | 'record'

/**
 * The desktop's settings, in userData/orca-fork/token-saving.json. Departments keep their own
 * choice in the departments document (`forkDepartmentTokenSaving`), so they are not repeated here.
 */
export type TokenSavingSettings = {
  version: typeof TOKEN_SAVING_VERSION
  revision: number
  global: TokenSavingChoice
  /** Keyed by `ForkWorkspaceId`. */
  workspaces: Record<string, boolean>
  /** Keyed by the bot's sidebar entry key `hostId/botId`. */
  bots: Record<string, boolean>
  proxyMode: TokenSavingProxyMode
}

export function emptyTokenSavingSettings(): TokenSavingSettings {
  return {
    version: TOKEN_SAVING_VERSION,
    revision: 0,
    global: undefined,
    workspaces: {},
    bots: {},
    proxyMode: 'compress'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function readChoices(value: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  for (const [key, choice] of Object.entries(readRecord(value))) {
    if (typeof choice === 'boolean' && key.length > 0 && key.length <= 256) {
      out[key] = choice
    }
  }
  return out
}

function readProxyMode(value: unknown): TokenSavingProxyMode {
  return value === 'record' ? 'record' : 'compress'
}

export function normalizeTokenSavingSettings(raw: unknown): TokenSavingSettings {
  const doc = readRecord(raw)
  return {
    version: TOKEN_SAVING_VERSION,
    revision: typeof doc.revision === 'number' && Number.isFinite(doc.revision) ? doc.revision : 0,
    global: typeof doc.global === 'boolean' ? doc.global : undefined,
    workspaces: readChoices(doc.workspaces),
    bots: readChoices(doc.bots),
    proxyMode: readProxyMode(doc.proxyMode)
  }
}

/**
 * What one host applies to the agents it launches, resolved by the desktop (which knows the
 * workspaces and departments) and kept by the host so it holds while the desktop is closed.
 */
export type TokenSavingHostPolicy = {
  /** For launches that belong to no bot (workers, plain chats, automations without a bot). */
  enabled: boolean
  /** Resolved per bot id on that host; a bot missing here uses `enabled`. */
  bots: Record<string, boolean>
  proxyMode: TokenSavingProxyMode
  updatedAt: number
}

export function defaultTokenSavingHostPolicy(): TokenSavingHostPolicy {
  return { enabled: TOKEN_SAVING_DEFAULT, bots: {}, proxyMode: 'compress', updatedAt: 0 }
}

export function normalizeTokenSavingHostPolicy(raw: unknown): TokenSavingHostPolicy {
  const doc = readRecord(raw)
  return {
    enabled: typeof doc.enabled === 'boolean' ? doc.enabled : TOKEN_SAVING_DEFAULT,
    bots: readChoices(doc.bots),
    proxyMode: readProxyMode(doc.proxyMode),
    updatedAt:
      typeof doc.updatedAt === 'number' && Number.isFinite(doc.updatedAt) ? doc.updatedAt : 0
  }
}

/** Whether a launch on a host saves tokens: its bot's resolved choice, else the host's. */
export function hostPolicyEnables(policy: TokenSavingHostPolicy, botId: string | null): boolean {
  return botId !== null && typeof policy.bots[botId] === 'boolean'
    ? policy.bots[botId]
    : policy.enabled
}
