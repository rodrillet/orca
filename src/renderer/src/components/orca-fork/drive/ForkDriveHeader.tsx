// orca-fork: the Drive page's title row (Trash, New folder, Upload), its folder trail and the bar a
// selection brings.
import { useRef } from 'react'
import {
  ArchiveRestore,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FolderInput,
  FolderPlus,
  Trash2,
  Upload,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import type { DriveFolderEntry } from './drive-host-data'
import type { DriveMachine } from './ForkDriveToolbar'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'

export function ForkDriveHeader({
  trash,
  trashCount,
  onTrash,
  onNewFolder,
  uploadPlaces,
  onUpload,
  onEmptyTrash
}: {
  trash: boolean
  trashCount: number
  onTrash: (open: boolean) => void
  onNewFolder: () => void
  /** Computers that keep a Drive; with more than one, Upload asks which. */
  uploadPlaces: readonly DriveMachine[]
  onUpload: (hostId: ExecutionHostId | null, files: File[]) => void
  onEmptyTrash: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const input = useRef<HTMLInputElement>(null)
  const pickedHost = useRef<ExecutionHostId | null>(null)
  const pick = (hostId: ExecutionHostId | null): void => {
    pickedHost.current = hostId
    input.current?.click()
  }
  return (
    <header
      className="flex shrink-0 items-start gap-3 px-3 pb-3 md:px-5"
      style={{ paddingRight: 'max(0.75rem, var(--window-controls-width, 0px))' }}
    >
      <div className="min-w-0 flex-1">
        {trash ? (
          <button
            type="button"
            onClick={() => onTrash(false)}
            className="flex items-center gap-1.5 text-base font-semibold leading-8 hover:text-muted-foreground"
          >
            <ArrowLeft className="size-4" />
            {t('orcaFork.drive.trash', 'Trash')}
          </button>
        ) : (
          <h1 className="truncate text-base font-semibold leading-8">
            {t('orcaFork.drive.title', 'Drive')}
          </h1>
        )}
        <p className="text-xs text-muted-foreground">
          {trash
            ? t('orcaFork.drive.trashSubtitle', 'Restore a file, or delete it for good.')
            : t(
                'orcaFork.drive.subtitle',
                'Everything you and your agents uploaded or made, on every computer.'
              )}
        </p>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ''
          if (files.length > 0) {
            onUpload(pickedHost.current, files)
          }
        }}
      />
      {trash ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={trashCount === 0}
          onClick={onEmptyTrash}
        >
          <Trash2 className="size-3.5" />
          {t('orcaFork.drive.emptyTrash', 'Empty trash')}
        </Button>
      ) : (
        <>
          <Button type="button" variant="ghost" size="sm" onClick={() => onTrash(true)}>
            <Trash2 className="size-3.5" />
            {t('orcaFork.drive.trash', 'Trash')}
            {trashCount > 0 ? (
              <span className="text-muted-foreground tabular-nums">{trashCount}</span>
            ) : null}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onNewFolder}>
            <FolderPlus className="size-3.5" />
            {t('orcaFork.drive.newFolder', 'New folder')}
          </Button>
          {uploadPlaces.length > 1 ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm">
                  <Upload className="size-3.5" />
                  {t('orcaFork.drive.upload', 'Upload')}
                  <ChevronDown className="size-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {uploadPlaces.map((place) => (
                  <DropdownMenuItem key={place.key} onSelect={() => pick(place.key)}>
                    {t('orcaFork.drive.uploadTo', 'To {{name}}', { name: place.label })}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button type="button" size="sm" onClick={() => pick(null)}>
              <Upload className="size-3.5" />
              {t('orcaFork.drive.upload', 'Upload')}
            </Button>
          )}
        </>
      )}
    </header>
  )
}

export function ForkDriveTrail({
  trail,
  machine,
  onOpen
}: {
  trail: readonly DriveFolderEntry[]
  machine: string | null
  onOpen: (folder: DriveFolderEntry | null) => void
}): React.JSX.Element | null {
  const t = useTranslate()
  if (trail.length === 0) {
    return null
  }
  return (
    <nav
      className="flex min-w-0 items-center gap-1 text-[13px]"
      aria-label={t('orcaFork.drive.trail', 'Folder')}
    >
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onOpen(null)}
      >
        {t('orcaFork.drive.title', 'Drive')}
        {machine ? ` · ${machine}` : ''}
      </button>
      {trail.map((folder, index) => (
        <span key={folder.id} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
          {index === trail.length - 1 ? (
            <span className="truncate font-medium">{folder.name}</span>
          ) : (
            <button
              type="button"
              className="truncate text-muted-foreground hover:text-foreground"
              onClick={() => onOpen(folder)}
            >
              {folder.name}
            </button>
          )}
        </span>
      ))}
    </nav>
  )
}

export function ForkDriveSelectionBar({
  count,
  trash,
  canDownload,
  canMove,
  onDownload,
  onMove,
  onTrash,
  onRestore,
  onDeleteForever,
  onClear
}: {
  count: number
  trash: boolean
  canDownload: boolean
  canMove: boolean
  onDownload: () => void
  onMove: () => void
  onTrash: () => void
  onRestore: () => void
  onDeleteForever: () => void
  onClear: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onClear}
        aria-label={t('orcaFork.drive.clearSelection', 'Clear selection')}
      >
        <X className="size-3.5" />
      </Button>
      <span className="px-1 text-xs font-medium tabular-nums">
        {t('orcaFork.drive.selected', '{{count}} selected', { count })}
      </span>
      <div className="flex-1" />
      {trash ? (
        <>
          <Button type="button" variant="ghost" size="xs" onClick={onRestore}>
            <ArchiveRestore />
            {t('orcaFork.drive.restore', 'Restore')}
          </Button>
          <Button type="button" variant="ghost-destructive" size="xs" onClick={onDeleteForever}>
            <Trash2 />
            {t('orcaFork.drive.deleteForever', 'Delete forever')}
          </Button>
        </>
      ) : (
        <>
          {canDownload ? (
            <Button type="button" variant="ghost" size="xs" onClick={onDownload}>
              <Download />
              {t('orcaFork.drive.download', 'Download')}
            </Button>
          ) : null}
          {canMove ? (
            <Button type="button" variant="ghost" size="xs" onClick={onMove}>
              <FolderInput />
              {t('orcaFork.drive.moveTo', 'Move to…')}
            </Button>
          ) : null}
          <Button type="button" variant="ghost-destructive" size="xs" onClick={onTrash}>
            <Trash2 />
            {t('orcaFork.drive.moveToTrash', 'Move to trash')}
          </Button>
        </>
      )}
    </div>
  )
}
