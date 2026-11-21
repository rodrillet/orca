// orca-fork: group photos as PNG files in `<userData>/orca-fork/group-photos/<groupId>.png`.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getCanonicalUserDataPath } from '../../persistence/loading-store/user-data-path'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function photoFolder(): string {
  return join(getCanonicalUserDataPath(), 'orca-fork', 'group-photos')
}

export async function readGroupPhotos(
  groupIds: readonly string[]
): Promise<Record<string, string>> {
  const photos: Record<string, string> = {}
  await Promise.all(
    groupIds.map(async (id) => {
      try {
        const png = await readFile(join(photoFolder(), `${id}.png`))
        photos[id] = `data:image/png;base64,${png.toString('base64')}`
      } catch {
        // no photo: the group shows its members' faces
      }
    })
  )
  return photos
}

export async function writeGroupPhoto(groupId: string, png: string | null): Promise<void> {
  const file = join(photoFolder(), `${groupId}.png`)
  if (png === null) {
    await rm(file, { force: true })
    return
  }
  const bytes = Buffer.from(png, 'base64')
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('group_photo_not_png')
  }
  await mkdir(photoFolder(), { recursive: true })
  await writeFile(file, bytes)
}
