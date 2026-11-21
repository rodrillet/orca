// orca-fork: a bot group's own photo where its members' faces would show; the faces until one is set.
import React from 'react'
import { ImageUp, ImageOff } from 'lucide-react'
import { toast } from 'sonner'
import { ContextMenuItem } from '@/components/ui/context-menu'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  avatarPngFromBlob,
  BOT_AVATAR_ACCEPT,
  BotAvatarIntakeFailure
} from '../../bots/bot-avatar-intake'
import { useIntakeErrorMessage } from '../../bots/BotPictureIntakeLine'
import { botErrorMessage } from '../../bots/bot-presentation'
import { setGroupPhoto, useGroupPhoto } from './group-photo-cache'

export function ForkGroupPicture({
  groupId,
  className,
  children
}: {
  groupId: string
  /** Sizes and rounds the photo as the faces it replaces. */
  className: string
  children: React.ReactNode
}): React.JSX.Element {
  const photo = useGroupPhoto(FORK_FEATURES.groupPhotos ? groupId : null)
  if (!photo) {
    return <>{children}</>
  }
  return (
    <img
      src={photo}
      alt=""
      draggable={false}
      className={cn('block shrink-0 rounded-full object-cover', className)}
    />
  )
}

function pickImage(onFile: (file: File) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = BOT_AVATAR_ACCEPT
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) {
      onFile(file)
    }
  }
  input.click()
}

/** "Change group photo…" and "Remove group photo" for a group's header menu or sidebar row menu. */
export function ForkGroupPhotoMenuItems({
  groupId,
  menu = 'dropdown'
}: {
  groupId: string
  menu?: 'dropdown' | 'context'
}): React.JSX.Element | null {
  const Item = menu === 'context' ? ContextMenuItem : DropdownMenuItem
  const t = useTranslate()
  const intakeMessage = useIntakeErrorMessage()
  const photo = useGroupPhoto(FORK_FEATURES.groupPhotos ? groupId : null)
  if (!FORK_FEATURES.groupPhotos) {
    return null
  }
  const fail = (error: unknown): void => {
    toast.error(
      error instanceof BotAvatarIntakeFailure ? intakeMessage(error.error) : botErrorMessage(error)
    )
  }
  const change = (): void =>
    pickImage((file) => {
      void avatarPngFromBlob(file)
        .then((png) => setGroupPhoto(groupId, png))
        .then(() => toast.success(t('orcaFork.groupPhoto.changed', 'Group photo changed')), fail)
    })
  return (
    <>
      <Item onSelect={change}>
        <ImageUp className="size-3.5" />
        {t('orcaFork.groupPhoto.change', 'Change group photo…')}
      </Item>
      {photo ? (
        <Item onSelect={() => void setGroupPhoto(groupId, null).catch(fail)}>
          <ImageOff className="size-3.5" />
          {t('orcaFork.groupPhoto.remove', 'Remove group photo')}
        </Item>
      ) : null}
    </>
  )
}
