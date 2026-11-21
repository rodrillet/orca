// orca-fork: keeps the Bots sidebar organization in userData/orca-fork/organization.json.
import { app, ipcMain } from 'electron'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  normalizeBotOrganization,
  type BotOrganization
} from '../../../shared/orca-fork/organization/bot-organization'

export const BOT_ORGANIZATION_READ_CHANNEL = 'orcaFork:organization:read'
export const BOT_ORGANIZATION_WRITE_CHANNEL = 'orcaFork:organization:write'

function organizationPath(): string {
  return join(app.getPath('userData'), 'orca-fork', 'organization.json')
}

async function readOrganization(): Promise<BotOrganization> {
  try {
    return normalizeBotOrganization(JSON.parse(await readFile(organizationPath(), 'utf8')))
  } catch {
    return normalizeBotOrganization(null)
  }
}

// Writes are serialized so a slow write can't land after a newer one.
let writing: Promise<unknown> = Promise.resolve()

async function writeOrganization(raw: unknown): Promise<BotOrganization> {
  const doc = normalizeBotOrganization(raw)
  const path = organizationPath()
  await mkdir(join(path, '..'), { recursive: true })
  const temp = `${path}.${process.pid}.tmp`
  await writeFile(temp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
  await rename(temp, path)
  return doc
}

export function registerBotOrganizationHandlers(): void {
  ipcMain.handle(BOT_ORGANIZATION_READ_CHANNEL, () => readOrganization())
  ipcMain.handle(BOT_ORGANIZATION_WRITE_CHANNEL, (_event, raw: unknown) => {
    const next = writing.then(() => writeOrganization(raw))
    writing = next.catch(() => undefined)
    return next
  })
}
