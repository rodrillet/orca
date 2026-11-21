import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nativeChatScratchFolderFor } from '../../native-chat/conversation-files/native-chat-scratch-folder'
import { DriveStore } from './drive-store'

const holder = vi.hoisted((): { store: unknown } => ({ store: null }))
vi.mock('./drive-store-registry', () => ({ getDriveStore: () => holder.store }))

const { captureScratchFilesInDrive } = await import('./drive-scratch-capture')

let root: string
let store: DriveStore

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'orca-fork-scratch-'))
  store = new DriveStore(join(root, 'drive'))
  holder.store = store
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('captureScratchFilesInDrive', () => {
  it('keeps what an agent wrote in its chat folder once, and updates it when it is rewritten', async () => {
    const folder = nativeChatScratchFolderFor(root, 'session-1')
    await mkdir(join(folder, 'charts'), { recursive: true })
    await writeFile(join(folder, 'charts', 'funnel.png'), 'png-v1')
    await writeFile(join(folder, '.hidden'), 'skip me')

    expect(await captureScratchFilesInDrive(root, 'session-1')).toBe(1)
    expect(await captureScratchFilesInDrive(root, 'session-1')).toBe(0)

    await writeFile(join(folder, 'charts', 'funnel.png'), 'png-version-2')
    await utimes(join(folder, 'charts', 'funnel.png'), 1_700_000_000, 1_700_000_100)
    expect(await captureScratchFilesInDrive(root, 'session-1')).toBe(1)

    const { files } = await store.list()
    expect(files.map((file) => [file.name, file.byteLength])).toEqual([['funnel.png', 13]])
    expect(files[0]?.source).toEqual({ kind: 'agent', sessionId: 'session-1' })
    const read = await store.read(files[0]?.id ?? '')
    expect(Buffer.from(read.contentBase64, 'base64').toString()).toBe('png-version-2')
  })
})
