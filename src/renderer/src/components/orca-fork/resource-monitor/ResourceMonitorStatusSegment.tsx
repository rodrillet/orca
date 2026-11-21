// orca-fork: status-bar entry of the resource monitor: this computer and each paired server.
import React, { useState } from 'react'
import { Gauge, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { useBots } from '@/lib/bot-catalog'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS } from '../../status-bar/composition/status-bar-context-menu-policy'
import { MachineResourcesCard } from './MachineResourcesCard'
import { LOCAL_MACHINE_KEY, useMachineResources, type MachineEntry } from './use-machine-resources'

function machineLabel(machine: MachineEntry, thisComputer: string): string {
  if (machine.name) {
    return machine.name
  }
  const hostname = machine.result && 'data' in machine.result ? machine.result.data.hostname : ''
  return hostname ? `${thisComputer} (${hostname})` : thisComputer
}

function ResourceMonitorPopover({ iconOnly }: { iconOnly: boolean }): React.JSX.Element {
  const t = useTranslate()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(LOCAL_MACHINE_KEY)
  const { machines: panels, refresh } = useMachineResources(open)
  const bots = useBots(open)
  const title = t('orcaFork.resourceMonitor.title', 'Machines')
  const thisComputer = t('orcaFork.resourceMonitor.thisComputer', 'This computer')
  const current = panels.some((m) => m.key === selected) ? selected : LOCAL_MACHINE_KEY
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
              className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground hover:bg-accent/70"
              aria-label={title}
            >
              <Gauge className="size-3" />
              {iconOnly ? null : <span className="text-[11px]">{title}</span>}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          {t(
            'orcaFork.resourceMonitor.tooltip',
            'Memory, CPU, disk and agent processes of every machine'
          )}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
        className="flex h-[min(42rem,var(--radix-popover-content-available-height))] w-[30rem] max-w-[calc(100vw-2rem)] flex-col"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-2">
          <span className="text-sm font-medium">{title}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={refresh}
            aria-label={t('orcaFork.resourceMonitor.refresh', 'Refresh')}
          >
            <RefreshCw />
          </Button>
        </div>
        <Tabs value={current} onValueChange={setSelected} className="min-h-0 flex-1">
          <div className="shrink-0 overflow-x-auto px-3 pt-1 scrollbar-none">
            <TabsList variant="line" size="sm">
              {panels.map((panel) => (
                <TabsTrigger key={panel.key} value={panel.key}>
                  {machineLabel(panel, thisComputer)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {panels.map((panel) => (
            <TabsContent key={panel.key} value={panel.key} className="min-h-0 flex-1">
              <div className="h-full overflow-y-auto scrollbar-sleek">
                <MachineResourcesCard machine={panel} bots={bots} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

export function ResourceMonitorStatusSegment({
  iconOnly
}: {
  iconOnly: boolean
}): React.JSX.Element | null {
  return FORK_FEATURES.resourceMonitor ? <ResourceMonitorPopover iconOnly={iconOnly} /> : null
}
