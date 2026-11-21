// orca-fork: New workspace / Workspace settings: name, photo and the machine it runs on.
import React, { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HostCombobox } from '@/components/host-picker/HostCombobox'
import { useTranslate } from '@/i18n/use-translate'
import { BOT_AVATAR_TOO_SMALL, squareAvatarPng } from '@/components/bots/bot-avatar-upload'
import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import {
  newForkWorkspaceId,
  type ForkWorkspace
} from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import {
  canRemoveForkWorkspace,
  forkWorkspaceEdits
} from '../../../../../shared/orca-fork/workspaces/fork-workspace-edits'
import { ForkWorkspaceMark } from './ForkWorkspaceMark'
import { forkWorkspacesStore, useForkWorkspaces } from './fork-workspaces-store'
import { useForkWorkspaceMachines } from './use-fork-workspace-machines'

const PHOTO_SIZE = 256
const PHOTO_MIN_SIDE = 32

export type ForkWorkspaceDialogTarget =
  | { mode: 'create' }
  | { mode: 'edit'; workspace: ForkWorkspace }

export function ForkWorkspaceDialog({
  target,
  onClose
}: {
  target: ForkWorkspaceDialogTarget | null
  onClose: () => void
}): React.JSX.Element {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      {target ? (
        <ForkWorkspaceDialogBody
          key={target.mode === 'edit' ? target.workspace.id : 'create'}
          target={target}
          onClose={onClose}
        />
      ) : null}
    </Dialog>
  )
}

function ForkWorkspaceDialogBody({
  target,
  onClose
}: {
  target: ForkWorkspaceDialogTarget
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const doc = useForkWorkspaces()
  const machines = useForkWorkspaceMachines()
  const editing = target.mode === 'edit' ? target.workspace : null
  const [name, setName] = useState(editing?.name ?? '')
  const [photo, setPhoto] = useState<string | null>(editing?.photo ?? null)
  const [hostId, setHostId] = useState<ExecutionHostId>(editing?.hostId ?? LOCAL_EXECUTION_HOST_ID)
  const fileInput = useRef<HTMLInputElement>(null)
  const trimmed = name.trim()
  const machineLabel = (id: ExecutionHostId): string =>
    machines.find((m) => m.hostId === id)?.label ?? id

  const pickPhoto = async (file: File | undefined): Promise<void> => {
    if (!file) {
      return
    }
    try {
      const base64 = await squareAvatarPng(file, { size: PHOTO_SIZE, minSide: PHOTO_MIN_SIDE })
      setPhoto(`data:image/png;base64,${base64}`)
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === BOT_AVATAR_TOO_SMALL
          ? t('orcaFork.workspaces.photoTooSmall', 'That picture is too small.')
          : t('orcaFork.workspaces.photoUnreadable', "That file couldn't be read as a picture.")
      )
    }
  }

  const save = (): void => {
    if (!trimmed) {
      return
    }
    if (editing) {
      forkWorkspacesStore.edit(forkWorkspaceEdits.update(editing.id, { name: trimmed, photo }))
    } else {
      forkWorkspacesStore.edit(
        forkWorkspaceEdits.add({
          id: newForkWorkspaceId(),
          name: trimmed,
          photo,
          hostId,
          repoIds: [],
          botKeys: [],
          createdAt: Date.now()
        })
      )
    }
    onClose()
  }

  const removable = editing ? canRemoveForkWorkspace(doc, editing.id) : false

  return (
    <DialogContent className="sm:max-w-[440px]">
      <DialogHeader>
        <DialogTitle>
          {editing
            ? t('orcaFork.workspaces.settingsTitle', 'Workspace settings')
            : t('orcaFork.workspaces.newTitle', 'New workspace')}
        </DialogTitle>
        <DialogDescription>
          {t(
            'orcaFork.workspaces.description',
            'A workspace holds its bots, teams, projects, wiki, drive and chats, on one machine.'
          )}
        </DialogDescription>
      </DialogHeader>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div className="flex items-center gap-3">
          <ForkWorkspaceMark workspace={{ name: trimmed || '?', photo }} size={56} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus className="size-4" />
              {photo
                ? t('orcaFork.workspaces.changePhoto', 'Change photo')
                : t('orcaFork.workspaces.addPhoto', 'Add photo')}
            </Button>
            {photo ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                {t('orcaFork.workspaces.removePhoto', 'Remove photo')}
              </Button>
            ) : null}
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                void pickPhoto(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fork-workspace-name">{t('orcaFork.workspaces.name', 'Name')}</Label>
          <Input
            id="fork-workspace-name"
            autoFocus
            value={name}
            maxLength={80}
            placeholder={t('orcaFork.workspaces.namePlaceholder', 'Acme, Personal…')}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('orcaFork.workspaces.machine', 'Runs on')}</Label>
          {editing ? (
            <p className="text-sm text-muted-foreground">{machineLabel(editing.hostId)}</p>
          ) : (
            <HostCombobox
              value={hostId}
              ariaLabel={t('orcaFork.workspaces.machine', 'Runs on')}
              options={machines.map((machine) => ({ id: machine.hostId, label: machine.label }))}
              onChange={(value) => {
                const machine = machines.find((m) => m.hostId === value)
                if (machine) {
                  setHostId(machine.hostId)
                }
              }}
            />
          )}
          <p className="text-xs text-muted-foreground">
            {t(
              'orcaFork.workspaces.machineHint',
              'This computer, a paired server, or another workspace on the same machine.'
            )}
          </p>
        </div>
        <DialogFooter className="sm:justify-between">
          {editing ? (
            <Button
              type="button"
              variant="ghost-destructive"
              size="sm"
              disabled={!removable}
              title={
                removable
                  ? undefined
                  : t(
                      'orcaFork.workspaces.lastOnMachine',
                      "A machine's only workspace can't be deleted."
                    )
              }
              onClick={() => {
                forkWorkspacesStore.edit(forkWorkspaceEdits.remove(editing.id))
                onClose()
              }}
            >
              <Trash2 className="size-4" />
              {t('orcaFork.workspaces.delete', 'Delete workspace')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {t('orcaFork.workspaces.cancel', 'Cancel')}
            </Button>
            <Button type="submit" size="sm" disabled={!trimmed}>
              {editing
                ? t('orcaFork.workspaces.save', 'Save')
                : t('orcaFork.workspaces.create', 'Create workspace')}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
