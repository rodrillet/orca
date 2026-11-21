// orca-fork: one machine's resources (this Mac or a paired server) as its own host reports them.
import * as z from 'zod'

export const MACHINE_RESOURCES_METHOD = 'orcaFork.resources.machine'
export const MACHINE_RESOURCES_STOP_METHOD = 'orcaFork.resources.stopProcess'

export const MachineResourcesParams = z.object({}).strict().optional()
export const MachineResourcesStopParams = z.object({ pid: z.number().int().positive() }).strict()

export type AgentProcessKind = 'claude' | 'codex' | 'agent'

export type MachineUsage = { cpu: number; memory: number }

export type MachineAgentProcess = MachineUsage & {
  pid: number
  kind: AgentProcessKind
  /** Display name of the agent program ("Claude Code", "Gemini CLI"…). */
  label: string
  /** Child processes folded into this row (MCP servers, the native binary under a node wrapper…). */
  children: number
  botId: string | null
  botName: string | null
  /** The Orca worktree (or folder workspace) whose terminal runs it, and its project. */
  worktreeId: string | null
  worktreeName: string | null
  /** With the bot key, what places the process in a fork workspace (`forkWorkspaceOfItem`). */
  repoId: string | null
  /** The folder it runs in, shortened to its last two parts; null when the host can't tell. */
  folder: string | null
}

export type MachineOtherProcess = MachineUsage & { pid: number; name: string }

export type MachineResources = {
  hostname: string
  platform: NodeJS.Platform
  collectedAt: number
  memory: { total: number; used: number; available: number }
  cpu: {
    cores: number
    /** Percent of the whole machine over the last sample interval; null on the first sample. */
    usagePercent: number | null
    loadAverage1m: number
  }
  /** The disk holding the home folder; null when it can't be read. */
  disk: { path: string; total: number; free: number } | null
  orca: MachineUsage
  agents: MachineAgentProcess[]
  /** The heaviest processes that are neither Orca nor an agent. */
  others: MachineOtherProcess[]
}

export type MachineResourcesStopResult = { stopped: boolean; reason?: 'not_agent' | 'gone' }

type AgentProgram = { kind: AgentProcessKind; label: string; names: readonly string[] }

const AGENT_PROGRAMS: readonly AgentProgram[] = [
  { kind: 'claude', label: 'Claude Code', names: ['claude', 'claude-code'] },
  { kind: 'codex', label: 'Codex', names: ['codex'] },
  { kind: 'agent', label: 'Gemini CLI', names: ['gemini'] },
  { kind: 'agent', label: 'OpenCode', names: ['opencode'] },
  { kind: 'agent', label: 'Cursor Agent', names: ['cursor-agent'] },
  { kind: 'agent', label: 'Copilot CLI', names: ['copilot'] },
  { kind: 'agent', label: 'Amp', names: ['amp'] },
  { kind: 'agent', label: 'Aider', names: ['aider'] },
  { kind: 'agent', label: 'Grok CLI', names: ['grok'] },
  { kind: 'agent', label: 'Qwen Code', names: ['qwen'] },
  { kind: 'agent', label: 'Goose', names: ['goose'] },
  { kind: 'agent', label: 'Droid', names: ['droid'] },
  { kind: 'agent', label: 'Kimi CLI', names: ['kimi'] },
  { kind: 'agent', label: 'Crush', names: ['crush'] }
]

const SCRIPT_HOSTS = new Set(['node', 'bun', 'deno', 'python', 'python3', 'npx', 'tsx'])

// Case kept: the CLIs are lower case, the desktop apps (`Claude.app/…/Claude`) are not.
function programName(token: string): string {
  const base = token.split(/[\\/]/).pop() ?? token
  return base.replace(/\.(exe|cmd|bat|js|mjs|cjs)$/iu, '')
}

function matchProgram(token: string): AgentProgram | null {
  // A macOS app bundle (the Claude or Codex desktop app and its helpers) is not an agent CLI.
  if (token.includes('.app/')) {
    return null
  }
  const lower = token.toLowerCase()
  if (lower.includes('@anthropic-ai/claude-code')) {
    return AGENT_PROGRAMS[0]
  }
  if (lower.includes('@openai/codex')) {
    return AGENT_PROGRAMS[1]
  }
  const name = programName(token)
  return (
    AGENT_PROGRAMS.find((program) =>
      program.names.some(
        // The Codex native binary is named codex-<target triple>.
        (candidate) => name === candidate || (candidate === 'codex' && name.startsWith('codex-'))
      )
    ) ?? null
  )
}

/** Which agent program a command line runs, from its program (or a script host's script) only. */
export function classifyAgentCommand(args: string): Pick<AgentProgram, 'kind' | 'label'> | null {
  const tokens = args.trim().split(/\s+/u).slice(0, 3)
  const [first, second] = tokens
  if (!first) {
    return null
  }
  const direct = matchProgram(first)
  if (direct) {
    return { kind: direct.kind, label: direct.label }
  }
  if (second && SCRIPT_HOSTS.has(programName(first).toLowerCase())) {
    const script = matchProgram(second)
    return script ? { kind: script.kind, label: script.label } : null
  }
  return null
}

/** `a/b/c/d` → `c/d`, so a row says where an agent runs without a long path. */
export function shortFolder(path: string): string {
  const sep = path.includes('\\') ? '\\' : '/'
  const parts = path.split(/[\\/]+/u).filter(Boolean)
  return parts.length > 2 ? parts.slice(-2).join(sep) : path
}
