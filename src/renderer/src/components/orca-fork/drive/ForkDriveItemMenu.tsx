// orca-fork: a Drive item's actions, the same in its right-click menu and its "…" menu.
import type { ComponentType, ReactNode } from 'react'
import {
  ArchiveRestore,
  Download,
  Eye,
  Filter,
  FolderInput,
  FolderOpen,
  MessageSquare,
  Pencil,
  Trash2
} from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'

export type DriveItemHandlers = {
  onOpen: () => void
  onDownload?: () => void
  onRename?: () => void
  onMove?: () => void
  onOpenChat?: () => void
  onFilesFromChat?: () => void
  onTrash?: () => void
  onRestore?: () => void
  onDeleteForever?: () => void
}

type MenuItemComponent = ComponentType<{
  onSelect?: (event: Event) => void
  variant?: 'default' | 'destructive'
  children?: ReactNode
}>

export function DriveItemMenuItems({
  handlers,
  kind,
  Item,
  Separator
}: {
  handlers: DriveItemHandlers
  kind: 'file' | 'folder'
  Item: MenuItemComponent
  Separator: ComponentType
}): React.JSX.Element {
  const t = useTranslate()
  const icon = 'size-3.5'
  return (
    <>
      <Item onSelect={handlers.onOpen}>
        {kind === 'folder' ? <FolderOpen className={icon} /> : <Eye className={icon} />}
        {t('orcaFork.drive.open', 'Open')}
      </Item>
      {handlers.onDownload ? (
        <Item onSelect={handlers.onDownload}>
          <Download className={icon} />
          {t('orcaFork.drive.download', 'Download')}
        </Item>
      ) : null}
      {handlers.onOpenChat ? (
        <Item onSelect={handlers.onOpenChat}>
          <MessageSquare className={icon} />
          {t('orcaFork.drive.openChat', 'Open the chat it came from')}
        </Item>
      ) : null}
      {handlers.onFilesFromChat ? (
        <Item onSelect={handlers.onFilesFromChat}>
          <Filter className={icon} />
          {t('orcaFork.drive.filesFromChat', 'Files from this chat')}
        </Item>
      ) : null}
      {handlers.onRename || handlers.onMove ? <Separator /> : null}
      {handlers.onRename ? (
        <Item onSelect={handlers.onRename}>
          <Pencil className={icon} />
          {t('orcaFork.drive.rename', 'Rename…')}
        </Item>
      ) : null}
      {handlers.onMove ? (
        <Item onSelect={handlers.onMove}>
          <FolderInput className={icon} />
          {t('orcaFork.drive.moveTo', 'Move to…')}
        </Item>
      ) : null}
      {handlers.onRestore ? (
        <Item onSelect={handlers.onRestore}>
          <ArchiveRestore className={icon} />
          {t('orcaFork.drive.restore', 'Restore')}
        </Item>
      ) : null}
      {handlers.onTrash || handlers.onDeleteForever ? <Separator /> : null}
      {handlers.onTrash ? (
        <Item variant="destructive" onSelect={handlers.onTrash}>
          <Trash2 className={icon} />
          {t('orcaFork.drive.moveToTrash', 'Move to trash')}
        </Item>
      ) : null}
      {handlers.onDeleteForever ? (
        <Item variant="destructive" onSelect={handlers.onDeleteForever}>
          <Trash2 className={icon} />
          {t('orcaFork.drive.deleteForever', 'Delete forever')}
        </Item>
      ) : null}
    </>
  )
}
