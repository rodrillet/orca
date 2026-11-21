// orca-fork: what an agent writes in its chat's scratch folder (ORCA_CHAT_SCRATCH_DIR, where chat
// visuals and made files go) lands in the Drive when its turn ends. A file rewritten later is kept
// again as a new version.
import type { Dirent } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { FORK_FEATURES } from '../../../shared/orca-fork/fork-features'
import { DRIVE_FILE_MAX_BYTES } from '../../../shared/orca-fork/drive/drive-types'
import { nativeChatScratchFolderFor } from '../../native-chat/conversation-files/native-chat-scratch-folder'
import { getDriveStore } from './drive-store-registry'

const MAX_FILES_PER_TURN = 50
const MAX_DEPTH = 4

async function listFiles(root: string): Promise<string[]> {
  const found: string[] = []
  const walk = async (dir: string, depth: number): Promise<void> => {
    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (found.length >= MAX_FILES_PER_TURN * 4 || entry.name.startsWith('.')) {
        continue
      }
      const path = join(dir, entry.name)
      if (entry.isFile()) {
        found.push(path)
      } else if (entry.isDirectory() && depth < MAX_DEPTH) {
        await walk(path, depth + 1)
      }
    }
  }
  await walk(root, 0)
  return found
}

/** Best effort: a failed copy never touches the chat. */
export async function captureScratchFilesInDrive(
  stateDirectory: string,
  sessionId: string
): Promise<number> {
  if (!FORK_FEATURES.drive) {
    return 0
  }
  const root = nativeChatScratchFolderFor(stateDirectory, sessionId)
  const store = getDriveStore()
  let kept = 0
  for (const path of await listFiles(root)) {
    if (kept >= MAX_FILES_PER_TURN) {
      break
    }
    try {
      const info = await stat(path)
      if (!info.isFile() || info.size === 0 || info.size > DRIVE_FILE_MAX_BYTES) {
        continue
      }
      const rel = relative(root, path).split(sep).join('/')
      const originKey = `chat-scratch:${sessionId}:${rel}:${info.size}:${Math.floor(info.mtimeMs)}`
      if (await store.hasOrigin(originKey)) {
        continue
      }
      await store.addFromPath(path, {
        name: rel.split('/').pop() ?? rel,
        originKey,
        source: { kind: 'agent', sessionId }
      })
      kept++
    } catch (error) {
      console.warn('[orca-fork drive] could not keep a chat file', error)
    }
  }
  return kept
}
