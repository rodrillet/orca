import { describe, expect, it } from 'vitest'
import { classifyAgentCommand } from './machine-resources'

describe('classifyAgentCommand', () => {
  it('names agent programs run directly or through a script host', () => {
    expect(classifyAgentCommand('claude --resume abc')?.label).toBe('Claude Code')
    expect(
      classifyAgentCommand('node /usr/lib/node_modules/@anthropic-ai/claude-code/cli.js')?.kind
    ).toBe('claude')
    expect(classifyAgentCommand('/opt/codex/codex-x86_64-unknown-linux-musl exec')?.kind).toBe(
      'codex'
    )
    expect(classifyAgentCommand('node /home/u/.npm/bin/gemini')?.label).toBe('Gemini CLI')
  })

  it('ignores programs that only mention an agent in their arguments', () => {
    expect(classifyAgentCommand('vim claude.md')).toBeNull()
    expect(classifyAgentCommand('node server.js claude')).toBeNull()
    expect(classifyAgentCommand('grep codex')).toBeNull()
  })
})
