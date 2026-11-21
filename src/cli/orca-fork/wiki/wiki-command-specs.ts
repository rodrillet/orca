// orca-fork: `orca wiki …`, the workspace wiki agents read and write while they work.
import { CLI_GLOBAL_FLAGS as GLOBAL_FLAGS } from '../../../shared/cli/cli-argument-boundary'
import type { CommandSpec } from '../../discovery/command-spec'

const SCOPE_FLAGS = [...GLOBAL_FLAGS, 'workspace', 'as']
const WIKI_NOTES = [
  'The wiki lives on the computer Orca runs on; --environment <name> reads and writes another paired computer’s.',
  'Without --workspace, the wiki is your own workspace\u2019s: your bot\u2019s or your project\u2019s, as your owner placed them (ORCA_FORK_WORKSPACE_ID overrides). A bot signs as itself; another agent signs with --as <name>.',
  'Link pages by writing [[Page title]] in a body. Text flags have a -file twin that reads a file or - (stdin).'
]

export const FORK_WIKI_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['wiki', 'search'],
    summary: 'Search the workspace wiki before you start: what was already learned',
    usage: 'orca wiki search <words> [--tag <tag>] [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'query', 'tag'],
    positionalArgs: ['query'],
    notes: WIKI_NOTES
  },
  {
    path: ['wiki', 'list'],
    summary: 'List wiki pages, newest first (by tag, or the trash)',
    usage: 'orca wiki list [--tag <tag>] [--trash] [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'tag', 'trash'],
    booleanFlags: ['trash'],
    notes: WIKI_NOTES
  },
  {
    path: ['wiki', 'show'],
    summary: 'Read a wiki page in full, with its version, tags and backlinks',
    usage: 'orca wiki show <page> [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'page'],
    positionalArgs: ['page'],
    notes: WIKI_NOTES
  },
  {
    path: ['wiki', 'consultations'],
    summary: 'Who read the wiki, when, and from which chat or task (one page, one reader, or all)',
    usage:
      'orca wiki consultations [--page <page>] [--reader owner|bot:<id>|agent:<name>] [--limit <n>] [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'page', 'reader', 'limit'],
    notes: WIKI_NOTES
  },
  {
    path: ['wiki', 'create'],
    summary: 'Write down something you learned as a new wiki page',
    usage:
      'orca wiki create --title <title> (--body <markdown> | --body-file <path|->) [--folder <a/b>] [--tag <tag>]... [--note <why>] [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'title', 'body', 'body-file', 'folder', 'tag', 'note'],
    repeatableFlags: ['tag'],
    notes: [
      ...WIKI_NOTES,
      'Search first: if a page already covers it, update that page instead of making another.'
    ]
  },
  {
    path: ['wiki', 'update'],
    summary: 'Add to or rewrite a wiki page (append, one section, or the whole page)',
    usage:
      'orca wiki update <page> (--body <markdown> | --body-file <path|->) [--mode append|section|replace] [--section <heading>] [--base-version <n>] [--title <new title>] [--folder <a/b>] [--tag <tag>]... [--note <why>] [--workspace <id>] [--json]',
    allowedFlags: [
      ...SCOPE_FLAGS,
      'page',
      'body',
      'body-file',
      'mode',
      'section',
      'base-version',
      'title',
      'folder',
      'tag',
      'note'
    ],
    repeatableFlags: ['tag'],
    positionalArgs: ['page'],
    notes: [
      ...WIKI_NOTES,
      'Default mode is append (at the end, or at the end of --section, created when missing). --mode section replaces that section; --mode replace replaces the page and needs --base-version from `orca wiki show`.',
      '--tag replaces all tags; use `orca wiki tag` to add or remove some.'
    ]
  },
  {
    path: ['wiki', 'tag'],
    summary: "Add or remove a wiki page's tags",
    usage: 'orca wiki tag <page> [--add <tag>]... [--remove <tag>]... [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'page', 'add', 'remove'],
    repeatableFlags: ['add', 'remove'],
    positionalArgs: ['page'],
    notes: WIKI_NOTES
  },
  {
    path: ['wiki', 'link'],
    summary: 'Link a wiki page to related pages (its "See also" section)',
    usage: 'orca wiki link <page> --to <page>... [--section <heading>] [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'page', 'to', 'section'],
    repeatableFlags: ['to'],
    positionalArgs: ['page'],
    notes: WIKI_NOTES
  },
  {
    path: ['wiki', 'mention'],
    summary: 'Record that this chat (or an item) cites a wiki page, for its "Mentioned in"',
    usage:
      'orca wiki mention <page> [--chat <session id>] [--item <number>] [--title <text>] [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'page', 'chat', 'item', 'title'],
    positionalArgs: ['page'],
    notes: [...WIKI_NOTES, 'Run from your chat with no --chat or --item: it records that chat.']
  },
  {
    path: ['wiki', 'history'],
    summary: "A wiki page's versions: who changed it, when and why",
    usage: 'orca wiki history <page> [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'page'],
    positionalArgs: ['page'],
    notes: WIKI_NOTES
  },
  {
    path: ['wiki', 'delete'],
    summary: 'Move a wiki page to the trash (your owner can restore it)',
    usage: 'orca wiki delete <page> [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'page'],
    positionalArgs: ['page'],
    notes: WIKI_NOTES
  },
  {
    path: ['wiki', 'restore'],
    summary: 'Bring a wiki page back from the trash',
    usage: 'orca wiki restore <page> [--workspace <id>] [--json]',
    allowedFlags: [...SCOPE_FLAGS, 'page'],
    positionalArgs: ['page'],
    notes: WIKI_NOTES
  }
]
