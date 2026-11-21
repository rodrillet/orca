// orca-fork: what a card's work left in the Drive and the Wiki: files from its chat, and files and pages
// its bot (or the agents it ran) made while the work ran.
import type { Bot } from '../../../../../shared/bot-types'
import type { DriveFile } from '../../../../../shared/orca-fork/drive/drive-types'
import type { WikiPageSummary } from '../../../../../shared/orca-fork/wiki/wiki-types'
import type { AgentsBoardCard } from './agents-board-model'

/** Saves just before the work started or right after it ended still belong to it. */
const LEAD_MS = 60_000
const TAIL_MS = 10 * 60_000

export type CardWindow = { from: number; to: number }

export function cardWindow(card: AgentsBoardCard, now: number): CardWindow | null {
  const start = card.startedAt
  if (start === null) {
    return null
  }
  return { from: start - LEAD_MS, to: (card.finishedAt ?? now) + TAIL_MS }
}

function within(at: number, window: CardWindow | null): boolean {
  return window !== null && at >= window.from && at <= window.to
}

export function driveFilesForCard<T extends DriveFile>(
  files: readonly T[],
  bot: Pick<Bot, 'id'>,
  chatId: string | null,
  window: CardWindow | null
): T[] {
  return files
    .filter((file) => {
      if (file.trashedAt !== null) {
        return false
      }
      const source = file.source
      if (source.kind === 'upload') {
        return false
      }
      if (chatId && source.sessionId === chatId) {
        return within(file.createdAt, window) || window === null
      }
      return source.botId === bot.id && within(file.createdAt, window)
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

export function wikiPagesForCard(
  pages: readonly WikiPageSummary[],
  bot: Pick<Bot, 'id'>,
  window: CardWindow | null
): WikiPageSummary[] {
  return pages
    .filter(
      (page) =>
        page.deletedAt === null &&
        within(page.updatedAt, window) &&
        (page.updatedBy.kind === 'agent' ||
          (page.updatedBy.kind === 'bot' && page.updatedBy.botId === bot.id))
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
}
