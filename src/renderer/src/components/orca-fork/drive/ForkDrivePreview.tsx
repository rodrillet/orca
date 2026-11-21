// orca-fork: a Drive file opened: its preview, where it came from (with a way back to that chat),
// its details and its actions.
import { Download, Filter, FolderInput, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import type { DriveWorkspaceId } from '../../../../../shared/orca-fork/drive/drive-types'
import type { DriveEntry } from './drive-host-data'
import { formatDriveBytes } from './drive-view-model'
import { useDriveFileOrigin } from './drive-file-origin'
import { ForkDrivePreviewBody } from './ForkDrivePreviewBody'
import type { DriveItemHandlers } from './ForkDriveItemMenu'

function Fact({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-[13px]">{children}</dd>
    </div>
  )
}

export function ForkDrivePreview({
  file,
  workspaceId,
  machine,
  folderPath,
  handlers,
  onClose
}: {
  file: DriveEntry
  workspaceId: DriveWorkspaceId | null
  machine: string
  folderPath: string
  handlers: DriveItemHandlers
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const locale = useIntlLocale()
  const origin = useDriveFileOrigin(file)
  const source = file.source
  const date = (at: number): string =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(at)
  const download = handlers.onDownload ?? (() => undefined)
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="flex h-[85vh] max-h-[85vh] w-[94vw] max-w-[94vw] flex-col overflow-hidden sm:max-w-[1200px]">
        <div className="flex shrink-0 items-center gap-3 border-b border-border pb-3 pr-8">
          <div className="min-w-0 flex-1">
            <DialogTitle>
              <span className="block truncate">{file.name}</span>
            </DialogTitle>
            <DialogDescription>
              <span className="block truncate">
                {origin.label} · {formatDriveBytes(file.byteLength)}
              </span>
            </DialogDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <Download className="size-3.5" />
            {t('orcaFork.drive.download', 'Download')}
          </Button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="min-h-0 min-w-0 flex-1">
            <ForkDrivePreviewBody file={file} workspaceId={workspaceId} onDownload={download} />
          </div>
          <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border pl-5 scrollbar-sleek md:flex">
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold">
                {t('orcaFork.drive.cameFrom', 'Where it came from')}
              </h3>
              <div className="flex items-center gap-2 text-[13px]">
                {origin.avatar}
                <span className="min-w-0 truncate">{origin.label}</span>
              </div>
              {source.kind === 'agent' && source.note ? (
                <p className="rounded-md bg-muted/60 px-2.5 py-2 text-xs text-muted-foreground">
                  {source.note}
                </p>
              ) : null}
              {source.kind === 'chat-attachment' && source.excerpt ? (
                <p className="rounded-md bg-muted/60 px-2.5 py-2 text-xs italic text-muted-foreground">
                  “{source.excerpt}”
                </p>
              ) : null}
              {handlers.onOpenChat ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={handlers.onOpenChat}
                >
                  <MessageSquare className="size-3.5" />
                  {t('orcaFork.drive.openChat', 'Open the chat it came from')}
                </Button>
              ) : null}
              {handlers.onFilesFromChat ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={handlers.onFilesFromChat}
                >
                  <Filter className="size-3.5" />
                  {t('orcaFork.drive.filesFromChat', 'Files from this chat')}
                </Button>
              ) : null}
            </section>
            <dl className="flex flex-col gap-3">
              <Fact label={t('orcaFork.drive.fact.kind', 'Kind')}>
                {t(`orcaFork.drive.kind.${file.kind}`, file.kind)}
              </Fact>
              <Fact label={t('orcaFork.drive.fact.size', 'Size')}>
                {formatDriveBytes(file.byteLength)}
              </Fact>
              <Fact label={t('orcaFork.drive.fact.location', 'Location')}>{folderPath}</Fact>
              <Fact label={t('orcaFork.drive.fact.machine', 'Computer')}>{machine}</Fact>
              <Fact label={t('orcaFork.drive.fact.added', 'Added')}>{date(file.createdAt)}</Fact>
              <Fact label={t('orcaFork.drive.fact.modified', 'Modified')}>
                {date(file.updatedAt)}
              </Fact>
            </dl>
            <section className="mt-auto flex flex-col gap-1">
              {handlers.onRename ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={handlers.onRename}
                >
                  <Pencil className="size-3.5" />
                  {t('orcaFork.drive.rename', 'Rename…')}
                </Button>
              ) : null}
              {handlers.onMove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={handlers.onMove}
                >
                  <FolderInput className="size-3.5" />
                  {t('orcaFork.drive.moveTo', 'Move to…')}
                </Button>
              ) : null}
              {handlers.onTrash ? (
                <Button
                  type="button"
                  variant="ghost-destructive"
                  size="sm"
                  className="justify-start"
                  onClick={handlers.onTrash}
                >
                  <Trash2 className="size-3.5" />
                  {t('orcaFork.drive.moveToTrash', 'Move to trash')}
                </Button>
              ) : null}
            </section>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}
