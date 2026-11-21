import { defineFixture } from '../../../component-fixtures/component-fixture'
import { mascotAvatar } from '../../../../../shared/bot-avatar'
import { publishBots } from '@/lib/bot-catalog-snapshot'
import type { Bot } from '../../../../../shared/bot-types'
import type {
  WikiActivityResult,
  WikiActor,
  WikiConsultation,
  WikiListResult,
  WikiPage,
  WikiPageSummary
} from '../../../../../shared/orca-fork/wiki/wiki-types'
import { ForkWikiPage } from './ForkWikiPage'
import { openWikiPage, setWikiTag, showWikiCenter } from './wiki-view-state'

const HOUR = 3_600_000
const now = Date.now()
const nora: WikiActor = { kind: 'bot', botId: 'nora', name: 'Nora' }
const dev: WikiActor = { kind: 'bot', botId: 'dev', name: 'Dev' }
const owner: WikiActor = { kind: 'owner' }

const bots: Bot[] = [
  { id: 'nora', name: 'Nora', mascot: 'A1' as const },
  { id: 'dev', name: 'Dev', mascot: 'D1' as const }
].map((entry, index) => ({
  id: entry.id,
  name: entry.name,
  hostId: 'local',
  folder: entry.id,
  folderWorkspaceId: `fw-${entry.id}`,
  agent: 'claude',
  avatar: mascotAvatar(entry.mascot),
  paused: false,
  notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
  members: [],
  slack: null,
  linear: null,
  github: null,
  chatSessionId: 'home',
  sidebarOrder: index,
  createdAt: 1,
  updatedAt: 1
}))

function summary(
  slug: string,
  title: string,
  folder: string,
  tags: string[],
  by: WikiActor,
  hoursAgo: number,
  views: number,
  excerpt: string
): WikiPageSummary {
  return {
    id: slug,
    workspaceId: 'default',
    slug,
    title,
    folder,
    tags,
    excerpt,
    version: 3,
    createdAt: now - 72 * HOUR,
    createdBy: by,
    updatedAt: now - hoursAgo * HOUR,
    updatedBy: by,
    viewCount: views,
    lastViewedAt: now - HOUR,
    pinned: slug === 'glossary',
    deletedAt: null,
    deletedBy: null
  }
}

const pages: WikiPageSummary[] = [
  summary(
    'deploy-to-the-vps',
    'Deploy to the VPS',
    'Infra',
    ['deploy', 'vps'],
    nora,
    2,
    14,
    'orca-server runs as the orca-serve user service. Restart it with systemctl --user restart orca-serve; logs go to journalctl.'
  ),
  summary(
    'ci-flaky-tests',
    'CI flaky tests',
    'Engineering/CI',
    ['ci', 'tests'],
    dev,
    5,
    6,
    'Three suites fail on load: the terminal daemon tests need --maxWorkers=2 on the VPS.'
  ),
  summary(
    'glossary',
    'Glossary',
    '',
    ['onboarding'],
    owner,
    30,
    22,
    'Workspace, worker, bot, environment: what each word means in this team.'
  ),
  summary(
    'release-checklist',
    'Release checklist',
    'Engineering',
    ['release', 'ci'],
    nora,
    50,
    3,
    'Fork builds publish v<upstream>-fork.<run>; the Mac app is ad-hoc signed.'
  )
]

const samplePage: WikiPage = {
  ...pages[0]!,
  version: 4,
  body: [
    'orca-server runs as the **orca-serve** user service on the VPS.',
    '',
    '## Restart',
    '',
    '```sh',
    'systemctl --user restart orca-serve',
    'journalctl --user -u orca-serve -f',
    '```',
    '',
    '## Gotchas',
    '',
    '- The service reads `~/.config/orca/serve.env`; edit it, then restart.',
    '- Pairing survives restarts. See [[Release checklist]] before installing a fork build.',
    '- A missing page links like this: [[Backups]].'
  ].join('\n'),
  links: [],
  backlinks: [
    {
      kind: 'page',
      id: 'release-checklist',
      title: 'Release checklist',
      at: now - 50 * HOUR,
      by: nora
    },
    { kind: 'chat', id: 's1', title: 'Fix the VPS deploy', at: now - 3 * HOUR, by: nora },
    { kind: 'item', id: 'dev:12', title: 'Item #12 · Dev', at: now - 6 * HOUR, by: dev }
  ],
  viewers: [
    { actor: nora, count: 8, lastAt: now - HOUR },
    { actor: owner, count: 4, lastAt: now - 4 * HOUR },
    { actor: dev, count: 2, lastAt: now - 26 * HOUR }
  ],
  recentViews: [
    {
      at: now - HOUR,
      by: nora,
      chatId: 's1',
      chatTitle: 'Fix the VPS deploy',
      taskId: 't1',
      taskTitle: 'Install the fork orca-server'
    },
    { at: now - 4 * HOUR, by: owner, chatId: null, chatTitle: null, taskId: null, taskTitle: null },
    {
      at: now - 26 * HOUR,
      by: dev,
      chatId: 's2',
      chatTitle: 'Release 1.4.266',
      taskId: null,
      taskTitle: null
    }
  ]
}

