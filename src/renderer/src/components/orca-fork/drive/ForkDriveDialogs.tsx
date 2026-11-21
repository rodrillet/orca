// orca-fork: the Drive's small dialogs: a name (new folder, rename) and a folder to move into.
import { useState } from 'react'
import { Folder, HardDrive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { DriveFolderEntry } from './drive-host-data'
import { DRIVE_NAME_COLLATOR } from './drive-view-model'

export function DriveNameDialog({
  title,
  initial,
  confirmLabel,
  onSubmit,
  onClose
}: {
  title: string
  initial: string
  confirmLabel: string
  onSubmit: (name: string) => void
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [name, setName] = useState(initial)
  const trimmed = name.trim()
  const submit = (): void => {
    if (trimmed) {
      onSubmit(trimmed)
      onClose()
    }
  }
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent size="form">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <Input
            autoFocus
            value={name}
            maxLength={255}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => {
              const dot = event.target.value.lastIndexOf('.')
              event.target.setSelectionRange(0, dot > 0 ? dot : event.target.value.length)
            }}
          />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" disabled={!trimmed} onClick={submit}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Folders of one computer as an indented tree; what is moving (and inside it) can't be picked. */
export function DriveMoveDialog({
  folders,
  machine,
  excluded,
  current,
  onMove,
  onClose
}: {
  folders: readonly DriveFolderEntry[]
  machine: string
  excluded: ReadonlySet<string>
  current: string | null
  onMove: (folderId: string | null) => void
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const [target, setTarget] = useState<string | null>(current)
  const live = folders.filter((folder) => folder.trashedAt === null)
  const children = new Map<string | null, DriveFolderEntry[]>()
  for (const folder of live) {
    const list = children.get(folder.parentId) ?? []
    list.push(folder)
    children.set(folder.parentId, list)
  }
  const rows: { folder: DriveFolderEntry; depth: number; blocked: boolean }[] = []
  const walk = (parentId: string | null, depth: number, blocked: boolean): void => {
    const list = (children.get(parentId) ?? []).toSorted((a, b) =>
      DRIVE_NAME_COLLATOR.compare(a.name, b.name)
    )
    for (const folder of list) {
      const isBlocked = blocked || excluded.has(folder.id)
      rows.push({ folder, depth, blocked: isBlocked })
      if (depth < 32) {
        walk(folder.id, depth + 1, isBlocked)
      }
    }
  }
  walk(null, 1, false)
  const option = (
    id: string | null,
    label: string,
    depth: number,
    blocked: boolean,
    icon: React.ReactNode
  ): React.JSX.Element => (
    <button
      key={id ?? 'root'}
      type="button"
      disabled={blocked}
      onClick={() => setTarget(id)}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-[13px] hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent',
        target === id && 'bg-accent text-accent-foreground hover:bg-accent'
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent size="list">
        <DialogHeader>
          <DialogTitle>{t('orcaFork.drive.moveTo', 'Move to…')}</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto rounded-md border border-border p-1 scrollbar-sleek">
          {option(
            null,
            machine,
            0,
            false,
            <HardDrive className="size-4 shrink-0 text-muted-foreground" />
          )}
          {rows.map(({ folder, depth, blocked }) =>
            option(
              folder.id,
              folder.name,
              depth,
              blocked,
              <Folder className="size-4 shrink-0 text-muted-foreground" />
            )
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            disabled={target === current}
            onClick={() => {
              onMove(target)
              onClose()
            }}
          >
            {t('orcaFork.drive.moveHere', 'Move here')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
