// orca-fork: Drive files and folders as grid cards or list rows, each with its menu.
import type { MouseEvent } from 'react'
import { Folder, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useIntlLocale, useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { DriveWorkspaceId } from '../../../../../shared/orca-fork/drive/drive-types'
import type { DriveEntry, DriveFolderEntry } from './drive-host-data'
import { formatDriveBytes } from './drive-view-model'
import { DriveItemMenuItems, type DriveItemHandlers } from './ForkDriveItemMenu'
import { DriveKindIcon, ForkDriveThumbnail } from './ForkDriveThumbnail'
import { useDriveFileOrigin } from './drive-file-origin'

type ItemProps = {
  selected: boolean
  onPick: (event: MouseEvent) => void
  onToggle: () => void
  handlers: DriveItemHandlers
  machine: string | null
}

function ItemContextMenu({
  handlers,
  kind,
  children
}: {
  handlers: DriveItemHandlers
  kind: 'file' | 'folder'
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <DriveItemMenuItems
          handlers={handlers}
          kind={kind}
          Item={ContextMenuItem}
          Separator={ContextMenuSeparator}
        />
      </ContextMenuContent>
    </ContextMenu>
  )
}

function ItemMoreMenu({
  handlers,
  kind,
  className
}: {
  handlers: DriveItemHandlers
  kind: 'file' | 'folder'
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <span className={cn('flex', className)}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('orcaFork.drive.more', 'More actions')}
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DriveItemMenuItems
            handlers={handlers}
            kind={kind}
            Item={DropdownMenuItem}
            Separator={DropdownMenuSeparator}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}

function useWhen(at: number): string {
  const locale = useIntlLocale()
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(at)
}

export function DriveFileCard({
  file,
  workspaceId,
  selected,
  onPick,
  onToggle,
  handlers,
  machine
}: ItemProps & { file: DriveEntry; workspaceId: DriveWorkspaceId | null }): React.JSX.Element {
  const t = useTranslate()
  const origin = useDriveFileOrigin(file)
  const when = useWhen(file.updatedAt)
  return (
    <ItemContextMenu handlers={handlers} kind="file">
      <article
        className={cn(
          'group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-foreground/25',
          selected && 'border-primary ring-1 ring-primary'
        )}
      >
        <ForkDriveThumbnail file={file} workspaceId={workspaceId} className="aspect-[4/3] w-full" />
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
          <DriveKindIcon kind={file.kind} className="size-3" />
          {t(`orcaFork.drive.kind.${file.kind}`, file.kind)}
        </span>
        <div className="flex min-w-0 flex-col gap-1 px-3 pb-2.5 pt-2">
          <button
            type="button"
            onClick={onPick}
            className="truncate text-left text-[13px] font-medium after:absolute after:inset-0 focus-visible:outline-none"
            title={file.name}
          >
            {file.name}
          </button>
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            {origin.avatar}
            <span className="truncate">{origin.label}</span>
            <span className="ml-auto shrink-0 tabular-nums" title={when}>
              {formatDriveBytes(file.byteLength)}
            </span>
          </span>
          {machine ? (
            <span className="truncate text-[11px] text-muted-foreground/80">{machine}</span>
          ) : null}
        </div>
        <span
          className={cn(
            'absolute right-2 top-2 z-10 flex rounded-[4px] bg-background',
            !selected && 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
          )}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={t('orcaFork.drive.select', 'Select {{name}}', { name: file.name })}
          />
        </span>
        <ItemMoreMenu
          handlers={handlers}
          kind="file"
          className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100"
        />
      </article>
    </ItemContextMenu>
  )
}

export function DriveFolderCard({
  folder,
  count,
  selected,
  onPick,
  onToggle,
  handlers,
  machine
}: ItemProps & { folder: DriveFolderEntry; count: number }): React.JSX.Element {
  const t = useTranslate()
  return (
    <ItemContextMenu handlers={handlers} kind="folder">
      <article
        className={cn(
          'group relative flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/25',
          selected && 'border-primary ring-1 ring-primary'
        )}
      >
        <Folder className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="flex min-w-0 flex-1 flex-col">
          <button
            type="button"
            onClick={onPick}
            className="truncate text-left text-[13px] font-medium after:absolute after:inset-0 focus-visible:outline-none"
          >
            {folder.name}
          </button>
          <span className="truncate text-[11px] text-muted-foreground">
            {t('orcaFork.drive.itemCount', '{{count}} item(s)', { count })}
            {machine ? ` · ${machine}` : ''}
          </span>
        </div>
        <span
          className={cn(
            'relative z-10 flex',
            !selected && 'opacity-0 focus-within:opacity-100 group-hover:opacity-100'
          )}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={t('orcaFork.drive.select', 'Select {{name}}', { name: folder.name })}
          />
        </span>
        <ItemMoreMenu
          handlers={handlers}
          kind="folder"
          className="relative z-10 opacity-0 group-hover:opacity-100 has-[[data-state=open]]:opacity-100"
        />
      </article>
    </ItemContextMenu>
  )
}

const ROW_CLASS =
  'group relative grid grid-cols-[20px_minmax(0,1fr)_minmax(0,180px)_90px_150px_32px] items-center gap-3 border-b border-border/60 px-2 py-1.5 text-[13px] hover:bg-muted/50'

export function DriveListHeader(): React.JSX.Element {
  const t = useTranslate()
  return (
    <div
      className={cn(
        ROW_CLASS,
        'sticky top-0 z-10 bg-background text-[11px] font-medium text-muted-foreground hover:bg-background'
      )}
    >
      <span />
      <span>{t('orcaFork.drive.column.name', 'Name')}</span>
      <span>{t('orcaFork.drive.column.from', 'From')}</span>
      <span>{t('orcaFork.drive.column.size', 'Size')}</span>
      <span>{t('orcaFork.drive.column.modified', 'Modified')}</span>
      <span />
    </div>
  )
}

export function DriveFileRow({
  file,
  selected,
  onPick,
  onToggle,
  handlers,
  machine
}: ItemProps & { file: DriveEntry }): React.JSX.Element {
  const t = useTranslate()
  const origin = useDriveFileOrigin(file)
  const when = useWhen(file.updatedAt)
  return (
    <ItemContextMenu handlers={handlers} kind="file">
      <div className={cn(ROW_CLASS, selected && 'bg-accent hover:bg-accent')}>
        <span className="relative z-10 flex">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={t('orcaFork.drive.select', 'Select {{name}}', { name: file.name })}
          />
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <DriveKindIcon kind={file.kind} className="size-4 shrink-0 text-muted-foreground" />
          <button
            type="button"
            onClick={onPick}
            className="truncate text-left after:absolute after:inset-0 focus-visible:outline-none"
            title={file.name}
          >
            {file.name}
          </button>
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {origin.avatar}
          <span className="truncate">
            {machine ? `${origin.label} · ${machine}` : origin.label}
          </span>
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatDriveBytes(file.byteLength)}
        </span>
        <span className="truncate text-xs text-muted-foreground">{when}</span>
        <ItemMoreMenu handlers={handlers} kind="file" className="relative z-10" />
      </div>
    </ItemContextMenu>
  )
}

export function DriveFolderRow({
  folder,
  count,
  selected,
  onPick,
  onToggle,
  handlers,
  machine
}: ItemProps & { folder: DriveFolderEntry; count: number }): React.JSX.Element {
  const t = useTranslate()
  const when = useWhen(folder.createdAt)
  return (
    <ItemContextMenu handlers={handlers} kind="folder">
      <div className={cn(ROW_CLASS, selected && 'bg-accent hover:bg-accent')}>
        <span className="relative z-10 flex">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggle}
            aria-label={t('orcaFork.drive.select', 'Select {{name}}', { name: folder.name })}
          />
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <button
            type="button"
            onClick={onPick}
            className="truncate text-left font-medium after:absolute after:inset-0 focus-visible:outline-none"
          >
            {folder.name}
          </button>
        </span>
        <span className="truncate text-xs text-muted-foreground">{machine ?? ''}</span>
        <span className="text-xs text-muted-foreground">
          {t('orcaFork.drive.itemCount', '{{count}} item(s)', { count })}
        </span>
        <span className="truncate text-xs text-muted-foreground">{when}</span>
        <ItemMoreMenu handlers={handlers} kind="folder" className="relative z-10" />
      </div>
    </ItemContextMenu>
  )
}
