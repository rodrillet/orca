// orca-fork: token saving over RPC; each host (this computer or a paired fork orca-server) answers
// for its own Caveman proxy, its launch policy and the savings its proxy recorded.
import * as z from 'zod'

export const TOKEN_SAVING_STATUS_METHOD = 'orcaFork.tokenSaving.status'
export const TOKEN_SAVING_SET_POLICY_METHOD = 'orcaFork.tokenSaving.setPolicy'
export const TOKEN_SAVING_PROXY_METHOD = 'orcaFork.tokenSaving.proxy'

export const TokenSavingStatusParams = z
  .object({ days: z.number().int().min(1).max(365).optional() })
  .strict()
  .optional()

const ProxyMode = z.enum(['compress', 'record'])

export const TokenSavingSetPolicyParams = z
  .object({
    enabled: z.boolean(),
    bots: z.record(z.string().min(1).max(256), z.boolean()),
    proxyMode: ProxyMode
  })
  .strict()

export const TokenSavingProxyParams = z
  .object({ action: z.enum(['start', 'stop', 'restart']) })
  .strict()

export type TokenSavingProxyState =
  /** Caveman's binaries are not on this machine. */
  | 'not_installed'
  /** Installed, nothing answers on its address. */
  | 'stopped'
  | 'running'
  /** Something answers on the address but isn't a healthy Caveman proxy. */
  | 'unhealthy'

export type TokenSavingTotals = {
  requests: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  /** Context tokens the proxy removed from requests before they reached the model (its own count). */
  savedTokens: number
}

export type TokenSavingAgentStats = TokenSavingTotals & {
  /** The proxy route's agent slug (`orca-<bot>` for a bot, `orca` for any other launch). */
  slug: string
  /** The bot the slug names on this host; null for launches that belong to no bot. */
  botId: string | null
  lastAt: string | null
}

export type TokenSavingStatus = {
  installed: boolean
  binDirectory: string
  proxy: {
    state: TokenSavingProxyState
    url: string
    /** The mode Orca started it with; null when Orca didn't start it. */
    mode: 'compress' | 'record' | null
    /** Orca started this proxy and can stop it. */
    managed: boolean
  }
  mcpInstalled: boolean
  policy: {
    enabled: boolean
    bots: Record<string, boolean>
    proxyMode: 'compress' | 'record'
    updatedAt: number
  }
  /** Over the asked window; null when the proxy never recorded anything here. */
  stats: { days: number; total: TokenSavingTotals; agents: TokenSavingAgentStats[] } | null
}

export type TokenSavingProxyResult = { ok: boolean; status: TokenSavingStatus; error?: string }
