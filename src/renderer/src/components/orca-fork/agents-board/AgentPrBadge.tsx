// orca-fork: a worker's or item's pull request with its CI and review, as the Agents views show it.
import React from 'react'
import { GitPullRequest } from 'lucide-react'
import { openAppHttpLink } from '@/lib/browser/navigation/app-http-link-open'
import { cn } from '@/lib/class-names'
import { useTranslate, type Translate } from '@/i18n/use-translate'
import type { AgentsBoardPr } from './agents-board-model'

export function agentPrLabel(t: Translate, pr: AgentsBoardPr): string {
  if (pr.state === 'merged') {
    return t('orcaFork.agentsTasks.pr.merged', 'merged')
  }
  if (pr.state === 'closed') {
    return t('orcaFork.agentsTasks.pr.closed', 'closed')
  }
  const checks =
    pr.checks === 'success'
      ? t('orcaFork.agentsTasks.pr.ciGreen', 'CI green')
      : pr.checks === 'failure'
        ? t('orcaFork.agentsTasks.pr.ciFailing', 'CI failing')
        : pr.checks === 'pending'
          ? t('orcaFork.agentsTasks.pr.ciRunning', 'CI running')
          : t('orcaFork.agentsTasks.pr.noCi', 'no CI')
  const review =
    pr.review === 'APPROVED'
      ? t('orcaFork.agentsTasks.pr.approved', 'approved')
      : pr.review === 'CHANGES_REQUESTED'
        ? t('orcaFork.agentsTasks.pr.changes', 'changes requested')
        : null
  return review ? `${checks} · ${review}` : checks
}

export function agentPrTone(pr: AgentsBoardPr): string {
  if (pr.state === 'merged') {
    return 'text-workspace-status-done'
  }
  if (pr.state === 'closed') {
    return 'text-muted-foreground'
  }
  return pr.checks === 'failure'
    ? 'text-destructive'
    : pr.checks === 'success'
      ? 'text-status-success'
      : 'text-muted-foreground'
}

export function AgentPrBadge({
  pr,
  className
}: {
  pr: AgentsBoardPr
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <button
      type="button"
      className={cn(
        'flex min-w-0 shrink items-center gap-1 rounded px-1 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        agentPrTone(pr),
        className
      )}
      title={pr.url}
      onClick={(event) => {
        event.stopPropagation()
        openAppHttpLink(pr.url, { event })
      }}
    >
      <GitPullRequest className="size-3 shrink-0" />
      <span className="truncate">
        #{pr.number} · {agentPrLabel(t, pr)}
      </span>
    </button>
  )
}
