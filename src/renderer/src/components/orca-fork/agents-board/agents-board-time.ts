// orca-fork: when a card's work ran: start and end clock times and how long it took.
import type { Translate } from '@/i18n/use-translate'
import { uiDateTimeFormat } from '@/i18n/ui-intl-formatters'

const DAY_MS = 24 * 60 * 60 * 1000

/** `14:32` today, `21 nov 14:32` another day. */
export function formatBoardClock(at: number, now: number): string {
  const sameDay = new Date(at).toDateString() === new Date(now).toDateString()
  return uiDateTimeFormat(
    sameDay
      ? { hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
  ).format(at)
}

/** `45s`, `33 min`, `2 h 05 min`, `3 d 4 h`. */
export function formatBoardDuration(ms: number, t: Translate): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) {
    return t('orcaFork.agentsBoard.duration.seconds', '{{count}}s', { count: seconds })
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return t('orcaFork.agentsBoard.duration.minutes', '{{count}} min', { count: minutes })
  }
  if (ms < DAY_MS) {
    return t('orcaFork.agentsBoard.duration.hours', '{{hours}} h {{minutes}} min', {
      hours: Math.floor(minutes / 60),
      minutes: String(minutes % 60).padStart(2, '0')
    })
  }
  const hours = Math.floor(minutes / 60)
  return t('orcaFork.agentsBoard.duration.days', '{{days}} d {{hours}} h', {
    days: Math.floor(hours / 24),
    hours: hours % 24
  })
}

/** "10:32 → 11:05 · 33 min" once finished; "since 10:32 · 12 min" while it runs; "started 10:32"
 *  when it ended at a time nobody recorded. */
export function boardTimeSpan(
  startedAt: number | null,
  finishedAt: number | null,
  now: number,
  t: Translate,
  ended = false
): string | null {
  if (startedAt === null) {
    return finishedAt === null ? null : formatBoardClock(finishedAt, now)
  }
  if (finishedAt !== null) {
    return t('orcaFork.agentsBoard.time.ran', '{{start}} → {{end}} · {{duration}}', {
      start: formatBoardClock(startedAt, now),
      end: formatBoardClock(finishedAt, now),
      duration: formatBoardDuration(finishedAt - startedAt, t)
    })
  }
  if (ended) {
    return t('orcaFork.agentsBoard.time.started', 'started {{start}}', {
      start: formatBoardClock(startedAt, now)
    })
  }
  return t('orcaFork.agentsBoard.time.running', 'since {{start}} · {{duration}}', {
    start: formatBoardClock(startedAt, now),
    duration: formatBoardDuration(now - startedAt, t)
  })
}
