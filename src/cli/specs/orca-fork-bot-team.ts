// orca-fork: agent teams' CLI.
import type { CommandSpec } from '../discovery/command-spec'
import { CLI_GLOBAL_FLAGS as GLOBAL_FLAGS } from '../../shared/cli/cli-argument-boundary'

export const ORCA_FORK_BOT_TEAM_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['bot', 'team', 'post'],
    summary: "Post in your team's group room; the teammates you @mention take the work",
    usage: 'orca bot team post --text <text> [--team <room name>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'text', 'team'],
    notes: [
      'Only in a team whose lead your owner lets build a team (Bot settings › Can build a team). Your owner sees every post in the group.',
      'Start --text with @Name to pick who answers; you are never asked yourself. --team picks the room when you are in several.'
    ]
  }
]
