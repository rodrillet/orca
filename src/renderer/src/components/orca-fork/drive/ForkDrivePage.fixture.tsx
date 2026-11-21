import { defineFixture } from '../../../component-fixtures/component-fixture'
import { publishBots } from '@/lib/bot-catalog-snapshot'
import type { Bot } from '../../../../../shared/bot-types'
import { mascotAvatar } from '../../../../../shared/bot-avatar'
import type { DriveFile, DriveFolder } from '../../../../../shared/orca-fork/drive/drive-types'
import { ConfirmationDialogProvider } from '../../dismiss/confirmation/confirmation-dialog'
import ForkDrivePage from './ForkDrivePage'

const NOW = Date.now()
const HOUR = 60 * 60 * 1000

function bot(id: string, name: string, mascot: Parameters<typeof mascotAvatar>[0]): Bot {
  return {
    id,
    name,
    hostId: 'local',
    folder: id,
    folderWorkspaceId: `fw-${id}`,
    agent: 'claude',
    avatar: mascotAvatar(mascot),
    paused: false,
    notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
    members: [],
    slack: null,
    linear: null,
    github: null,
    chatSessionId: 'home',
    sidebarOrder: 0,
    createdAt: 1,
    updatedAt: 1
  }
}

function image(colors: [string, string], label: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 360
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 480, 360)
    gradient.addColorStop(0, colors[0])
    gradient.addColorStop(1, colors[1])
    context.fillStyle = gradient
    context.fillRect(0, 0, 480, 360)
    context.fillStyle = 'rgba(255,255,255,0.9)'
    context.font = 'bold 42px sans-serif'
    context.fillText(label, 32, 320)
  }
  return canvas.toDataURL('image/png').split(',')[1] ?? ''
}

function file(
  id: string,
  name: string,
  kind: DriveFile['kind'],
  ageHours: number,
  source: DriveFile['source'],
  folderId: string | null = null
): DriveFile {
  return {
    id,
    name,
    folderId,
    kind,
    mimeType: kind === 'image' ? 'image/png' : 'text/plain',
    byteLength: 1200 + ageHours * 913,
    createdAt: NOW - ageHours * HOUR,
    updatedAt: NOW - ageHours * HOUR,
    trashedAt: null,
    source
  }
}

const closer = { botId: 'closer', botName: 'Closer' }
const writer = { botId: 'writer', botName: 'Writer' }

function installDrive(): void {
  publishBots([bot('closer', 'Closer', 'F1'), bot('writer', 'Writer', 'H1')])
  const contents: Record<string, string> = {
    f1: image(['#4f46e5', '#06b6d4'], 'Q4 funnel'),
    f2: image(['#f97316', '#db2777'], 'Landing hero'),
    f5: image(['#16a34a', '#0ea5e9'], 'Store photo'),
    f3: btoa('# Weekly sales report\n\n- 42 new leads\n- 12 demos booked\n- 3 deals closed\n'),
    f4: btoa('export function score(lead) {\n  return lead.visits * 2 + lead.replies * 5\n}\n'),
    f6: btoa('name,email,stage\nAna,ana@example.com,demo\nBruno,bruno@example.com,won\n')
  }
  const folders: DriveFolder[] = [
    { id: 'd1', name: 'Reports', parentId: null, createdAt: NOW - 50 * HOUR, trashedAt: null },
    { id: 'd2', name: 'Brand assets', parentId: null, createdAt: NOW - 90 * HOUR, trashedAt: null }
  ]
  const files: DriveFile[] = [
    file('f1', 'q4-funnel.png', 'image', 1, {
      kind: 'agent',
      sessionId: 's1',
      ...closer,
      note: 'Q4 funnel chart'
    }),
    file('f2', 'landing-hero.png', 'image', 3, {
      kind: 'chat-attachment',
      sessionId: 's2',
      ...writer,
      excerpt: 'Use this as the hero image'
    }),
    file('f3', 'weekly-sales.md', 'markdown', 5, {
      kind: 'agent',
      sessionId: 's1',
      ...closer,
      note: 'Weekly sales report'
    }),
    file('f4', 'lead-score.ts', 'code', 30, { kind: 'agent', sessionId: 's3', ...writer }),
    file('f5', 'store-photo.png', 'image', 80, { kind: 'upload' }),
    file('f6', 'leads.csv', 'text', 200, { kind: 'chat-attachment', sessionId: 's1', ...closer })
  ]
  const respond = (result: unknown) => ({
    id: 'drive',
    ok: true,
    _meta: { runtimeId: 'fixture' },
    result
  })
  const runtime: unknown = window.api.runtime
  Reflect.set(window.api, 'runtime', {
    ...(typeof runtime === 'object' ? runtime : {}),
    call: async ({ method, params }: { method: string; params?: { fileId?: string } }) => {
      if (method === 'orcaFork.drive.list') {
        return respond({ files, folders })
      }
      if (method === 'orcaFork.drive.read') {
        const content = contents[params?.fileId ?? ''] ?? ''
        const bytes = Math.floor((content.length * 3) / 4)
        return respond({
          contentBase64: content,
          offset: 0,
          byteLength: bytes,
          totalBytes: bytes,
          mimeType: 'image/png'
        })
      }
      return { ok: false, error: { code: 'runtime_error', message: method } }
    }
  })
}

const Page = (): React.JSX.Element => (
  <ConfirmationDialogProvider>
    <div style={{ height: 760, display: 'flex' }}>
      <ForkDrivePage />
    </div>
  </ConfirmationDialogProvider>
)

export const grid = defineFixture({ width: 1240, setup: installDrive, render: () => <Page /> })

export const list = defineFixture({
  width: 1240,
  setup: () => {
    installDrive()
    try {
      localStorage.setItem('orca-fork.drive.layout', 'list')
    } catch {
      // The fixture shows the grid instead.
    }
  },
  render: () => <Page />
})
