// orca-fork: the Agents map's graph: the owner, every bot and every room (channel, group) as nodes;
// who sits in which room, who handed work to whom and who mentioned whom as edges, each with how
// often and how recently it happened, so the map can light up what is happening now.

export type MapBot = { id: string; name: string }
export type MapRoom = { id: string; name: string; kind: 'channel' | 'group'; botIds: string[] }
/** One room post, as `bots.groups.read` lists it. */
export type MapMessage = {
  author: { kind: 'owner' } | { kind: 'bot'; id: string }
  text: string
  createdAt: number
  /** The member whose peer request this turn answers. */
  requester?: { id: string; told?: true }
  /** The member whose reply this follow-up reads. */
  answeredBy?: { id: string }
}

export const OWNER_NODE = 'owner'

export type MapEdgeKind = 'member' | 'handoff' | 'mention'
export type MapEdge = {
  id: string
  kind: MapEdgeKind
  /** Node ids: `owner`, `bot:<id>` or `room:<id>`. */
  from: string
  to: string
  count: number
  lastAt: number | null
}

export const botNode = (id: string): string => `bot:${id}`
export const roomNode = (id: string): string => `room:${id}`

/** How long an edge counts as live after its last message. */
export const LIVE_MS = 2 * 60_000

function mentionTargets(text: string, bots: readonly MapBot[]): MapBot[] {
  const lower = text.toLowerCase()
  return bots.filter((bot) => {
    const name = bot.name.toLowerCase()
    const at = lower.indexOf(`@${name}`)
    if (at === -1) {
      return false
    }
    // `@Ana` must not match `@Anabel`.
    const next = lower.charAt(at + name.length + 1)
    return !/[\p{L}\p{N}_-]/u.test(next)
  })
}

export function buildAgentsMap(
  bots: readonly MapBot[],
  rooms: readonly MapRoom[],
  messagesByRoom: ReadonlyMap<string, readonly MapMessage[]>
): MapEdge[] {
  const known = new Set(bots.map((bot) => bot.id))
  const edges = new Map<string, MapEdge>()
  const add = (kind: MapEdgeKind, from: string, to: string, at: number | null): void => {
    if (from === to) {
      return
    }
    const id = `${kind}:${from}>${to}`
    const edge = edges.get(id) ?? { id, kind, from, to, count: 0, lastAt: null }
    edge.count += 1
    if (at !== null && (edge.lastAt === null || at > edge.lastAt)) {
      edge.lastAt = at
    }
    edges.set(id, edge)
  }
  for (const room of rooms) {
    const messages = messagesByRoom.get(room.id) ?? []
    for (const botId of room.botIds) {
      if (!known.has(botId)) {
        continue
      }
      const spoke = messages.filter((m) => m.author.kind === 'bot' && m.author.id === botId)
      const edge: MapEdge = {
        id: `member:${botNode(botId)}>${roomNode(room.id)}`,
        kind: 'member',
        from: botNode(botId),
        to: roomNode(room.id),
        count: spoke.length,
        lastAt: spoke.reduce<number | null>((max, m) => Math.max(max ?? 0, m.createdAt), null)
      }
      edges.set(edge.id, edge)
    }
    for (const message of messages) {
      const author =
        message.author.kind === 'owner'
          ? OWNER_NODE
          : known.has(message.author.id)
            ? botNode(message.author.id)
            : null
      if (!author) {
        continue
      }
      // A peer request: the asker handed work to the bot that answers it.
      if (message.requester && known.has(message.requester.id)) {
        add('handoff', botNode(message.requester.id), author, message.createdAt)
      }
      if (message.answeredBy && known.has(message.answeredBy.id)) {
        add('handoff', botNode(message.answeredBy.id), author, message.createdAt)
      }
      for (const target of mentionTargets(message.text, bots)) {
        add('mention', author, botNode(target.id), message.createdAt)
      }
    }
  }
  return [...edges.values()]
}

export type MapPoint = { x: number; y: number }

/**
 * Rooms on an inner ring, bots on an outer ring next to their first room, the owner in the middle.
 * Positions are fractions of the canvas (0..1), so the view scales them to any size.
 */
export function layoutAgentsMap(
  bots: readonly MapBot[],
  rooms: readonly MapRoom[]
): Map<string, MapPoint> {
  const points = new Map<string, MapPoint>([[OWNER_NODE, { x: 0.5, y: 0.5 }]])
  const ring = (index: number, count: number, radius: number, turn = 0): MapPoint => {
    const angle = (index / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2 + turn
    return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius }
  }
  rooms.forEach((room, index) => points.set(roomNode(room.id), ring(index, rooms.length, 0.2)))
  // Bots sorted by their first room, so a room's bots sit together around its side of the ring.
  const firstRoom = (bot: MapBot): number => {
    const index = rooms.findIndex((room) => room.botIds.includes(bot.id))
    return index === -1 ? rooms.length : index
  }
  const ordered = [...bots].sort(
    (a, b) => firstRoom(a) - firstRoom(b) || a.name.localeCompare(b.name)
  )
  const turn = rooms.length > 0 ? -Math.PI / Math.max(ordered.length, 1) : 0
  ordered.forEach((bot, index) =>
    points.set(botNode(bot.id), ring(index, ordered.length, 0.42, turn))
  )
  return points
}
