// orca-fork: a Drive card's preview: the image itself, the first lines of a text file, else the
// kind's icon.
import { useEffect, useState } from 'react'
import {
  Archive,
  File,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Music,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/class-names'
import {
  isDriveTextKind,
  type DriveFileKind,
  type DriveWorkspaceId
} from '../../../../../shared/orca-fork/drive/drive-types'
import type { DriveEntry } from './drive-host-data'
import { readDriveFile } from './drive-transfer'

const KIND_ICONS: Record<DriveFileKind, LucideIcon> = {
  image: FileImage,
  pdf: FileType,
  markdown: FileText,
  text: FileText,
  code: FileCode,
  video: FileVideo,
  audio: Music,
  archive: Archive,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  other: File
}

export function DriveKindIcon({
  kind,
  className
}: {
  kind: DriveFileKind
  className?: string
}): React.JSX.Element {
  const Icon = KIND_ICONS[kind]
  return <Icon className={className} aria-hidden />
}

const THUMB_IMAGE_MAX_BYTES = 8 * 1024 * 1024
const THUMB_TEXT_BYTES = 2048

type Thumb = { kind: 'image'; url: string } | { kind: 'text'; text: string }

// Thumbnails outlive a re-render of the grid; a file's bytes never change under its id.
const cache = new Map<string, Promise<Thumb | null>>()

function thumbKey(file: DriveEntry): string {
  return `${file.hostId}\u0000${file.id}`
}

function loadThumb(file: DriveEntry, workspaceId: DriveWorkspaceId | null): Promise<Thumb | null> {
  const key = thumbKey(file)
  let pending = cache.get(key)
  if (!pending) {
    pending = (async (): Promise<Thumb | null> => {
      if (file.kind === 'image' && file.byteLength <= THUMB_IMAGE_MAX_BYTES) {
        const { bytes } = await readDriveFile(file, workspaceId)
        return {
          kind: 'image',
          url: URL.createObjectURL(new Blob([bytes], { type: file.mimeType }))
        }
      }
      if (isDriveTextKind(file.kind)) {
        const { bytes } = await readDriveFile(file, workspaceId, THUMB_TEXT_BYTES)
        return { kind: 'text', text: new TextDecoder().decode(bytes.subarray(0, THUMB_TEXT_BYTES)) }
      }
      return null
    })().catch(() => {
      cache.delete(key)
      return null
    })
    cache.set(key, pending)
  }
  return pending
}

export function useDriveThumb(
  file: DriveEntry,
  workspaceId: DriveWorkspaceId | null
): Thumb | null {
  const [thumb, setThumb] = useState<Thumb | null>(null)
  useEffect(() => {
    let live = true
    void loadThumb(file, workspaceId).then((loaded) => {
      if (live) {
        setThumb(loaded)
      }
    })
    return () => {
      live = false
    }
  }, [file, workspaceId])
  return thumb
}

export function ForkDriveThumbnail({
  file,
  workspaceId,
  className
}: {
  file: DriveEntry
  workspaceId: DriveWorkspaceId | null
  className?: string
}): React.JSX.Element {
  const thumb = useDriveThumb(file, workspaceId)
  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden bg-muted/60 text-muted-foreground',
        className
      )}
    >
      {thumb?.kind === 'image' ? (
        <img src={thumb.url} alt="" className="size-full object-cover" draggable={false} />
      ) : thumb?.kind === 'text' ? (
        <pre className="size-full overflow-hidden whitespace-pre-wrap break-words px-3 pb-3 pt-9 text-left font-mono text-[9px] leading-[1.35] text-muted-foreground">
          {thumb.text}
        </pre>
      ) : (
        <DriveKindIcon kind={file.kind} className="size-9 opacity-70" />
      )}
    </div>
  )
}
