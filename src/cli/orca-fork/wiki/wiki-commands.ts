// orca-fork: `orca wiki …` handlers over `orcaFork.wiki.*` on the connected host.
import type { CommandHandler, HandlerContext } from '../../dispatch/dispatch'
import {
  getOptionalPositiveIntegerFlag,
  getOptionalStringFlag,
  getRepeatedStringFlag,
  getRequiredStringFlag
} from '../../arguments/flags'
import { readTextOrFileFlag } from '../../arguments/command-body-input'
import { printResult } from '../../output/command-result-output'
import { RuntimeClientError } from '../../runtime/connection/types'
import { callerChat } from '../../automations/automation-caller-chat'
import { getCallerWorkspaceIds } from '../../workspace-selection/caller-host-worktree-selection'
import type {
  WikiActor,
  WikiHistoryResult,
  WikiListResult,
  WikiPage,
  WikiPageSummary
} from '../../../shared/orca-fork/wiki/wiki-types'

type Flags = HandlerContext['flags']

function scope(flags: Flags): Record<string, string | string[]> {
  const workspaceId =
    getOptionalStringFlag(flags, 'workspace') ?? process.env.ORCA_FORK_WORKSPACE_ID?.trim()
  const agentName = getOptionalStringFlag(flags, 'as')
  const callerWorkspaceIds = getCallerWorkspaceIds()
  return {
    ...callerChat(),
    // Without --workspace, the host picks the caller's own workspace from where it runs.
    ...(callerWorkspaceIds.length ? { callerWorkspaceIds } : {}),
    ...(workspaceId ? { workspaceId } : {}),
    ...(agentName ? { agentName } : {})
  }
}

function who(actor: WikiActor): string {
  return actor.kind === 'owner' ? 'owner' : actor.name
}

function when(at: number): string {
  return new Date(at).toISOString().replace('T', ' ').slice(0, 16)
}

function pageLine(page: WikiPageSummary): string {
  const where = page.folder ? `${page.folder}/` : ''
  const tags = page.tags.length ? ` #${page.tags.join(' #')}` : ''
  const excerpt = page.excerpt ? `: ${page.excerpt.slice(0, 160)}` : ''
  return `- [[${page.title}]] (${where}${page.slug}, v${page.version}, ${page.viewCount} views)${tags}${excerpt}`
}

function formatList(result: WikiListResult): string {
  if (result.pages.length === 0) {
    return 'No wiki pages match. Write one with `orca wiki create` when you learn something worth keeping.'
  }
  return result.pages.map(pageLine).join('\n')
}

function formatPage(page: WikiPage): string {
  const backlinks = page.backlinks.map((link) =>
    link.kind === 'page' ? `[[${link.title}]]` : `${link.kind} "${link.title}"`
  )
  return [
    `# ${page.title} (slug ${page.slug}, version ${page.version}${page.folder ? `, folder ${page.folder}` : ''}${page.deletedAt ? ', in the trash' : ''})`,
    `Last edited ${when(page.updatedAt)} by ${who(page.updatedBy)}; ${page.viewCount} views.`,
    page.tags.length ? `Tags: ${page.tags.join(', ')}` : '',
    page.body.trim() || '(empty page)',
    backlinks.length ? `Mentioned in: ${backlinks.join(', ')}` : ''
  ]
    .filter(Boolean)
    .join('\n\n')
}

function formatWrite(page: WikiPage): string {
  return `Saved [[${page.title}]] (slug ${page.slug}) as version ${page.version}. Cite it as [[${page.title}]].`
}

function page(flags: Flags): string {
  return getRequiredStringFlag(flags, 'page')
}

const MODES = { append: 'append', section: 'replace_section', replace: 'replace' } as const

function mode(flags: Flags): (typeof MODES)[keyof typeof MODES] | undefined {
  const value = getOptionalStringFlag(flags, 'mode')
  if (value === undefined) {
    return undefined
  }
  const known = Object.entries(MODES).find(([name]) => name === value)
  if (!known) {
    throw new RuntimeClientError('invalid_argument', '--mode takes append, section or replace')
  }
  return known[1]
}

async function show({ client, json, flags }: HandlerContext): Promise<void> {
  const result = await client.call<WikiPage>('orcaFork.wiki.show', {
    ...scope(flags),
    page: page(flags),
    view: true
  })
  printResult(result, json, formatPage)
}

