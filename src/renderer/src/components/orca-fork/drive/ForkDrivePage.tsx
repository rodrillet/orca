// orca-fork: the Drive page: every file the owner sent in chats and every file agents saved, on this
// computer and each paired server, with folders, search, filters, preview and the trash.
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { useConfirmationDialog } from '@/components/dismiss/confirmation/confirmation-dialog-context'
import { openBotSession } from '@/components/bots/bot-session-open'
import { useBots } from '@/lib/bot-catalog'
import { useTranslate } from '@/i18n/use-translate'
import {
  LOCAL_EXECUTION_HOST_ID,
  type ExecutionHostId
} from '../../../../../shared/execution-host/execution-host'
import { useDriveData, type DriveEntry, type DriveFolderEntry } from './drive-host-data'
import {
  DRIVE_NAME_COLLATOR,
  driveFolderTrail,
  driveShown,
  EMPTY_DRIVE_FILTERS,
  isFiltering,
  type DriveFilters,
  type DriveFolderRef,
  type DriveSort
} from './drive-view-model'
import { findDriveFileBot } from './drive-file-origin'
import { useDriveActions, type DriveSelection } from './use-drive-actions'
import { useDriveSelection } from './use-drive-selection'
import {
  useDriveLayout,
  useDriveMachines,
  useDriveWorkspaceId,
  useDriveKeys
} from './drive-page-hooks'
import { ForkDriveToolbar } from './ForkDriveToolbar'
import { ForkDriveHeader, ForkDriveSelectionBar, ForkDriveTrail } from './ForkDriveHeader'
import { ForkDriveContent } from './ForkDriveContent'
import { ForkDrivePreview } from './ForkDrivePreview'
import { DriveMoveDialog, DriveNameDialog } from './ForkDriveDialogs'
import { ForkDriveEmpty, ForkDriveNotices } from './ForkDriveEmpty'
import type { DriveItemHandlers } from './ForkDriveItemMenu'

type DialogState =
  | null
  | { kind: 'newFolder'; hostId: ExecutionHostId; parentId: string | null }
  | { kind: 'rename'; selection: DriveSelection; initial: string }
  | { kind: 'move'; selection: DriveSelection }

