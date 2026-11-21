// orca-fork: the detail drawer's Result tab: the item's close note, each worker's state, times, report
// and PR, and the item's other links.
import React from 'react'
import { ExternalLink, Workflow } from 'lucide-react'
import { BotItemMarkdown } from '@/components/bots/items/BotItemMarkdown'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import {
  botItemLinksOnePerChain,
  type BotItem,
  type BotItemLinkView,
  type BotItemWorkerState
} from '../../../../../shared/bots/bot-items'
import type { OrchestrationSessionWorker } from '../../../../../shared/orchestration-session-workers'
import { AgentPrBadge } from './AgentPrBadge'
import type { AgentsBoardCard, AgentsBoardPr } from './agents-board-model'
import { boardTimeSpan } from './agents-board-time'

type DispatchLink = Extract<BotItemLinkView, { kind: 'dispatch' }>

type WorkerState = BotItemWorkerState | 'unverifiable'

function workerStateLabel(t: Translate, state: WorkerState): string {
  switch (state) {
    case 'working':
      return t('orcaFork.agentsBoard.detail.state.working', 'Working')
    case 'completed':
      return t('orcaFork.agentsBoard.detail.state.completed', 'Finished')
    case 'failed':
      return t('orcaFork.agentsTasks.worker.failed', 'Failed')
    case 'stopped':
      return t('orcaFork.agentsTasks.worker.stopped', 'Stopped')
    case 'unknown':
    case 'unverifiable':
      return t('orcaFork.agentsTasks.worker.unknown', 'Out of contact')
    case 'missing':
      return t('orcaFork.agentsBoard.detail.state.missing', 'Record gone')
  }
}

function linkPr(link: DispatchLink): AgentsBoardPr | null {
  const pr = link.pr
  return pr?.shown
    ? {
        number: pr.number,
        url: pr.url,
        state: pr.state,
        checks:
          pr.checks === 'pending' ||
          pr.checks === 'success' ||
          pr.checks === 'failure' ||
          pr.checks === 'neutral'
            ? pr.checks
            : null,
        review: pr.review
      }
    : null
}

/** One worker's run: its task, state, times, report and PR. */
function WorkerResult({
  title,
  state,
  startedAt,
  settledAt,
  subject,
  body,
  pr,
  now
}: {
  title: string
  state: WorkerState
  startedAt: number | null
  settledAt: number | null
  subject: string | null
  body: string | null
  pr: AgentsBoardPr | null
  now: number
}): React.JSX.Element {
  const t = useTranslate()
  const span = boardTimeSpan(
    startedAt,
    settledAt,
    now,
    t,
    state !== 'working' && state !== 'unknown' && state !== 'unverifiable'
  )
  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card p-2.5">
      <div className="flex min-w-0 items-center gap-1.5 text-[12px]">
        <Workflow className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        <span
          className={cn(
            'shrink-0 text-[11px]',
            state === 'failed' ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {workerStateLabel(t, state)}
        </span>
      </div>
      {span ? <div className="text-[11px] tabular-nums text-muted-foreground">{span}</div> : null}
      {subject ? <div className="text-[12px] font-medium text-foreground/90">{subject}</div> : null}
      {body ? (
        <div className="max-h-48 overflow-y-auto text-[12px] text-foreground/80 scrollbar-sleek">
          <BotItemMarkdown text={body} />
        </div>
      ) : null}
      {pr ? (
        <div className="text-[11px]">
          <AgentPrBadge pr={pr} className="-ml-1" />
        </div>
      ) : null}
    </li>
  )
}

export function ResultTab({
  card,
  item,
  record,
  now
}: {
  card: AgentsBoardCard
  item: BotItem | null
  record: OrchestrationSessionWorker | null
  now: number
}): React.JSX.Element {
  const t = useTranslate()
  const dispatches = item
    ? botItemLinksOnePerChain(item.links).flatMap((link) =>
        link.kind === 'dispatch' ? [link] : []
      )
    : []
  const others = item
    ? botItemLinksOnePerChain(item.links).filter(
        (link): link is Extract<BotItemLinkView, { kind: 'url' | 'file' }> =>
          link.kind === 'url' || link.kind === 'file'
      )
    : []
  return (
    <div className="flex flex-col gap-3">
      {item?.closeNote ? (
        <section className="flex flex-col gap-1">
          <h3 className="text-[11px] font-medium text-muted-foreground">
            {t('orcaFork.agentsBoard.card.result', 'What was done')}
          </h3>
          <div className="text-[12.5px] text-foreground">
            <BotItemMarkdown text={item.closeNote} />
          </div>
        </section>
      ) : null}
      {card.kind === 'worker' ? (
        <ul className="flex flex-col gap-2">
          <WorkerResult
            title={card.title}
            state={record?.state ?? (card.column === 'done' ? 'completed' : 'working')}
            startedAt={card.startedAt}
            settledAt={record?.settledAt ?? card.finishedAt}
            subject={null}
            body={record?.summary ?? null}
            pr={card.pr}
            now={now}
          />
        </ul>
      ) : dispatches.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <h3 className="text-[11px] font-medium text-muted-foreground">
            {t('orcaFork.agentsBoard.detail.workers', 'Workers')}
          </h3>
          <ul className="flex flex-col gap-2">
            {dispatches.toReversed().map((link) => (
              <WorkerResult
                key={link.latest ?? link.ref}
                title={link.title ?? link.ref}
                state={link.state}
                startedAt={link.startedAt}
                settledAt={link.settledAt}
                subject={link.report?.subject ?? null}
                body={link.report?.body ?? null}
                pr={linkPr(link)}
                now={now}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {others.length > 0 ? (
        <section className="flex flex-col gap-1">
          <h3 className="text-[11px] font-medium text-muted-foreground">
            {t('orcaFork.agentsBoard.detail.links', 'Links')}
          </h3>
          <ul className="flex flex-col gap-0.5 text-[12px]">
            {others.map((link) => (
              <li key={`${link.kind}:${link.ref}`} className="flex min-w-0 items-center gap-1.5">
                <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                {link.kind === 'url' ? (
                  <a
                    href={link.ref}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 truncate text-foreground hover:underline"
                  >
                    {link.issue?.title ?? link.ref}
                  </a>
                ) : (
                  <span className="min-w-0 truncate font-mono text-[11px]">{link.ref}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!item?.closeNote &&
      dispatches.length === 0 &&
      card.kind === 'item' &&
      others.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          {t('orcaFork.agentsBoard.detail.noResult', 'Nothing reported yet.')}
        </p>
      ) : null}
    </div>
  )
}
