// orca-fork: `orca files …`, the Drive of the computer the command runs on (or --environment's).
import { CLI_GLOBAL_FLAGS as GLOBAL_FLAGS } from '../../../shared/cli/cli-argument-boundary'
import type { CommandSpec } from '../../discovery/command-spec'

export const DRIVE_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['files', 'save'],
    summary: "Save a file in your owner's Drive, linked to the chat it came from",
    usage:
      'orca files save <file> [--name <name>] [--folder <path>] [--note <what it is>] [--workspace <id>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'file', 'name', 'folder', 'note', 'workspace'],
    positionalArgs: ['file'],
    examples: [
      'orca files save ./report.pdf --note "Weekly sales report"',
      'orca files save ./chart.png --folder reports/2026'
    ],
    notes: [
      "Run from a bot's chat, the file shows who made it and links back to that chat.",
      '--folder makes the folders in the path when they do not exist yet.'
    ]
  },
  {
    path: ['files', 'list'],
    summary: "List the files in your owner's Drive",
    usage: 'orca files list [--workspace <id>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'workspace']
  }
]