export default function ForkDrivePage(): React.JSX.Element {
  const t = useTranslate()
  const confirm = useConfirmationDialog()
  const workspaceId = useDriveWorkspaceId()
  const data = useDriveData(workspaceId)
  const actions = useDriveActions(workspaceId, data.refresh)
  const bots = useBots()
  const [layout, setLayout] = useDriveLayout()
  const [filters, setFilters] = useState<DriveFilters>(EMPTY_DRIVE_FILTERS)
  const [sort, setSort] = useState<DriveSort>('recent')
  const [folder, setFolder] = useState<DriveFolderRef | null>(null)
  const [trash, setTrash] = useState(false)
  const [previewing, setPreviewing] = useState<DriveEntry | null>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [dropping, setDropping] = useState(false)
  const machines = useDriveMachines(data.hosts)

  const shown = useMemo(
    () => driveShown({ files: data.files, folders: data.folders, filters, folder, sort, trash }),
    [data.files, data.folders, filters, folder, sort, trash]
  )
  const selection = useDriveSelection(shown)
  const trail = driveFolderTrail(data.folders, folder)
  useEffect(() => {
    // A folder that's gone (deleted, trashed elsewhere): back to the top level.
    if (folder && data.loaded && trail.length === 0) {
      setFolder(null)
    }
  }, [folder, data.loaded, trail.length])
  useDriveKeys({ onSelectAll: selection.selectAll, onClear: selection.clear })

  const trashed = useMemo(
    () =>
      driveShown({
        files: data.files,
        folders: data.folders,
        filters: EMPTY_DRIVE_FILTERS,
        folder: null,
        sort,
        trash: true
      }),
    [data.files, data.folders, sort]
  )
  const trashCount = trashed.files.length + trashed.folders.length
  const folderCount = (entry: DriveFolderEntry): number =>
    data.files.filter(
      (file) =>
        file.hostId === entry.hostId && file.folderId === entry.id && file.trashedAt === null
    ).length +
    data.folders.filter(
      (child) =>
        child.hostId === entry.hostId && child.parentId === entry.id && child.trashedAt === null
    ).length
  const folderPath = (file: DriveEntry): string => {
    const path = driveFolderTrail(
      data.folders,
      file.folderId ? { hostId: file.hostId, id: file.folderId } : null
    )
    return ['Drive', ...path.map((entry) => entry.name)].join(' / ')
  }
  const uploadHost = folder?.hostId ?? filters.hostId ?? LOCAL_EXECUTION_HOST_ID
  const upload = (hostId: ExecutionHostId | null, files: File[]): void => {
    const target = hostId ?? uploadHost
    void actions.upload(target, files, folder && folder.hostId === target ? folder.id : null)
  }
  const openFolder = (entry: DriveFolderEntry | null): void => {
    selection.clear()
    setFilters((current) => ({ ...current, query: '' }))
    setFolder(entry ? { hostId: entry.hostId, id: entry.id } : null)
  }
  const confirmDeleteForever = async (target: DriveSelection): Promise<void> => {
    const accepted = await confirm({
      title: t('orcaFork.drive.deleteForever', 'Delete forever'),
      description: t(
        'orcaFork.drive.deleteForeverDescription',
        'These files are deleted for good. This cannot be undone.'
      ),
      confirmLabel: t('orcaFork.drive.deleteForever', 'Delete forever'),
      confirmVariant: 'destructive'
    })
    if (accepted) {
      void actions.deleteForever(target).then(selection.clear)
    }
  }
  const one = (file: DriveEntry): DriveSelection => ({ files: [file], folders: [] })
  const fileHandlers = (file: DriveEntry): DriveItemHandlers => {
    const bot = findDriveFileBot(bots, file)
    const sessionId = file.source.kind === 'upload' ? undefined : file.source.sessionId
    if (trash) {
      return {
        onOpen: () => setPreviewing(file),
        onRestore: () => void actions.restore(one(file)),
        onDeleteForever: () => void confirmDeleteForever(one(file))
      }
    }
    return {
      onOpen: () => setPreviewing(file),
      onDownload: () => void actions.download(file),
      onRename: () => setDialog({ kind: 'rename', selection: one(file), initial: file.name }),
      onMove: () => setDialog({ kind: 'move', selection: one(file) }),
      ...(bot && sessionId
        ? {
            onOpenChat: () => {
              setPreviewing(null)
              openBotSession(bot, sessionId)
            }
          }
        : {}),
      ...(sessionId
        ? {
            onFilesFromChat: () => {
              setPreviewing(null)
              setFilters({ ...EMPTY_DRIVE_FILTERS, chat: { hostId: file.hostId, sessionId } })
            }
          }
        : {}),
      onTrash: () => {
        setPreviewing(null)
        void actions.trash(one(file))
      }
    }
  }
  const folderHandlers = (entry: DriveFolderEntry): DriveItemHandlers => {
    const target: DriveSelection = { files: [], folders: [entry] }
    if (trash) {
      return {
        onOpen: () => undefined,
        onRestore: () => void actions.restore(target),
        onDeleteForever: () => void confirmDeleteForever(target)
      }
    }
    return {
      onOpen: () => openFolder(entry),
      onRename: () => setDialog({ kind: 'rename', selection: target, initial: entry.name }),
      onMove: () => setDialog({ kind: 'move', selection: target }),
      onTrash: () => void actions.trash(target)
    }
  }
  const picking = selection.keys.size > 0
  const pickFile = (file: DriveEntry, event: MouseEvent): void => {
    if (picking || event.metaKey || event.ctrlKey || event.shiftKey) {
      selection.toggle(`file\u0000${file.hostId}\u0000${file.id}`)
    } else {
      setPreviewing(file)
    }
  }
  const pickFolder = (entry: DriveFolderEntry, event: MouseEvent): void => {
    if (picking || event.metaKey || event.ctrlKey || event.shiftKey || trash) {
      selection.toggle(`folder\u0000${entry.hostId}\u0000${entry.id}`)
    } else {
      openFolder(entry)
    }
  }
  const picked = selection.selection
  const pickedHosts = new Set([...picked.files, ...picked.folders].map((item) => item.hostId))
  const chatLabel = filters.chat
    ? (() => {
        const sample = data.files.find(
          (file) =>
            file.source.kind !== 'upload' && file.source.sessionId === filters.chat?.sessionId
        )
        const name = sample && sample.source.kind !== 'upload' ? sample.source.botName : undefined
        return name
          ? t('orcaFork.drive.chatWith', 'Chat with {{name}}', { name })
          : t('orcaFork.drive.oneChat', 'One chat')
      })()
    : null
  const botOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const file of data.files) {
      const source = file.source
      if (source.kind !== 'upload' && source.botId && source.botName) {
        seen.set(`${file.hostId}\u0000${source.botId}`, source.botName)
      }
    }
    return [...seen]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => DRIVE_NAME_COLLATOR.compare(a.label, b.label))
  }, [data.files])
  const moveSelection = dialog?.kind === 'move' ? dialog.selection : null
  const moveHost = moveSelection
    ? [...moveSelection.files, ...moveSelection.folders][0]?.hostId
    : undefined
  const empty = shown.files.length === 0 && shown.folders.length === 0

  return (
    <main
      className="relative flex h-full min-h-0 flex-1 flex-col bg-background pt-5 text-foreground md:pt-6"
      onDragOver={(event) => {
        if (!trash && event.dataTransfer.types.includes('Files')) {
          event.preventDefault()
          setDropping(true)
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setDropping(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDropping(false)
        const files = [...event.dataTransfer.files]
        if (!trash && files.length > 0) {
          upload(null, files)
        }
      }}
    >
      <ForkDriveHeader
        trash={trash}
        trashCount={trashCount}
        onTrash={(open) => {
          selection.clear()
          setTrash(open)
        }}
        onNewFolder={() =>
          setDialog({ kind: 'newFolder', hostId: uploadHost, parentId: folder?.id ?? null })
        }
        uploadPlaces={folder ? [] : machines.uploadable}
        onUpload={upload}
        onEmptyTrash={() => {
          void confirm({
            title: t('orcaFork.drive.emptyTrash', 'Empty trash'),
            description: t(
              'orcaFork.drive.deleteForeverDescription',
              'These files are deleted for good. This cannot be undone.'
            ),
            confirmLabel: t('orcaFork.drive.emptyTrash', 'Empty trash'),
            confirmVariant: 'destructive'
          }).then((accepted) => (accepted ? actions.deleteForever(trashed) : undefined))
        }}
      />
      <section className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-4 md:px-5">
        <ForkDriveToolbar
          filters={filters}
          onFilters={(next) => {
            selection.clear()
            setFilters(next)
          }}
          sort={sort}
          onSort={setSort}
          layout={layout}
          onLayout={setLayout}
          bots={botOptions}
          computers={machines.listed}
          chatLabel={chatLabel}
          trash={trash}
        />
        <ForkDriveNotices hosts={data.hosts} labelOf={machines.labelOf} />
        {!trash && !isFiltering(filters) ? (
          <ForkDriveTrail
            trail={trail}
            machine={machines.multiple && folder ? machines.labelOf(folder.hostId) : null}
            onOpen={openFolder}
          />
        ) : null}
        {picking ? (
          <ForkDriveSelectionBar
            count={selection.keys.size}
            trash={trash}
            canDownload={picked.files.length > 0 && picked.folders.length === 0}
            canMove={pickedHosts.size === 1}
            onDownload={() => {
              void (async () => {
                for (const file of picked.files) {
                  await actions.download(file)
                }
              })()
            }}
            onMove={() => setDialog({ kind: 'move', selection: picked })}
            onTrash={() => void actions.trash(picked).then(selection.clear)}
            onRestore={() => void actions.restore(picked).then(selection.clear)}
            onDeleteForever={() => void confirmDeleteForever(picked)}
            onClear={selection.clear}
          />
        ) : null}
        <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
          {!data.loaded ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : empty ? (
            <ForkDriveEmpty
              trash={trash}
              filtering={isFiltering(filters) || folder !== null}
              onUpload={(files) => upload(null, files)}
            />
          ) : (
            <ForkDriveContent
              workspaceId={workspaceId}
              layout={layout}
              sort={sort}
              folders={shown.folders}
              files={shown.files}
              selected={selection.keys}
              folderCount={folderCount}
              machineOf={(hostId) => (machines.multiple ? machines.labelOf(hostId) : null)}
              onPickFile={pickFile}
              onPickFolder={pickFolder}
              onToggle={selection.toggle}
              fileHandlers={fileHandlers}
              folderHandlers={folderHandlers}
            />
          )}
        </div>
      </section>
      {dropping ? (
        <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/60 bg-background/80 text-sm font-medium">
          {t('orcaFork.drive.dropToUpload', 'Drop to upload to {{name}}', {
            name: machines.labelOf(uploadHost)
          })}
        </div>
      ) : null}
      {previewing ? (
        <ForkDrivePreview
          file={previewing}
          workspaceId={workspaceId}
          machine={machines.labelOf(previewing.hostId)}
          folderPath={folderPath(previewing)}
          handlers={fileHandlers(previewing)}
          onClose={() => setPreviewing(null)}
        />
      ) : null}
      {dialog?.kind === 'newFolder' ? (
        <DriveNameDialog
          title={t('orcaFork.drive.newFolder', 'New folder')}
          initial={t('orcaFork.drive.untitledFolder', 'Untitled folder')}
          confirmLabel={t('orcaFork.drive.create', 'Create')}
          onSubmit={(name) => void actions.createFolder(dialog.hostId, name, dialog.parentId)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === 'rename' ? (
        <DriveNameDialog
          title={t('orcaFork.drive.renameTitle', 'Rename')}
          initial={dialog.initial}
          confirmLabel={t('orcaFork.drive.save', 'Save')}
          onSubmit={(name) => {
            setPreviewing(null)
            void actions.rename(dialog.selection, name)
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {moveSelection && moveHost ? (
        <DriveMoveDialog
          folders={data.folders.filter((entry) => entry.hostId === moveHost)}
          machine={machines.labelOf(moveHost)}
          excluded={new Set(moveSelection.folders.map((entry) => entry.id))}
          current={moveSelection.files[0]?.folderId ?? moveSelection.folders[0]?.parentId ?? null}
          onMove={(target) => {
            setPreviewing(null)
            void actions.move(moveSelection, target).then(selection.clear)
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </main>
  )
}
