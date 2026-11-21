// orca-fork: "New channel": a topic room where the picked bots and the owner talk. It is a bot group
// on the bots' machine (stock orca-server), marked as a channel and placed in a category.
import React, { useMemo, useState } from 'react'
import { Hash } from 'lucide-react'
import { botRefKey, callBotRpc } from '@/lib/bot-hosts'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useTranslate } from '@/i18n/use-translate'
import { useBots } from '@/lib/bot-catalog'
import { openBotGroup } from '@/lib/bot-group-catalog'
import { refreshBotGroups } from '@/lib/bot-group-list'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'
import { BOT_GROUP_NAME_MAX_LENGTH } from '../../../../../shared/bots/bot-group-pick'
import {
  chatStructureEdits,
  workspaceCategories
} from '../../../../../shared/orca-fork/channels/chat-structure'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { BotAvatar } from '../../bots/BotAvatar'
import {
  BotPickFilter,
  BotPickRow,
  BotPickRows,
  FILTER_FROM,
  filterByName
} from '../../bots/BotPickList'
import { botSidebarEntryKey } from '../../bots/bot-sidebar-entry-keys'
import { useForkWorkspaceOwners } from '../workspaces/use-fork-workspace-scope'
import { useActiveForkWorkspaceId } from '../workspaces/fork-workspaces-store'
import { editChatStructure, useChatStructure } from './chat-structure-store'

const NO_CATEGORY = '__none'

/** Channel names read as agentes.chat's: lowercase words joined by dashes. */
export function channelSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .slice(0, BOT_GROUP_NAME_MAX_LENGTH)
}

export function ForkNewChannelDialog({
  categoryId,
  onClose
}: {
  categoryId: string | null
  onClose: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const allBots = useForkWorkspaceOwners(useBots())
  const doc = useChatStructure()
  const workspaceId = useActiveForkWorkspaceId()
  const categories = workspaceCategories(doc, FORK_FEATURES.workspaces ? workspaceId : null)
  // A channel lives on one computer: once a bot is picked, only that computer's bots can join.
  const [pickHost, setPickHost] = useState<ExecutionHostId | null>(null)
  const bots = useMemo(
    () => (pickHost ? allBots.filter((bot) => bot.hostId === pickHost) : allBots),
    [allBots, pickHost]
  )
  const [name, setName] = useState('')
  const [category, setCategory] = useState(categoryId ?? NO_CATEGORY)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const picked = selected.flatMap((id) => bots.find((bot) => bot.id === id) ?? [])
  const slug = channelSlug(name)
  const missing = !slug
    ? t('orcaFork.chatStructure.nameChannel', 'Name the channel')
    : picked.length === 0
      ? t('orcaFork.chatStructure.pickBots', 'Pick the bots that talk here')
      : null

  const save = async (): Promise<void> => {
    if (saving || missing) {
      return
    }
    setSaving(true)
    try {
      const { group } = await callBotRpc<{ group: BotGroup }>(picked[0]!, 'bots.groups.create', {
        name: slug,
        botIds: picked.map((bot) => bot.id)
      })
      editChatStructure(
        chatStructureEdits.placeChannel(
          botSidebarEntryKey({ hostId: picked[0]!.hostId, id: group.id }),
          category === NO_CATEGORY ? null : category
        )
      )
      await refreshBotGroups()
      await openBotGroup(group)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent scrollable className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('orcaFork.chatStructure.newChannelTitle', 'New channel')}</DialogTitle>
          <DialogDescription>
            {t(
              'orcaFork.chatStructure.newChannelDescription',
              'A topic where several bots and you talk together.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Label htmlFor="fork-channel-name" className="sr-only">
            {t('orcaFork.chatStructure.channelName', 'Channel name')}
          </Label>
          <Hash className="size-4 shrink-0 text-muted-foreground" />
          <Input
            id="fork-channel-name"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={name}
            maxLength={BOT_GROUP_NAME_MAX_LENGTH}
            placeholder={t('orcaFork.chatStructure.channelNamePlaceholder', 'e.g. launch-plan')}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void save()
              }
            }}
          />
        </div>
        {categories.length > 0 ? (
          <div className="flex items-center gap-3">
            <Label className="shrink-0">{t('orcaFork.chatStructure.category', 'Category')}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger size="sm" className="min-w-0 flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>
                  {t('orcaFork.chatStructure.noCategory', 'No category')}
                </SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label id="fork-channel-members">{t('orcaFork.chatStructure.members', 'Bots')}</Label>
            <span className="text-xs tabular-nums text-muted-foreground">
              {selected.length > 0
                ? t('orcaFork.chatStructure.picked', '{{count}} picked', { count: selected.length })
                : null}
            </span>
          </div>
          {bots.length > FILTER_FROM ? <BotPickFilter value={query} onChange={setQuery} /> : null}
          <BotPickRows role="group" labelledBy="fork-channel-members">
            {filterByName(bots, query, (bot) => bot.name).map((bot) => {
              const on = selected.includes(bot.id)
              return (
                <BotPickRow
                  key={botRefKey(bot)}
                  role="checkbox"
                  aria-checked={on}
                  disabled={saving}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const next = on ? selected.filter((id) => id !== bot.id) : [...selected, bot.id]
                    setSelected(next)
                    setPickHost(next.length > 0 ? bot.hostId : null)
                  }}
                  picture={<BotAvatar bot={bot} className="size-7 rounded-lg text-sm" />}
                  name={bot.name}
                  on={on}
                />
              )
            })}
          </BotPickRows>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter className="items-center">
          {missing ? (
            <span className="mr-auto text-xs text-muted-foreground">{missing}</span>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            {t('orcaFork.chatStructure.cancel', 'Cancel')}
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={saving || missing !== null}>
            {saving
              ? t('orcaFork.chatStructure.creating', 'Creating…')
              : t('orcaFork.chatStructure.create', 'Create channel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
