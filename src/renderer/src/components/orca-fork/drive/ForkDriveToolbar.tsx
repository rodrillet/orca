// orca-fork: the Drive's search, quick filters (who, kind, agent, computer, chat), order and layout,
// as agentes.chat's Drive toolbar.
import {
  ArrowDownUp,
  Bot as BotIcon,
  ChevronDown,
  LayoutGrid,
  List,
  Monitor,
  Search,
  Shapes,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import {
  DRIVE_FILE_KINDS,
  type DriveFileKind
} from '../../../../../shared/orca-fork/drive/drive-types'
import type { DriveFilters, DriveLayout, DriveSort, DriveWho } from './drive-view-model'
import type { ExecutionHostId } from '../../../../../shared/execution-host/execution-host'

export type DriveOption = { key: string; label: string }
export type DriveMachine = { key: ExecutionHostId; label: string }

const SEGMENT = 'h-7 rounded-md px-2.5 text-xs font-medium transition-colors'

function FilterButton({
  icon,
  label,
  active,
  children
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={active ? 'secondary' : 'outline'} size="sm">
          {icon}
          <span className="max-w-40 truncate">{label}</span>
          <ChevronDown className="size-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}

function toggled<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

export function ForkDriveToolbar({
  filters,
  onFilters,
  sort,
  onSort,
  layout,
  onLayout,
  bots,
  computers,
  chatLabel,
  trash
}: {
  filters: DriveFilters
  onFilters: (next: DriveFilters) => void
  sort: DriveSort
  onSort: (next: DriveSort) => void
  layout: DriveLayout
  onLayout: (next: DriveLayout) => void
  bots: readonly DriveOption[]
  computers: readonly DriveMachine[]
  chatLabel: string | null
  trash: boolean
}): React.JSX.Element {
  const t = useTranslate()
  const set = (patch: Partial<DriveFilters>): void => onFilters({ ...filters, ...patch })
  const whoOptions: { id: DriveWho; label: string }[] = [
    { id: 'all', label: t('orcaFork.drive.who.all', 'Everyone') },
    { id: 'agents', label: t('orcaFork.drive.who.agents', 'Agents') },
    { id: 'me', label: t('orcaFork.drive.who.me', 'You') }
  ]
  const kindLabel = (kind: DriveFileKind): string => t(`orcaFork.drive.kind.${kind}`, kind)
  const pickedBots = bots.filter((bot) => filters.bots.includes(bot.key))
  const machine = computers.find((entry) => entry.key === filters.hostId)
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <label className="relative flex w-64 items-center">
        <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(event) => set({ query: event.target.value.slice(0, 200) })}
          placeholder={t('orcaFork.drive.search', 'Search files')}
          aria-label={t('orcaFork.drive.search', 'Search files')}
          data-fork-drive-search
          inset="leadingIcon"
          density="compact"
        />
      </label>
      <div className="flex-1" />
      {!trash ? (
        <div
          role="radiogroup"
          className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
        >
          {whoOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={filters.who === option.id}
              onClick={() => set({ who: option.id })}
              className={cn(
                SEGMENT,
                filters.who === option.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      {!trash ? (
        <FilterButton
          icon={<Shapes className="size-3.5" />}
          active={filters.kinds.length > 0}
          label={
            filters.kinds.length === 0
              ? t('orcaFork.drive.filter.kind', 'Type')
              : filters.kinds.map(kindLabel).join(', ')
          }
        >
          {DRIVE_FILE_KINDS.map((kind) => (
            <DropdownMenuCheckboxItem
              key={kind}
              checked={filters.kinds.includes(kind)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => set({ kinds: toggled(filters.kinds, kind) })}
            >
              {kindLabel(kind)}
            </DropdownMenuCheckboxItem>
          ))}
          {filters.kinds.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => set({ kinds: [] })}>
                {t('orcaFork.drive.filter.clear', 'Clear')}
              </DropdownMenuItem>
            </>
          ) : null}
        </FilterButton>
      ) : null}
      {!trash && bots.length > 0 ? (
        <FilterButton
          icon={<BotIcon className="size-3.5" />}
          active={pickedBots.length > 0}
          label={
            pickedBots.length === 0
              ? t('orcaFork.drive.filter.agent', 'Agent')
              : pickedBots.map((bot) => bot.label).join(', ')
          }
        >
          {bots.map((bot) => (
            <DropdownMenuCheckboxItem
              key={bot.key}
              checked={filters.bots.includes(bot.key)}
              onSelect={(event) => event.preventDefault()}
              onCheckedChange={() => set({ bots: toggled(filters.bots, bot.key) })}
            >
              {bot.label}
            </DropdownMenuCheckboxItem>
          ))}
        </FilterButton>
      ) : null}
      {computers.length > 1 ? (
        <FilterButton
          icon={<Monitor className="size-3.5" />}
          active={Boolean(machine)}
          label={machine?.label ?? t('orcaFork.drive.filter.machine', 'Computer')}
        >
          <DropdownMenuRadioGroup
            value={filters.hostId ?? ''}
            onValueChange={(value) =>
              set({ hostId: computers.find((entry) => entry.key === value)?.key ?? null })
            }
          >
            <DropdownMenuRadioItem value="">
              {t('orcaFork.drive.filter.allMachines', 'All computers')}
            </DropdownMenuRadioItem>
            {computers.map((entry) => (
              <DropdownMenuRadioItem key={entry.key} value={entry.key}>
                {entry.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </FilterButton>
      ) : null}
      {chatLabel ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => set({ chat: null })}
          aria-label={t('orcaFork.drive.filter.clearChat', 'Show files from every chat')}
        >
          <span className="max-w-48 truncate">{chatLabel}</span>
          <X className="size-3" />
        </Button>
      ) : null}
      <FilterButton
        icon={<ArrowDownUp className="size-3.5" />}
        active={false}
        label={
          sort === 'name'
            ? t('orcaFork.drive.sort.name', 'Name')
            : sort === 'size'
              ? t('orcaFork.drive.sort.size', 'Size')
              : t('orcaFork.drive.sort.recent', 'Date')
        }
      >
        <DropdownMenuRadioGroup
          value={sort}
          onValueChange={(value) => onSort(value === 'name' || value === 'size' ? value : 'recent')}
        >
          <DropdownMenuRadioItem value="recent">
            {t('orcaFork.drive.sort.recent', 'Date')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name">
            {t('orcaFork.drive.sort.name', 'Name')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="size">
            {t('orcaFork.drive.sort.size', 'Size')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </FilterButton>
      <div
        role="radiogroup"
        className="flex items-center gap-0.5 rounded-lg border border-border p-0.5"
      >
        {(['grid', 'list'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={layout === value}
            aria-label={
              value === 'grid' ? t('orcaFork.drive.grid', 'Grid') : t('orcaFork.drive.list', 'List')
            }
            onClick={() => onLayout(value)}
            className={cn(
              'flex size-7 items-center justify-center rounded-md',
              layout === value
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {value === 'grid' ? <LayoutGrid className="size-3.5" /> : <List className="size-3.5" />}
          </button>
        ))}
      </div>
    </div>
  )
}
