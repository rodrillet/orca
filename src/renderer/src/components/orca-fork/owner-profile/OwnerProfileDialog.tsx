// orca-fork: the owner's profile: photo (choose, paste or drop), name, status (available, busy, away)
// and a short custom status, as agentes.chat's profile and status dialog.
import React, { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
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
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { BOT_AVATAR_ACCEPT, droppedAvatarSource } from '../../bots/bot-avatar-intake'
import { useSquarePictureIntake } from '../workspace-settings/square-picture-intake'
import { OwnerAvatar, useOwnerPresenceLabel } from './OwnerAvatar'
import { closeOwnerProfile, useOwnerProfileOpen } from './owner-profile-open'
import {
  OWNER_NAME_MAX,
  OWNER_PRESENCES,
  OWNER_STATUS_MAX,
  ownerProfileStore,
  saveOwnerProfile,
  type OwnerPresence
} from './owner-profile-store'

const PRESENCE_DOT: Record<OwnerPresence, string> = {
  available: 'bg-status-success',
  busy: 'bg-destructive',
  away: 'bg-status-warning'
}

function PresenceOption({
  presence,
  selected,
  onSelect
}: {
  presence: OwnerPresence
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const label = useOwnerPresenceLabel(presence)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors',
        selected
          ? 'border-ring bg-accent text-accent-foreground'
          : 'border-border hover:bg-accent/50'
      )}
    >
      <span className={cn('size-2.5 rounded-full', PRESENCE_DOT[presence])} aria-hidden="true" />
      {label}
    </button>
  )
}

export function OwnerProfileDialog(): React.JSX.Element {
  const open = useOwnerProfileOpen()
  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeOwnerProfile()}>
      {open ? <OwnerProfileBody /> : null}
    </Dialog>
  )
}

function OwnerProfileBody(): React.JSX.Element {
  const t = useTranslate()
  const saved = ownerProfileStore.get()
  const [name, setName] = useState(saved.name)
  const [photo, setPhoto] = useState(saved.photo)
  const [presence, setPresence] = useState(saved.presence)
  const [status, setStatus] = useState(saved.status)
  const fileInput = useRef<HTMLInputElement>(null)
  const intake = useSquarePictureIntake(setPhoto)

  return (
    <DialogContent className="sm:max-w-[440px]" onPaste={intake.onPaste}>
      <DialogHeader>
        <DialogTitle>{t('orcaFork.ownerProfile.title', 'Your profile')}</DialogTitle>
        <DialogDescription>
          {t(
            'orcaFork.ownerProfile.description',
            'Your photo and status in the sidebar and in each workspace’s members.'
          )}
        </DialogDescription>
      </DialogHeader>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          saveOwnerProfile({ name: name.trim(), photo, presence, status: status.trim() })
          closeOwnerProfile()
        }}
      >
        <div
          className="flex items-center gap-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            intake.take(droppedAvatarSource(event.dataTransfer))
          }}
        >
          <OwnerAvatar className="size-14 text-xl" photo={photo} />
          <div className="flex flex-col gap-1.5">
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
            </div>
            <p className="text-xs text-muted-foreground">
              {t('orcaFork.ownerProfile.photoHint', 'Or paste an image here (⌘V / Ctrl+V).')}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fork-owner-name">{t('orcaFork.ownerProfile.name', 'Name')}</Label>
          <Input
            id="fork-owner-name"
            value={name}
            maxLength={OWNER_NAME_MAX}
            placeholder={t(
              'orcaFork.ownerProfile.namePlaceholder',
              'How agents and people see you'
            )}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t('orcaFork.ownerProfile.presence', 'Status')}</Label>
          <div role="radiogroup" className="flex gap-2">
            {OWNER_PRESENCES.map((option) => (
              <PresenceOption
                key={option}
                presence={option}
                selected={presence === option}
                onSelect={() => setPresence(option)}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fork-owner-status">
            {t('orcaFork.ownerProfile.customStatus', 'Custom status')}
          </Label>
          <Input
            id="fork-owner-status"
            value={status}
            maxLength={OWNER_STATUS_MAX}
            placeholder={t('orcaFork.ownerProfile.statusPlaceholder', 'In a meeting until 3pm…')}
            onChange={(event) => setStatus(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" size="sm" onClick={closeOwnerProfile}>
            {t('orcaFork.workspaces.cancel', 'Cancel')}
          </Button>
          <Button type="submit" size="sm">
            {t('orcaFork.workspaces.save', 'Save')}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
