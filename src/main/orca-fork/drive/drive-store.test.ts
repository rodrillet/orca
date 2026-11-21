import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DriveStore } from './drive-store'

let root: string
let store: DriveStore

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'orca-fork-drive-'))
  store = new DriveStore(join(root, 'drive'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function upload(name: string, text: string, folderId: string | null = null) {
  const bytes = Buffer.from(text)
  const { uploadId } = await store.uploads.start({
    name,
    byteLength: bytes.length,
    folderId
  })
  await store.uploads.append({ uploadId, offset: 0, contentBase64: bytes.toString('base64') })
  return store.commitUpload(uploadId)
}

describe('DriveStore', () => {
  it('keeps an uploaded file and reads its bytes back', async () => {
    const file = await upload('notes.md', '# hello')
    expect(file).toMatchObject({ name: 'notes.md', kind: 'markdown', byteLength: 7 })
    const read = await store.read(file.id)
    expect(Buffer.from(read.contentBase64, 'base64').toString()).toBe('# hello')
    // A fresh store reads the same index from disk.
    const reopened = new DriveStore(join(root, 'drive'))
    expect((await reopened.list()).files.map((entry) => entry.name)).toEqual(['notes.md'])
  })

  it('makes a folder path once and reuses it', async () => {
    const first = await store.ensureFolderPath('reports/2026')
    const again = await store.ensureFolderPath('Reports/2026')
    expect(again).toBe(first)
    expect((await store.list()).folders.map((folder) => folder.name)).toEqual(['reports', '2026'])
  })

  it('restores a file out of a trashed folder to the top level', async () => {
    const folder = await store.createFolder('Old')
    const file = await upload('a.txt', 'a', folder.id)
    await store.update({ folderIds: [folder.id], trashed: true })
    await store.update({ fileIds: [file.id], trashed: true })
    await store.update({ fileIds: [file.id], trashed: false })
    const restored = (await store.list()).files[0]
    expect(restored).toMatchObject({ trashedAt: null, folderId: null })
  })

  it('refuses to move a folder into its own subfolder', async () => {
    const parent = await store.createFolder('Parent')
    const child = await store.createFolder('Child', parent.id)
    await expect(store.update({ folderIds: [parent.id], moveTo: child.id })).rejects.toThrow(
      'A folder cannot move into itself'
    )
  })

  it('empties the trash with what trashed folders hold, blobs included', async () => {
    const folder = await store.createFolder('Gone')
    await upload('inside.txt', 'x', folder.id)
    const kept = await upload('kept.txt', 'y')
    await store.update({ folderIds: [folder.id], trashed: true })
    expect(await store.delete({ emptyTrash: true })).toEqual({
      files: 1,
      folders: 1
    })
    const left = await store.list()
    expect(left.files.map((file) => file.id)).toEqual([kept.id])
    expect(await readdir(join(root, 'drive', 'blobs'))).toEqual([kept.id])
  })

  it('captures the same chat attachment only once', async () => {
    const path = join(root, 'photo.png')
    await writeFile(path, 'png')
    const source = { kind: 'chat-attachment', sessionId: 's1' } as const
    const first = await store.addFromPath(path, { name: 'photo.png', source, originKey: 'k' })
    const second = await store.addFromPath(path, {
      name: 'photo.png',
      source,
      originKey: 'k'
    })
    expect(second.id).toBe(first.id)
    expect((await store.list()).files).toHaveLength(1)
  })
})
