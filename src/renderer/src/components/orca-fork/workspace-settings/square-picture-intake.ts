// orca-fork: a workspace or profile picture from a chosen, pasted or dropped image: a 256 px square PNG.
import { toast } from 'sonner'
import { useTranslate } from '@/i18n/use-translate'
import {
  BOT_AVATAR_SOURCE_TYPES,
  MAX_BOT_AVATAR_SOURCE_BYTES
} from '../../../../../shared/bot-avatar'
import { BOT_AVATAR_TOO_SMALL, squareAvatarPng } from '../../bots/bot-avatar-upload'
import { BotAvatarIntakeFailure, pastedAvatarSource } from '../../bots/bot-avatar-intake'
import { useIntakeErrorMessage } from '../../bots/BotPictureIntakeLine'

const PICTURE_SIZE = 256
const PICTURE_MIN_SIDE = 32

async function squarePictureDataUrl(blob: Blob): Promise<string> {
  if (blob.size > MAX_BOT_AVATAR_SOURCE_BYTES) {
    throw new BotAvatarIntakeFailure('too_big')
  }
  if (blob.type && !BOT_AVATAR_SOURCE_TYPES.has(blob.type)) {
    throw new BotAvatarIntakeFailure('type')
  }
  try {
    const png = await squareAvatarPng(blob, { size: PICTURE_SIZE, minSide: PICTURE_MIN_SIDE })
    return `data:image/png;base64,${png}`
  } catch (error) {
    const tooSmall = error instanceof Error && error.message === BOT_AVATAR_TOO_SMALL
    throw new BotAvatarIntakeFailure(tooSmall ? 'too_small' : 'type')
  }
}

/** `take` reads an image into `onPicture`; `onPaste` takes a pasted image anywhere it is bound. */
export function useSquarePictureIntake(onPicture: (dataUrl: string) => void): {
  take: (blob: Blob | null | undefined) => void
  onPaste: (event: React.ClipboardEvent) => void
} {
  const t = useTranslate()
  const intakeError = useIntakeErrorMessage()
  const take = (blob: Blob | null | undefined): void => {
    if (!blob) {
      return
    }
    void squarePictureDataUrl(blob).then(onPicture, (error: unknown) => {
      if (!(error instanceof BotAvatarIntakeFailure)) {
        return
      }
      toast.error(
        error.error === 'too_small'
          ? t('orcaFork.workspaces.photoTooSmall', 'That picture is too small.')
          : intakeError(error.error)
      )
    })
  }
  const onPaste = (event: React.ClipboardEvent): void => {
    const image = pastedAvatarSource(event.clipboardData)
    if (!image) {
      return
    }
    const target = event.target
    const inText =
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest('input, textarea') !== null)
    // A copied image with its text (a web page selection) still pastes as text in a field.
    if (inText && event.clipboardData.getData('text/plain')) {
      return
    }
    event.preventDefault()
    take(image)
  }
  return { take, onPaste }
}
