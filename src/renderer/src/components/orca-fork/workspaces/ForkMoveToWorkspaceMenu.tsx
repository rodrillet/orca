// orca-fork: "Move to workspace" in a project's or bot's menu, listing the workspaces of its machine.
import React from 'react'
import { Check, Layers } from 'lucide-react'
import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger
} from '@/components/ui/context-menu'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import { useTranslate } from '@/i18n/use-translate'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { forkWorkspaceOfItem } from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import { forkWorkspaceEdits } from '../../../../../shared/orca-fork/workspaces/fork-workspace-edits'
import { ForkWorkspaceMark } from './ForkWorkspaceMark'
import { forkWorkspacesStore, useForkWorkspaces } from './fork-workspaces-store'

const PRIMITIVES = {
  context: {
    Sub: ContextMenuSub,
    Trigger: ContextMenuSubTrigger,
    Content: ContextMenuSubContent,
    Item: ContextMenuItem
  },
  dropdown: {
    Sub: DropdownMenuSub,
    Trigger: DropdownMenuSubTrigger,
    Content: DropdownMenuSubContent,
    Item: DropdownMenuItem
  }
}

export function ForkMoveToWorkspaceMenu({
  menu,
  hostId,
  item
}: {
  menu: keyof typeof PRIMITIVES
  hostId: ExecutionHostId
  item: { repoId: string } | { botKey: string }
}): React.JSX.Element | null {
  const t = useTranslate()
  const doc = useForkWorkspaces()
  const choices = doc.workspaces.filter((ws) => ws.hostId === hostId)
  if (!FORK_FEATURES.workspaces || choices.length < 2) {
    return null
  }
  const current = forkWorkspaceOfItem(doc, hostId, item)?.id
  const { Sub, Trigger, Content, Item } = PRIMITIVES[menu]
  return (
    <Sub>
      <Trigger>
        <Layers className="size-3.5" />
        {t('orcaFork.workspaces.moveTo', 'Move to workspace')}
      </Trigger>
      <Content className="w-52">
        {choices.map((ws) => (
          <Item
            key={ws.id}
            onSelect={() => forkWorkspacesStore.edit(forkWorkspaceEdits.move(hostId, item, ws.id))}
          >
            <ForkWorkspaceMark workspace={ws} size={16} />
            <span className="min-w-0 flex-1 truncate">{ws.name}</span>
            {ws.id === current ? <Check className="size-3.5 shrink-0" /> : null}
          </Item>
        ))}
      </Content>
    </Sub>
  )
}
