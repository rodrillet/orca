// orca-fork: the Agents board's search and its workspace, machine, bot and tag filters.
import React from 'react'
import { ChevronDown, Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { FilterOptionCount } from '@/components/dashboard/board/FilterOptionCount'
import { toggleDashboardFilter } from '@/components/dashboard/board/agent-board-filtering'
import { useTranslate } from '@/i18n/use-translate'
import {
  activeAgentsBoardFilterCount,
  EMPTY_AGENTS_BOARD_FILTERS,
  type AgentsBoardFilters
} from './agents-board-model'

export type AgentsBoardFilterOption = { id: string; label: string; count: number }

export type AgentsBoardFilterOptions = Record<keyof AgentsBoardFilters, AgentsBoardFilterOption[]>

const FILTER_KEYS: readonly (keyof AgentsBoardFilters)[] = ['workspaces', 'hosts', 'bots', 'tags']

export function AgentsBoardToolbar({
  options,
  filters,
  onFiltersChange,
  query,
  onQueryChange,
  shown,
  total
}: {
  options: AgentsBoardFilterOptions
  filters: AgentsBoardFilters
  onFiltersChange: (filters: AgentsBoardFilters) => void
  query: string
  onQueryChange: (query: string) => void
  shown: number
  total: number
}): React.JSX.Element {
  const t = useTranslate()
  const activeCount = activeAgentsBoardFilterCount(filters)
  const sectionLabel = (key: keyof AgentsBoardFilters): string => {
    switch (key) {
      case 'workspaces':
        return t('orcaFork.agentsBoard.filter.workspace', 'Workspace')
      case 'hosts':
        return t('orcaFork.agentsBoard.filter.machine', 'Machine')
      case 'bots':
        return t('orcaFork.agentsBoard.filter.bot', 'Bot')
      case 'tags':
        return t('orcaFork.agentsBoard.filter.tag', 'Tag')
    }
  }
  const toggle = (key: keyof AgentsBoardFilters, id: string): void =>
    onFiltersChange({ ...filters, [key]: toggleDashboardFilter(filters[key], id) })
  const sections = FILTER_KEYS.filter((key) => options[key].length > 0 || filters[key].length > 0)

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('orcaFork.agentsBoard.search', 'Search tasks, bots or workspaces…')}
            aria-label={t('orcaFork.agentsBoard.searchLabel', 'Search the board')}
            className="h-7 w-full rounded-md border border-input bg-muted/55 pr-7 pl-7 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {query ? (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onQueryChange('')}
              aria-label={t('dashboardPopout.search.clear', 'Clear search')}
              className="absolute top-1/2 right-0.5 -translate-y-1/2"
            >
              <X className="size-3" />
            </Button>
          ) : null}
        </div>
        {query || activeCount > 0 ? (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            {t('dashboardPopout.search.results', '{{shown}} of {{total}} shown', { shown, total })}
          </span>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={activeCount > 0 ? 'outline-strong' : 'outline'} size="xs">
              <Filter className="size-3" />
              {t('dashboardPopout.filters.label', 'Filter')}
              {activeCount > 0 ? (
                <span className="rounded-full bg-foreground px-1.5 py-px text-[10px] leading-none text-background">
                  {activeCount}
                </span>
              ) : null}
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64" sideOffset={6}>
            <div className="scrollbar-sleek max-h-[60vh] overflow-y-auto">
              {sections.map((key) => (
                <React.Fragment key={key}>
                  <DropdownMenuLabel>{sectionLabel(key)}</DropdownMenuLabel>
                  {options[key].map((option) => (
                    <DropdownMenuCheckboxItem
                      key={option.id}
                      checked={filters[key].includes(option.id)}
                      onCheckedChange={() => toggle(key, option.id)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      <span className="truncate">{option.label}</span>
                      <FilterOptionCount count={option.count} />
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                </React.Fragment>
              ))}
            </div>
            <DropdownMenuItem
              disabled={activeCount === 0}
              onSelect={() => onFiltersChange(EMPTY_AGENTS_BOARD_FILTERS)}
            >
              <X className="size-3.5" />
              {t('dashboardPopout.filters.clearAll', 'Clear all filters')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {activeCount > 0 ? (
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-3 py-2">
          <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            {t('dashboardPopout.filters.active', 'Filters')}
          </span>
          {FILTER_KEYS.flatMap((key) =>
            filters[key].map((id) => {
              const label = options[key].find((option) => option.id === id)?.label ?? id
              return (
                <span
                  key={`${key}:${id}`}
                  className="inline-flex h-[22px] items-center gap-1 rounded-full border border-border bg-muted/55 pr-1 pl-2 text-[11px]"
                >
                  {sectionLabel(key)}: {label}
                  <button
                    type="button"
                    onClick={() => toggle(key, id)}
                    aria-label={t('dashboardPopout.filters.remove', 'Remove {{label}} filter', {
                      label
                    })}
                    className="rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )
            })
          )}
          <Button
            variant="link-muted"
            size="inlineText"
            onClick={() => onFiltersChange(EMPTY_AGENTS_BOARD_FILTERS)}
          >
            {t('dashboardPopout.filters.clear', 'Clear')}
          </Button>
        </div>
      ) : null}
    </>
  )
}
