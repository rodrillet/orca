// orca-fork: token saving for Claude Code started in an Orca terminal (workers, the + menu, resumes):
// a plugin dir on CLAUDE_CODE_PLUGIN_DIRS whose SessionStart hook loads Caveman's voice and whose
// .mcp.json registers the caveman MCP, plus the proxy route while the proxy is known healthy.
import { mkdirSync, writeFileSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { FORK_FEATURES } from '../../../shared/orca-fork/fork-features'
import { cavemanBinary } from './caveman-install'
import { cavemanProxyForLaunch, lastKnownCavemanProxyUrl } from './caveman-proxy'
import { CAVEMAN_VOICE_RULES } from './caveman-voice-rules'
import { tokenSavingHostPolicy } from './token-saving-host-policy'
import {
  claudeProxyEnv,
  TERMINAL_TOKEN_SAVING_SLUG,
  watchTokenSavingProxy
} from './token-saving-launch'

const PLUGIN_NAME = 'orca-token-saving'

let written: { root: string; key: string } | null = null

function pluginFiles(mcp: string | null): Record<string, string> {
  const rules = 'caveman-voice.md'
  // SessionStart stdout becomes context; the shell runs the hook, so cat/type read the rules file.
  const read =
    process.platform === 'win32'
      ? 'type "${CLAUDE_PLUGIN_ROOT}\\caveman-voice.md"'
      : 'cat "${CLAUDE_PLUGIN_ROOT}/caveman-voice.md"'
  return {
    '.claude-plugin/plugin.json': JSON.stringify({
      name: PLUGIN_NAME,
      version: '1.0.0',
      description: "Orca's token saving: Caveman's terse voice and its MCP server",
      author: { name: 'rodrillet/orca' }
    }),
    'hooks/hooks.json': JSON.stringify({
      hooks: {
        SessionStart: [{ hooks: [{ type: 'command', command: read }] }]
      }
    }),
    [rules]: CAVEMAN_VOICE_RULES,
    ...(mcp
      ? { '.mcp.json': JSON.stringify({ mcpServers: { caveman: { command: mcp, args: [] } } }) }
      : {})
  }
}

function ensurePlugin(userDataPath: string): string {
  const mcp = cavemanBinary('caveman-mcp')
  const files = pluginFiles(mcp)
  const key = JSON.stringify(files)
  const root = join(userDataPath, 'orca-fork', 'token-saving', PLUGIN_NAME)
  if (written?.root === root && written.key === key) {
    return root
  }
  for (const [path, content] of Object.entries(files)) {
    const file = join(root, path)
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, content, 'utf8')
  }
  written = { root, key }
  return root
}

/** Adds token saving to a local terminal's environment; a failure leaves the terminal as it was. */
export function applyTokenSavingTerminalEnv(
  env: Record<string, string>,
  userDataPath: string
): void {
  if (!FORK_FEATURES.tokenSaving || process.env.VITEST) {
    return
  }
  try {
    const policy = tokenSavingHostPolicy()
    if (!policy.enabled) {
      return
    }
    watchTokenSavingProxy()
    const root = ensurePlugin(userDataPath)
    const paths = (env.CLAUDE_CODE_PLUGIN_DIRS ?? process.env.CLAUDE_CODE_PLUGIN_DIRS ?? '')
      .split(delimiter)
      .filter(Boolean)
    if (!paths.includes(root)) {
      paths.push(root)
    }
    env.CLAUDE_CODE_PLUGIN_DIRS = paths.join(delimiter)
    // The shell keeps this env for its life, so only a proxy known healthy now is used; the
    // watchdog keeps Orca's proxy up while Orca runs.
    const proxyUrl = lastKnownCavemanProxyUrl()
    void cavemanProxyForLaunch(policy.proxyMode)
    Object.assign(env, claudeProxyEnv(proxyUrl, TERMINAL_TOKEN_SAVING_SLUG)(env))
  } catch (error) {
    console.warn('[token-saving] terminal setup skipped', error)
  }
}