function consultation(
  page: WikiPageSummary,
  by: WikiActor,
  hoursAgo: number,
  chatTitle: string | null,
  taskTitle: string | null = null
): WikiConsultation {
  return {
    pageId: page.id,
    slug: page.slug,
    title: page.title,
    folder: page.folder,
    trashed: false,
    at: now - hoursAgo * HOUR,
    by,
    chatId: chatTitle ? `chat-${hoursAgo}` : null,
    chatTitle,
    taskId: taskTitle ? `task-${hoursAgo}` : null,
    taskTitle
  }
}

const activity: WikiActivityResult = {
  workspaceId: 'default',
  windowDays: 30,
  consultations: [
    consultation(pages[0]!, nora, 0.5, 'Fix the VPS deploy', 'Install the fork orca-server'),
    consultation(pages[1]!, dev, 1.2, 'Flaky CI', 'Stabilize the terminal suites'),
    consultation(pages[2]!, nora, 2, 'Onboarding the new bot'),
    consultation(pages[0]!, owner, 3, null),
    consultation(pages[3]!, dev, 27, 'Release 1.4.266', 'Cut the fork release')
  ],
  readers: [
    { actor: nora, key: 'bot:nora', count: 14, pages: 5, lastAt: now - 0.5 * HOUR },
    { actor: dev, key: 'bot:dev', count: 9, pages: 3, lastAt: now - 1.2 * HOUR },
    { actor: owner, key: 'owner', count: 4, pages: 2, lastAt: now - 3 * HOUR }
  ],
  popular: [
    {
      pageId: pages[0]!.id,
      slug: pages[0]!.slug,
      title: pages[0]!.title,
      folder: pages[0]!.folder,
      count: 11,
      readers: [
        { actor: nora, count: 8 },
        { actor: dev, count: 3 }
      ]
    },
    {
      pageId: pages[1]!.id,
      slug: pages[1]!.slug,
      title: pages[1]!.title,
      folder: pages[1]!.folder,
      count: 6,
      readers: [{ actor: dev, count: 6 }]
    },
    {
      pageId: pages[2]!.id,
      slug: pages[2]!.slug,
      title: pages[2]!.title,
      folder: pages[2]!.folder,
      count: 2,
      readers: [{ actor: nora, count: 2 }]
    }
  ]
}

const list: WikiListResult = {
  workspaceId: 'default',
  pages,
  tags: [
    { tag: 'ci', count: 2 },
    { tag: 'deploy', count: 1 },
    { tag: 'onboarding', count: 1 },
    { tag: 'release', count: 1 },
    { tag: 'tests', count: 1 },
    { tag: 'vps', count: 1 }
  ],
  trashCount: 1
}

function stubWiki(): void {
  publishBots(bots)
  const results: Record<string, unknown> = {
    'bots.list': { bots },
    'bots.groups.list': { groups: [] },
    'orcaFork.wiki.list': list,
    'orcaFork.wiki.show': samplePage,
    'orcaFork.wiki.activity': activity
  }
  const runtime: unknown = window.api.runtime
  Reflect.set(window.api, 'runtime', {
    ...(typeof runtime === 'object' ? runtime : {}),
    call: async ({ method }: { method: string }) =>
      method in results
        ? { ok: true, result: results[method] }
        : { ok: false, error: { code: 'runtime_error', message: method } }
  })
}

function frame(): React.JSX.Element {
  return (
    <div className="relative h-[720px]">
      <ForkWikiPage />
    </div>
  )
}

export const home = defineFixture({
  width: 1280,
  setup: () => {
    stubWiki()
    setWikiTag(null)
    openWikiPage({ kind: 'home' })
  },
  render: frame
})

export const pageView = defineFixture({
  width: 1440,
  setup: () => {
    stubWiki()
    setWikiTag(null)
    openWikiPage()
    showWikiCenter({ kind: 'page', slug: 'deploy-to-the-vps' })
  },
  render: frame
})

export const tagFilter = defineFixture({
  width: 1280,
  setup: () => {
    stubWiki()
    openWikiPage({ kind: 'home' })
    setWikiTag('ci')
  },
  render: frame
})

export const consultations = defineFixture({
  width: 1280,
  setup: () => {
    stubWiki()
    setWikiTag(null)
    openWikiPage({ kind: 'consultations' })
  },
  render: frame
})

export const readerView = defineFixture({
  width: 1280,
  setup: () => {
    stubWiki()
    setWikiTag(null)
    openWikiPage({ kind: 'readers', actorKey: 'bot:nora' })
  },
  render: frame
})

export const folderView = defineFixture({
  width: 1280,
  setup: () => {
    stubWiki()
    setWikiTag(null)
    openWikiPage({ kind: 'folder', folder: 'Engineering' })
  },
  render: frame
})
