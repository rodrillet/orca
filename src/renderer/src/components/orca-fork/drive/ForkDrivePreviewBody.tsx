// orca-fork: a Drive file's content in the preview: images, PDF, Markdown, text and code, video
// and audio; anything else offers its download.
import { lazy, Suspense, useEffect, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CommentMarkdown from '@/components/comment-markdown/CommentMarkdown'
import { useTranslate } from '@/i18n/use-translate'
import {
  isDriveTextKind,
  type DriveWorkspaceId
} from '../../../../../shared/orca-fork/drive/drive-types'
import type { DriveEntry } from './drive-host-data'
import { readDriveFile } from './drive-transfer'
import { DriveKindIcon } from './ForkDriveThumbnail'

const PdfViewer = lazy(() => import('@/components/editor/pdf/PdfViewer'))

const TEXT_PREVIEW_MAX_BYTES = 2 * 1024 * 1024
const MEDIA_PREVIEW_MAX_BYTES = 200 * 1024 * 1024

type Loaded =
  | { state: 'loading' }
  | { state: 'failed' }
  | { state: 'none' }
  | { state: 'url'; url: string }
  | { state: 'base64'; base64: string }
  | { state: 'text'; text: string; truncated: boolean }

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }
  return btoa(binary)
}

function previewable(file: DriveEntry): boolean {
  return (
    isDriveTextKind(file.kind) ||
    file.kind === 'pdf' ||
    ((file.kind === 'image' || file.kind === 'video' || file.kind === 'audio') &&
      file.byteLength <= MEDIA_PREVIEW_MAX_BYTES)
  )
}

function useLoaded(file: DriveEntry, workspaceId: DriveWorkspaceId | null): Loaded {
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  useEffect(() => {
    if (!previewable(file)) {
      setLoaded({ state: 'none' })
      return
    }
    let live = true
    let url: string | null = null
    setLoaded({ state: 'loading' })
    const text = isDriveTextKind(file.kind)
    readDriveFile(file, workspaceId, text ? TEXT_PREVIEW_MAX_BYTES : Number.POSITIVE_INFINITY)
      .then(({ bytes, truncated }) => {
        if (!live) {
          return
        }
        if (text) {
          setLoaded({ state: 'text', text: new TextDecoder().decode(bytes), truncated })
        } else if (file.kind === 'pdf') {
          setLoaded({ state: 'base64', base64: bytesToBase64(bytes) })
        } else {
          url = URL.createObjectURL(new Blob([bytes], { type: file.mimeType }))
          setLoaded({ state: 'url', url })
        }
      })
      .catch((error: unknown) => {
        console.error('[orca-fork drive] preview failed', error)
        if (live) {
          setLoaded({ state: 'failed' })
        }
      })
    return () => {
      live = false
      if (url) {
        URL.revokeObjectURL(url)
      }
    }
  }, [file, workspaceId])
  return loaded
}

export function ForkDrivePreviewBody({
  file,
  workspaceId,
  onDownload
}: {
  file: DriveEntry
  workspaceId: DriveWorkspaceId | null
  onDownload: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const loaded = useLoaded(file, workspaceId)
  if (loaded.state === 'loading') {
    return (
      <div className="flex size-full items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }
  if (loaded.state === 'none' || loaded.state === 'failed') {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <DriveKindIcon kind={file.kind} className="size-12 opacity-70" />
        <p className="text-sm">
          {loaded.state === 'failed'
            ? t('orcaFork.drive.previewFailed', 'Could not load this file.')
            : t('orcaFork.drive.noPreview', 'No preview for this kind of file.')}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onDownload}>
          <Download className="size-3.5" />
          {t('orcaFork.drive.download', 'Download')}
        </Button>
      </div>
    )
  }
  if (loaded.state === 'base64') {
    return (
      <Suspense fallback={null}>
        <div className="size-full min-h-0">
          <PdfViewer content={loaded.base64} filePath={file.name} />
        </div>
      </Suspense>
    )
  }
  if (loaded.state === 'text') {
    return (
      <div className="size-full min-h-0 overflow-auto scrollbar-sleek">
        {file.kind === 'markdown' ? (
          <CommentMarkdown content={loaded.text} variant="document" className="px-6 py-4" />
        ) : (
          <pre className="whitespace-pre-wrap break-words px-5 py-4 font-mono text-xs leading-relaxed">
            {loaded.text}
          </pre>
        )}
        {loaded.truncated ? (
          <p className="px-5 pb-4 text-xs text-muted-foreground">
            {t('orcaFork.drive.truncated', 'Showing the first 2 MB. Download it for the rest.')}
          </p>
        ) : null}
      </div>
    )
  }
  return (
    <div className="flex size-full min-h-0 items-center justify-center bg-muted/40 p-4">
      {file.kind === 'video' ? (
        <video src={loaded.url} controls className="max-h-full max-w-full" />
      ) : file.kind === 'audio' ? (
        <audio src={loaded.url} controls />
      ) : (
        <img src={loaded.url} alt={file.name} className="max-h-full max-w-full object-contain" />
      )}
    </div>
  )
}
