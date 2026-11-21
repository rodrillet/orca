// orca-fork: what token saving adds to a Claude Code or Codex launch on this host: Caveman's voice in
// its instructions, the caveman MCP server, and (Claude) its model traffic through the local proxy
// when that proxy is healthy. Any failure here launches the agent exactly as upstream would.
import type { AgentSessionRecord } from '../../../shared/agent-session/lifecycle/agent-session-record'
import type { BotToolServer } from '../../../shared/bot-tools'
import { FORK_FEATURES } from '../../../shared/orca-fork/fork-features'
import { hostPolicyEnables } from '../../../shared/orca-fork/token-saving/token-saving'
import { cavemanBinary } from './caveman-install'
import { cavemanProxyForLaunch } from './caveman-proxy'
import { CAVEMAN_VOICE_RULES } from './caveman-voice-rules'
import { tokenSavingHostPolicy } from './token-saving-host-policy'

const SAVING_AGENTS: ReadonlySet<string> = new Set(['claude', 'codex'])

/** Billing lanes Claude Code sends past ANTHROPIC_BASE_URL; the proxy can't serve them. */
const CLAUDE_OFF_PROXY_LANES = [
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
  'CLAUDE_CODE_USE_MANTLE'
]

const LOOPBACK_HOSTS = ['127.0.0.1', 'localhost', '::1']

let botOfRecord: (record: AgentSessionRecord) => string | null = () => null

/** The bot host names which bot a session belongs to; set once its bots are wired. */
export function setTokenSavingBotResolver(
  resolve: (record: AgentSessionRecord) => string | null
): void {
  botOfRecord = resolve
}

/** The proxy route's agent slug: one per bot so savings read per bot, `orca` for anything else. */
export function tokenSavingSlug(botId: string | null): string {
  if (!botId) {
    return 'orca'
  }
  const cleaned = botId
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
  return `orca-${cleaned}`.slice(0, 64).replace(/[^a-z0-9]+$/, '') || 'orca'
}

export type TokenSavingLaunch = {
  instructions: string
  mcpServer: BotToolServer | null
  /** Laid over the agent's environment; never replaces a route the owner set. */
  env: (agentEnv: Record<string, string>) => Record<string, string>
}

function enabledFor(record: AgentSessionRecord): { on: boolean; botId: string | null } {
  let botId: string | null = null
  try {
    botId = botOfRecord(record)
  } catch {
    botId = null
  }
  return { on: hostPolicyEnables(tokenSavingHostPolicy(), botId), botId }
}

function withLoopbackNoProxy(env: Record<string, string>): Record<string, string> {
  const existing = [env.NO_PROXY, env.no_proxy]
    .flatMap((value) => (value ?? '').split(','))
    .map((entry) => entry.trim())
    .filter(Boolean)
  const noProxy = [...new Set([...existing, ...LOOPBACK_HOSTS])].join(',')
  return { NO_PROXY: noProxy, no_proxy: noProxy }
}

function claudeProxyEnv(
  proxyUrl: string | null,
  slug: string
): (agentEnv: Record<string, string>) => Record<string, string> {
  return (agentEnv) => {
    const offLane = CLAUDE_OFF_PROXY_LANES.some((key) => {
      const value = agentEnv[key]?.trim().toLowerCase()
      return value !== undefined && value !== '' && value !== '0' && value !== 'false'
    })
    if (!proxyUrl || agentEnv.ANTHROPIC_BASE_URL || offLane) {
      return agentEnv
    }
    return {
      ...agentEnv,
      ANTHROPIC_BASE_URL: `${proxyUrl}/w/${slug}`,
      // The proxy forwards to api.anthropic.com byte-safe, so Claude keeps its first-party
      // features (1M context) and tool search, which a custom base URL would turn off.
      _CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL:
        agentEnv._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL ?? '1',
      ENABLE_TOOL_SEARCH: agentEnv.ENABLE_TOOL_SEARCH ?? 'true',
      ...withLoopbackNoProxy(agentEnv)
    }
  }
}

/** Null when token saving is off for this launch (or for this agent). */
export async function tokenSavingForLaunch(
  agent: string,
  record: AgentSessionRecord
): Promise<TokenSavingLaunch | null> {
  if (!FORK_FEATURES.tokenSaving || !SAVING_AGENTS.has(agent)) {
    return null
  }
  try {
    const { on, botId } = enabledFor(record)
    if (!on) {
      return null
    }
    const mcp = cavemanBinary('caveman-mcp')
    // Codex threads are bound to their model provider, so moving one to the proxy could strand
    // its history; Codex gets the voice and the MCP server only.
    const proxyUrl =
      agent === 'claude' ? await cavemanProxyForLaunch(tokenSavingHostPolicy().proxyMode) : null
    return {
      instructions: CAVEMAN_VOICE_RULES,
      mcpServer: mcp ? { name: 'caveman', command: mcp, args: [] } : null,
      env: agent === 'claude' ? claudeProxyEnv(proxyUrl, tokenSavingSlug(botId)) : (env) => env
    }
  } catch (error) {
    console.warn('[token-saving] launch decoration skipped', error)
    return null
  }
}

/** The instructions a launch carries with Caveman's voice added after them. */
export function withTokenSavingInstructions(
  instructions: string | null,
  saving: TokenSavingLaunch | null
): string | null {
  if (!saving) {
    return instructions
  }
  return instructions ? `${instructions}\n\n${saving.instructions}` : saving.instructions
}
