// orca-fork: a file or folder path in chat as a badge (icon + short name), as agentes.chat's file
// pills; a click opens its menu: open in Orca, show in the file explorer (this computer's or the
// paired server's), reveal in Finder (this computer only), open a terminal there, copy the path.
import React from 'react'
import {
  Copy,
  ExternalLink,
  File,
  Folder,
  FolderOpen,
  FolderSearch,
  SquareTerminal
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import { useAppStore } from '@/store'
import { getLocalFileManagerLabel } from '@/lib/files/os-open/local-file-manager-label'
import { createNewTerminalTab } from '@/components/terminal/tab-lifecycle/terminal-tab-create'
import { useNativeChatLinkClick } from '@/components/native-chat/links/actions/native-chat-link-click-context'
import { createNativeChatFileHref } from '../../../../../shared/native-chat/file-access/native-chat-href-routing'
import { LOCAL_EXECUTION_HOST_ID } from '../../../../../shared/execution-host/execution-host'
import {
  chatPathFolder,
  chatPathLabel,
  type ChatPath
} from '../../../../../shared/orca-fork/chat-paths/chat-path-badges'
import { forkLinkClickScope } from './fork-link-click-scope'
import type { NativeChatFileLinkContext } from '@/components/native-chat/links/actions/native-chat-file-link-context'
import { resolveNativeChatFileLink } from '@/components/native-chat/links/actions/native-chat-file-link'
import { nativeChatFileOpenDeps } from '@/components/native-chat/links/actions/native-chat-link-target-actions'
import { openDetectedFilePath } from '@/components/terminal-pane/links/files/terminal-file-open-routing'
import { getExecutionHostIdForWorktree } from '@/lib/workspace/ownership/worktree-runtime-owner'
import { selectExecutionHostDisplayLabel } from '@/runtime/hosts/display/execution-host-display-label'

/** Opens the path as the chat's own file links do: in Orca, on the chat's machine. */
function openInOrca(href: string, scope: NativeChatFileLinkContext): void {
  const target = resolveNativeChatFileLink(href, scope)
  if (!target) {
    toast.error(href)
    return
  }
  openDetectedFilePath(target.absolutePath, target.line, target.column, {
    ...nativeChatFileOpenDeps(target, scope),
    openWithSystemDefault: false
  })
}

export function ForkChatPathBadge({ chatPath }: { chatPath: ChatPath }): React.JSX.Element {
  const t = useTranslate()
  const onLinkClick = useNativeChatLinkClick()
  const scope = onLinkClick ? forkLinkClickScope(onLinkClick) : null
  // The chat's machine: this computer, or the paired server or SSH host its workspace runs on.
  const hostId = useAppStore((state) =>
    scope ? getExecutionHostIdForWorktree(state, scope.worktreeId) : null
  )
  const machine = useAppStore((state) =>
    hostId && hostId !== LOCAL_EXECUTION_HOST_ID
      ? selectExecutionHostDisplayLabel(state, hostId)
      : null
  )
  const local = hostId === LOCAL_EXECUTION_HOST_ID
  const Icon = chatPath.isDirectory ? Folder : File
  const location = chatPath.line ? `${chatPath.path}:${chatPath.line}` : chatPath.path
  const href = createNativeChatFileHref(location)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={chatPath.path}
          data-orca-fork-path-badge=""
          className="mx-px inline-flex max-w-full items-center gap-1 rounded-sm bg-accent px-1 align-baseline font-mono text-[0.92em] text-foreground hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Icon className="size-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{chatPathLabel(chatPath.path)}</span>
          {chatPath.line ? <span className="text-muted-foreground">:{chatPath.line}</span> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel
          className="truncate font-mono text-[11px] font-normal"
          title={chatPath.path}
        >
          {machine ? `${machine}: ${chatPath.path}` : chatPath.path}
        </DropdownMenuLabel>
        {scope ? (
          <DropdownMenuItem onSelect={() => openInOrca(href, scope)}>
            <ExternalLink className="size-3.5" />
            {t('orcaFork.chatPaths.open', 'Open in Orca')}
          </DropdownMenuItem>
        ) : null}
        {scope ? (
          <DropdownMenuItem
            onSelect={() =>
              useAppStore.getState().revealInExplorer(scope.worktreeId, chatPath.path)
            }
          >
            <FolderSearch className="size-3.5" />
            {machine
              ? t('orcaFork.chatPaths.showOnMachine', 'Show in {{machine}} files', { machine })
              : t('orcaFork.chatPaths.showInFiles', 'Show in Orca files')}
          </DropdownMenuItem>
        ) : null}
        {local ? (
          <DropdownMenuItem
            onSelect={() =>
              void window.api.shell
                .openInFileManager(chatPath.path, LOCAL_EXECUTION_HOST_ID)
                .catch((error: unknown) => toast.error(String(error)))
            }
          >
            <FolderOpen className="size-3.5" />
            {t('orcaFork.chatPaths.reveal', 'Reveal in {{name}}', {
              name: getLocalFileManagerLabel()
            })}
          </DropdownMenuItem>
        ) : null}
        {scope ? (
          <DropdownMenuItem
            onSelect={() =>
              createNewTerminalTab(scope.worktreeId, undefined, {
                startupCwd: chatPathFolder(chatPath)
              })
            }
          >
            <SquareTerminal className="size-3.5" />
            {t('orcaFork.chatPaths.terminal', 'Open a terminal here')}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void window.api.ui.writeClipboardText(chatPath.path)
            toast.success(t('orcaFork.chatPaths.copied', 'Path copied'))
          }}
        >
          <Copy className="size-3.5" />
          {t('orcaFork.chatPaths.copy', 'Copy path')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
