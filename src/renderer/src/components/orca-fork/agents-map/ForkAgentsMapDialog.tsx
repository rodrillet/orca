// orca-fork: the Agents map: bots as nodes around their rooms (channels, groups), the owner in the
// middle; lines show who sits where, who handed work to whom (arrows) and who mentioned whom
// (dashed). A line that carried a message in the last two minutes glows and moves.
import React, { useEffect, useMemo, useState } from 'react'
import { Hash, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import { useNow } from '@/lib/window-activity/use-now'
import { openBotGroup } from '@/lib/bot-group-catalog'
import { openBotHome } from '@/lib/bot-catalog'
import {
  botNode,
  layoutAgentsMap,
  LIVE_MS,
  OWNER_NODE,
  roomNode,
  type MapEdge,
  type MapEdgeKind,
  type MapPoint
} from '../../../../../shared/orca-fork/agents-map/agents-map-model'
import type { Bot } from '../../../../../shared/bot-types'
import { BotAvatar } from '../../bots/BotAvatar'
import { botErrorMessage } from '../../bots/bot-presentation'
import { useBotPresence } from '../agents-board/use-bot-presence'
import { useAgentsMapData } from './use-agents-map-data'
import { onOpenAgentsMap } from './open-agents-map'

const WIDTH = 880
const HEIGHT = 600

const EDGE_STYLE: Record<MapEdgeKind, { stroke: string; dash?: string }> = {
  member: { stroke: 'var(--border)' },
  handoff: { stroke: 'var(--primary)' },
  mention: { stroke: 'var(--muted-foreground)', dash: '4 4' }
}

function scale(point: MapPoint | undefined): MapPoint {
  return point ? { x: point.x * WIDTH, y: point.y * HEIGHT } : { x: WIDTH / 2, y: HEIGHT / 2 }
}

export function ForkAgentsMapHost(): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  useEffect(() => onOpenAgentsMap(() => setOpen(true)), [])
  return open ? <ForkAgentsMapDialog onClose={() => setOpen(false)} /> : null
}

function ForkAgentsMapDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const t = useTranslate()
  const { bots, rooms, edges } = useAgentsMapData(true)
  const now = useNow(5_000)
  const [filter, setFilter] = useState<MapEdgeKind | 'all'>('all')
  const points = useMemo(() => layoutAgentsMap(bots, rooms), [bots, rooms])
  const shown = edges.filter((edge) => filter === 'all' || edge.kind === filter)
  const live = (edge: MapEdge): boolean => edge.lastAt !== null && now - edge.lastAt < LIVE_MS
  const filters: [MapEdgeKind | 'all', string][] = [
    ['all', t('orcaFork.agentsMap.all', 'All')],
    ['member', t('orcaFork.agentsMap.rooms', 'Rooms')],
    ['handoff', t('orcaFork.agentsMap.handoffs', 'Hand-offs')],
    ['mention', t('orcaFork.agentsMap.mentions', 'Mentions')]
  ]
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-[960px]">
        <DialogHeader>
          <DialogTitle>{t('orcaFork.agentsMap.title', 'Agents map')}</DialogTitle>
          <DialogDescription>
            {t(
              'orcaFork.agentsMap.description',
              'How your bots work together: the rooms they share, who hands work to whom and who mentions whom. Lines that just carried a message glow.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-1">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                'rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground',
                filter === value && 'bg-accent text-foreground'
              )}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {t('orcaFork.agentsMap.counts', '{{bots}} bots · {{rooms}} rooms · {{live}} live', {
              bots: bots.length,
              rooms: rooms.length,
              live: edges.filter(live).length
            })}
          </span>
        </div>
        {bots.length === 0 ? (
          <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
            {t('orcaFork.agentsMap.empty', 'No bots in this workspace yet.')}
          </div>
        ) : (
          <div
            className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/30"
            style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
          >
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="absolute inset-0 size-full"
              aria-hidden
            >
              <defs>
                <marker
                  id="fork-map-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
                </marker>
              </defs>
              {shown.map((edge) => {
                const a = scale(points.get(edge.from))
                const b = scale(points.get(edge.to))
                const style = EDGE_STYLE[edge.kind]
                const glowing = live(edge)
                // Hand-offs and mentions bow a little, so A→B and B→A don't overlap.
                const bow = edge.kind === 'member' ? 0 : 28
                const mx =
                  (a.x + b.x) / 2 - ((b.y - a.y) / Math.hypot(b.x - a.x, b.y - a.y || 1)) * bow
                const my =
                  (a.y + b.y) / 2 + ((b.x - a.x) / Math.hypot(b.x - a.x, b.y - a.y || 1)) * bow
                return (
                  <path
                    key={edge.id}
                    d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                    fill="none"
                    stroke={glowing ? 'var(--status-success)' : style.stroke}
                    strokeWidth={Math.min(1 + Math.log2(1 + edge.count), 4) + (glowing ? 1 : 0)}
                    strokeDasharray={glowing ? '8 5' : style.dash}
                    strokeOpacity={edge.kind === 'member' && !glowing ? 0.8 : 0.9}
                    markerEnd={edge.kind === 'handoff' ? 'url(#fork-map-arrow)' : undefined}
                    className={glowing ? 'fork-agents-map-live' : undefined}
                  >
                    <title>
                      {t('orcaFork.agentsMap.edgeTip', '{{kind}} · {{count}} messages', {
                        kind: filters.find(([value]) => value === edge.kind)?.[1] ?? edge.kind,
                        count: edge.count
                      })}
                    </title>
                  </path>
                )
              })}
            </svg>
            <style>{`.fork-agents-map-live{animation:fork-agents-map-flow 0.8s linear infinite;filter:drop-shadow(0 0 3px var(--status-success))}@keyframes fork-agents-map-flow{to{stroke-dashoffset:-13}}@media (prefers-reduced-motion:reduce){.fork-agents-map-live{animation:none}}`}</style>
            <MapNode point={points.get(OWNER_NODE)} label={t('orcaFork.agentsMap.you', 'You')}>
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="size-4" />
              </span>
            </MapNode>
            {rooms.map((room) => (
              <MapNode
                key={room.id}
                point={points.get(roomNode(room.id))}
                label={room.kind === 'channel' ? `#${room.name}` : room.name}
                onClick={() => {
                  void openBotGroup(room.group)
                    .then(onClose)
                    .catch((error: unknown) => toast.error(botErrorMessage(error)))
                }}
              >
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                  {room.kind === 'channel' ? (
                    <Hash className="size-4" />
                  ) : (
                    <Users className="size-4" />
                  )}
                </span>
              </MapNode>
            ))}
            {bots.map((bot) => (
              <MapBotNode
                key={bot.id}
                bot={bot}
                point={points.get(botNode(bot.id))}
                onOpened={onClose}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function MapNode({
  point,
  label,
  onClick,
  children
}: {
  point: MapPoint | undefined
  label: string
  onClick?: () => void
  children: React.ReactNode
}): React.JSX.Element {
  const at = point ?? { x: 0.5, y: 0.5 }
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      title={label}
      className="absolute flex w-24 -translate-x-1/2 -translate-y-[18px] flex-col items-center gap-1 rounded-md p-0.5 text-center enabled:hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
    >
      {children}
      <span className="max-w-full truncate text-[11px] leading-tight text-foreground">{label}</span>
    </button>
  )
}

function MapBotNode({
  bot,
  point,
  onOpened
}: {
  bot: Bot
  point: MapPoint | undefined
  onOpened: () => void
}): React.JSX.Element {
  const presence = useBotPresence(bot, 0)
  return (
    <MapNode
      point={point}
      label={bot.name}
      onClick={() => {
        if (openBotHome(bot)) {
          onOpened()
        }
      }}
    >
      <span
        className={cn(
          'rounded-lg',
          presence.status === 'working' &&
            'ring-2 ring-primary ring-offset-2 ring-offset-background',
          presence.status === 'permission' &&
            'ring-2 ring-[var(--status-warning)] ring-offset-2 ring-offset-background'
        )}
        title={presence.label}
      >
        <BotAvatar bot={bot} className="size-9 rounded-lg text-sm" />
      </span>
    </MapNode>
  )
}
