// orca-fork: workspace settings › General: photo (choose, paste or drop), name and description, saved as
// they change; the machine it runs on and Delete.
import React, { useRef, useState } from 'react'
import { ClipboardPaste, ImagePlus, Laptop, Server, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host/execution-host'
import {
  FORK_WORKSPACE_DESCRIPTION_MAX,
  type ForkWorkspace
} from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import {
  canRemoveForkWorkspace,
  forkWorkspaceEdits
} from '../../../../../shared/orca-fork/workspaces/fork-workspace-edits'
import { BOT_AVATAR_ACCEPT, droppedAvatarSource } from '../../bots/bot-avatar-intake'
import { ForkWorkspaceMark } from '../workspaces/ForkWorkspaceMark'
import { forkWorkspacesStore, useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import { useForkWorkspaceMachines } from '../workspaces/use-fork-workspace-machines'
import { useSquarePictureIntake } from './square-picture-intake'
import { closeWorkspaceSettings, openWorkspaceSettings } from './workspace-settings-open'

export function WorkspaceGeneralTab({
  workspace
}: {
  workspace: ForkWorkspace
}): React.JSX.Element {
  const t = useTranslate()
  const doc = useForkWorkspaces()
  const machines = useForkWorkspaceMachines()
  const [name, setName] = useState(workspace.name)
  const [description, setDescription] = useState(workspace.description ?? '')
  const [dragging, setDragging] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const save = (patch: Parameters<typeof forkWorkspaceEdits.update>[1]): void =>
    forkWorkspacesStore.edit(forkWorkspaceEdits.update(workspace.id, patch))
  const intake = useSquarePictureIntake((photo) => save({ photo }))
  const machine = machines.find((m) => m.hostId === workspace.hostId)
  const MachineIcon = workspace.hostId === LOCAL_EXECUTION_HOST_ID ? Laptop : Server
  const removable = canRemoveForkWorkspace(doc, workspace.id)

  const pasteFromClipboard = async (): Promise<void> => {
    try {
      for (const item of await navigator.clipboard.read()) {
        const type = item.types.find((entry) => entry.startsWith('image/'))
        if (type) {
          intake.take(await item.getType(type))
          return
        }
      }
    } catch {
      // No clipboard access or nothing readable: the hint below says to paste with the keyboard.
    }
  }

  return (
    <div className="flex flex-col gap-6" onPaste={intake.onPaste}>
      <section className="flex flex-col gap-3">
        <Label>{t('orcaFork.workspaceSettings.photo', 'Photo')}</Label>
        <div
          className={cn(
            'flex items-center gap-4 rounded-lg border border-dashed border-transparent p-1 transition-colors',
            dragging && 'border-ring bg-accent/40'
          )}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            intake.take(droppedAvatarSource(event.dataTransfer))
          }}
        >
          <ForkWorkspaceMark
            workspace={{ name: workspace.name, photo: workspace.photo }}
            size={72}
            className="rounded-xl"
          />
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus className="size-4" />
                {workspace.photo
                  ? t('orcaFork.workspaces.changePhoto', 'Change photo')
                  : t('orcaFork.workspaces.addPhoto', 'Add photo')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={pasteFromClipboard}>
                <ClipboardPaste className="size-4" />
                {t('orcaFork.workspaceSettings.pastePhoto', 'Paste')}
              </Button>
              {workspace.photo ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => save({ photo: null })}
                >
                  {t('orcaFork.workspaces.removePhoto', 'Remove photo')}
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                'orcaFork.workspaceSettings.photoHint',
                'Choose an image, drop it here or paste it (⌘V / Ctrl+V).'
              )}
            </p>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={BOT_AVATAR_ACCEPT}
            className="hidden"
            onChange={(event) => {
              intake.take(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-1.5">
        <Label htmlFor="fork-workspace-settings-name">
          {t('orcaFork.workspaces.name', 'Name')}
        </Label>
        <Input
          id="fork-workspace-settings-name"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => (name.trim() ? save({ name: name.trim() }) : setName(workspace.name))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
        />
      </section>

      <section className="flex flex-col gap-1.5">
        <Label htmlFor="fork-workspace-settings-description">
          {t('orcaFork.workspaceSettings.description', 'Description')}
        </Label>
        <Textarea
          id="fork-workspace-settings-description"
          value={description}
          rows={3}
          maxLength={FORK_WORKSPACE_DESCRIPTION_MAX}
          placeholder={t(
            'orcaFork.workspaceSettings.descriptionPlaceholder',
            'What this workspace is for, who its agents work for…'
          )}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => save({ description: description.trim() || undefined })}
        />
      </section>

      <section className="flex flex-col gap-1.5">
        <Label>{t('orcaFork.workspaces.machine', 'Runs on')}</Label>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <MachineIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">
              {machine?.label ?? t('orcaFork.workspaces.machineOffline', 'Machine not paired')}
            </span>
          </span>
          <Button variant="ghost" size="sm" onClick={() => openWorkspaceSettings('machine')}>
            {t('orcaFork.workspaceSettings.seeMachine', 'See machine')}
          </Button>
        </div>
      </section>

      <section className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {removable
            ? t(
                'orcaFork.workspaceSettings.deleteHint',
                "Its projects and bots go back to their machine's first workspace."
              )
            : t(
                'orcaFork.workspaces.lastOnMachine',
                "A machine's only workspace can't be deleted."
              )}
        </p>
        <Button
          variant={confirmDelete ? 'destructive' : 'ghost-destructive'}
          size="sm"
          disabled={!removable}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true)
              return
            }
            forkWorkspacesStore.edit(forkWorkspaceEdits.remove(workspace.id))
            closeWorkspaceSettings()
          }}
          onBlur={() => setConfirmDelete(false)}
        >
          <Trash2 className="size-4" />
          {confirmDelete
            ? t('orcaFork.workspaceSettings.confirmDelete', 'Delete for good')
            : t('orcaFork.workspaces.delete', 'Delete workspace')}
        </Button>
      </section>
    </div>
  )
}
