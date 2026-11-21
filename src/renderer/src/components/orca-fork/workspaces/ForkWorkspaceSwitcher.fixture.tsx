import { defineFixture } from '../../../component-fixtures/component-fixture'
import {
  emptyForkWorkspaces,
  type ForkWorkspace
} from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { ForkWorkspaceDialog } from './ForkWorkspaceDialog'
import { ForkWorkspaceSwitcher } from './ForkWorkspaceSwitcher'
import { forkWorkspacesStore } from './fork-workspaces-store'

function photo(): string {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const c = canvas.getContext('2d')!
  const gradient = c.createLinearGradient(0, 0, 64, 64)
  gradient.addColorStop(0, '#0f766e')
  gradient.addColorStop(1, '#1e3a8a')
  c.fillStyle = gradient
  c.fillRect(0, 0, 64, 64)
  c.fillStyle = '#fff'
  c.font = 'bold 30px sans-serif'
  c.fillText('A', 22, 43)
  return canvas.toDataURL('image/png')
}

function workspace(id: string, name: string, extra: Partial<ForkWorkspace> = {}): ForkWorkspace {
  return {
    id,
    name,
    photo: null,
    hostId: 'local',
    repoIds: [],
    botKeys: [],
    createdAt: 1,
    ...extra
  }
}

function seed(): void {
  const doc = emptyForkWorkspaces()
  forkWorkspacesStore.edit(() => ({
    ...doc,
    revision: 1,
    workspaces: [
      workspace('ws_acme', 'Acme', { photo: photo(), createdAt: 0 }),
      workspace('ws_personal', 'Pessoal', { createdAt: 2 }),
      workspace('host:runtime:vps1', 'VPS Zen', { hostId: 'runtime:vps1', createdAt: 3 })
    ],
    activeWorkspaceId: 'ws_acme'
  }))
}

export const header = defineFixture({
  width: 280,
  setup: seed,
  render: () => <ForkWorkspaceSwitcher />
})

export const menuOpen = defineFixture({
  width: 300,
  setup: seed,
  render: () => (
    <div style={{ height: 280 }}>
      <ForkWorkspaceSwitcher />
    </div>
  ),
  interact: async (frame) => {
    frame.querySelector('[data-fork-workspace-switcher] button')?.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerType: 'mouse'
      })
    )
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
})

export const newWorkspaceDialog = defineFixture({
  width: 520,
  setup: seed,
  render: () => (
    <div style={{ height: 460 }}>
      <ForkWorkspaceDialog target={{ mode: 'create' }} onClose={() => {}} />
    </div>
  )
})
