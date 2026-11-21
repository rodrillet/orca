// orca-fork: installs the one-full-page rule for this window.
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import { closeWikiPage, isWikiPageOpen, subscribeWikiView } from '../wiki/wiki-view-state'
import { isForkDriveOpen, subscribeForkDrive } from '../drive/drive-page-state'
import { installForkPageSwitch } from './fork-page-switch'

export function ForkPageSwitch(): null {
  useEffect(
    () =>
      installForkPageSwitch({
        store: useAppStore,
        wiki: { isOpen: isWikiPageOpen, subscribe: subscribeWikiView, close: closeWikiPage },
        drive: { isOpen: isForkDriveOpen, subscribe: subscribeForkDrive },
        root: document
      }),
    []
  )
  return null
}