export const FORK_WIKI_HANDLERS: Record<string, CommandHandler> = {
  'wiki search': async ({ client, json, flags }) => {
    const tag = getOptionalStringFlag(flags, 'tag')
    const result = await client.call<WikiListResult>('orcaFork.wiki.list', {
      ...scope(flags),
      query: getRequiredStringFlag(flags, 'query'),
      limit: 12,
      ...(tag ? { tag } : {})
    })
    printResult(result, json, formatList)
  },
  'wiki list': async ({ client, json, flags }) => {
    const tag = getOptionalStringFlag(flags, 'tag')
    const result = await client.call<WikiListResult>('orcaFork.wiki.list', {
      ...scope(flags),
      ...(tag ? { tag } : {}),
      ...(flags.get('trash') === true ? { trash: true } : {})
    })
    printResult(result, json, formatList)
  },
  'wiki show': show,
  'wiki create': async ({ client, json, flags, cwd }) => {
    const body = await readTextOrFileFlag(flags, cwd, 'body', true)
    const folder = getOptionalStringFlag(flags, 'folder')
    const note = getOptionalStringFlag(flags, 'note')
    const result = await client.call<WikiPage>('orcaFork.wiki.create', {
      ...scope(flags),
      title: getRequiredStringFlag(flags, 'title'),
      body,
      tags: getRepeatedStringFlag(flags, 'tag'),
      ...(folder ? { folder } : {}),
      ...(note ? { note } : {})
    })
    printResult(result, json, formatWrite)
  },
  'wiki update': async ({ client, json, flags, cwd }) => {
    const body = await readTextOrFileFlag(flags, cwd, 'body', false)
    const tags = getRepeatedStringFlag(flags, 'tag')
    const optional = {
      section: getOptionalStringFlag(flags, 'section'),
      title: getOptionalStringFlag(flags, 'title'),
      folder: getOptionalStringFlag(flags, 'folder'),
      note: getOptionalStringFlag(flags, 'note'),
      baseVersion: getOptionalPositiveIntegerFlag(flags, 'base-version')
    }
    const result = await client.call<WikiPage>('orcaFork.wiki.update', {
      ...scope(flags),
      page: page(flags),
      mode: mode(flags) ?? 'append',
      ...(body !== undefined ? { body } : {}),
      ...(tags.length ? { tags } : {}),
      ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined))
    })
    printResult(result, json, formatWrite)
  },
  'wiki tag': async ({ client, json, flags }) => {
    const result = await client.call<WikiPage>('orcaFork.wiki.tag', {
      ...scope(flags),
      page: page(flags),
      add: getRepeatedStringFlag(flags, 'add'),
      remove: getRepeatedStringFlag(flags, 'remove')
    })
    printResult(result, json, (value) =>
      value.tags.length
        ? `[[${value.title}]] tags: ${value.tags.join(', ')}`
        : `[[${value.title}]] has no tags.`
    )
  },
  'wiki link': async ({ client, json, flags }) => {
    const section = getOptionalStringFlag(flags, 'section')
    const result = await client.call<WikiPage>('orcaFork.wiki.link', {
      ...scope(flags),
      page: page(flags),
      to: getRepeatedStringFlag(flags, 'to'),
      ...(section ? { section } : {})
    })
    printResult(result, json, formatWrite)
  },
  'wiki mention': async ({ client, json, flags }) => {
    const chat = getOptionalStringFlag(flags, 'chat')
    const item = getOptionalStringFlag(flags, 'item')
    const title = getOptionalStringFlag(flags, 'title')
    const result = await client.call<WikiPage>('orcaFork.wiki.mention', {
      ...scope(flags),
      page: page(flags),
      ...(item ? { kind: 'item', sourceId: item } : chat ? { kind: 'chat', sourceId: chat } : {}),
      ...(title ? { sourceTitle: title } : {})
    })
    printResult(result, json, (value) => `Recorded the mention of [[${value.title}]].`)
  },
  'wiki history': async ({ client, json, flags }) => {
    const result = await client.call<WikiHistoryResult>('orcaFork.wiki.history', {
      ...scope(flags),
      page: page(flags)
    })
    printResult(result, json, (value) =>
      [
        `# ${value.title}`,
        ...value.versions.map(
          (version) =>
            `- v${version.version} ${when(version.at)} by ${who(version.by)}${version.note ? `: ${version.note}` : ''}`
        )
      ].join('\n')
    )
  },
  'wiki delete': async ({ client, json, flags }) => {
    const result = await client.call<WikiPageSummary>('orcaFork.wiki.trash', {
      ...scope(flags),
      page: page(flags)
    })
    printResult(result, json, (value) => `Moved [[${value.title}]] to the trash.`)
  },
  'wiki restore': async ({ client, json, flags }) => {
    const result = await client.call<WikiPage>('orcaFork.wiki.restore', {
      ...scope(flags),
      page: page(flags)
    })
    printResult(result, json, (value) => `Restored [[${value.title}]].`)
  }
}
