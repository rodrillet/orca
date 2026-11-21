// orca-fork: token saving for Claude Code started in an Orca terminal (workers, the + menu, resumes):
// a plugin dir on CLAUDE_CODE_PLUGIN_DIRS whose SessionStart hook loads Caveman's voice and whose
// .mcp.json registers the caveman MCP, plus the proxy route while the proxy is known healthy.
import { mkdir, writeFile } from 'node:fs/promises'
import { delimiter, dirname, join } from 'node:path'
import { FORK_FEATURES } from '../../../shared/orca-fork/fork-features'
import { findCavemanBinary } from './caveman-install'
import { cavemanProxyForLaunch, lastKnownCavemanProxyUrl } from './caveman-proxy'
import { CAVEMAN_VOICE_RULES } from './caveman-voice-rules'
import { loadTokenSavingHostPolicy, tokenSavingHostPolicy } from './token-saving-host-policy'
import { claudeProxyEnv, TERMINAL_TOKEN_SAVING_SLUG } from './token-saving-launch'

const PLUGIN_NAME = 'orca-token-saving'

/** The plugin dir once written with its current files; null until then. */
let ready: string | null = null
let preparing: Promise<void> | null = null

function pluginFiles(mcp: string | null): Record<string, string> {
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
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: read }] }] }
    }),
    'caveman-voice.md': CAVEMAN_VOICE_RULES,
    ...(mcp
      ? { '.mcp.json': JSON.stringify({ mcpServers: { caveman: { command: mcp, args: [] } } }) }
      : {})
  }
}

/** Writes the plugin (and reads the policy) off the spawn path; the next terminal gets it. */
function preparePlugin(userDataPath: string): void {
  preparing ??= (async () => {
    await loadTokenSavingHostPolicy()
    const root = join(userDataPath, 'orca-fork', 'token-saving', PLUGIN_NAME)
    const files = pluginFiles(await findCavemanBinary('caveman-mcp'))
    for (const [path, content] of Object.entries(files)) {
      const file = join(root, path)
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, content, 'utf8')
    }
    ready = root
  })()
    .catch((error: unknown) => console.warn('[token-saving] terminal plugin not written', error))
    .finally(() => {
      preparing = null
    })
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
    if (!ready) {
      preparePlugin(userDataPath)
    }
    const policy = tokenSavingHostPolicy()
    if (!policy.enabled || !ready) {
      return
    }
    const paths = (env.CLAUDE_CODE_PLUGIN_DIRS ?? process.env.CLAUDE_CODE_PLUGIN_DIRS ?? '')
      .split(delimiter)
      .filter(Boolean)
    if (!paths.includes(ready)) {
      paths.push(ready)
    }
    env.CLAUDE_CODE_PLUGIN_DIRS = paths.join(delimiter)
    // The shell keeps this env for its life, so only a proxy known healthy now is used; the read
    // below also restarts a proxy that died.
    void cavemanProxyForLaunch(policy.proxyMode)
    Object.assign(env, claudeProxyEnv(lastKnownCavemanProxyUrl(), TERMINAL_TOKEN_SAVING_SLUG)(env))
  } catch (error) {
    console.warn('[token-saving] terminal setup skipped', error)
  }
}

/** Readies the terminal plugin early (host start, a policy push) so the first terminal has it. */
export function warmTokenSavingTerminal(userDataPath: string): void {
  if (FORK_FEATURES.tokenSaving && !process.env.VITEST && !ready) {
    preparePlugin(userDataPath)
  }
}
