// orca-fork: one versioned JSON document in userData/orca-fork/, read and written over IPC.
import { app, ipcMain } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export function registerForkDocumentFile<T>(
  name: string,
  normalize: (raw: unknown) => T
): { read: () => Promise<T> } {
  const path = (): string => join(app.getPath('userData'), 'orca-fork', `${name}.json`)
  const read = async (): Promise<T> => {
    try {
      return normalize(JSON.parse(await readFile(path(), 'utf8')))
    } catch {
      return normalize(null)
    }
  }
  const write = async (raw: unknown): Promise<T> => {
    const doc = normalize(raw)
    const file = path()
    await mkdir(join(file, '..'), { recursive: true })
    const temp = `${file}.${process.pid}.tmp`
    await writeFile(temp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
    await rename(temp, file)
    return doc
  }
  // Writes are serialized so a slow write can't land after a newer one.
  let writing: Promise<unknown> = Promise.resolve()
  ipcMain.handle(`orcaFork:${name}:read`, () => read())
  ipcMain.handle(`orcaFork:${name}:write`, (_event, raw: unknown) => {
    const next = writing.then(() => write(raw))
    writing = next.catch(() => undefined)
    return next
  })
  return { read }
}
