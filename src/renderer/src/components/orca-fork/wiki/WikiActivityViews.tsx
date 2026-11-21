// orca-fork: the Wiki's Consultations (every read in the workspace, by day) and Agents (who reads the
// wiki, and for one of them, the pages it read and when) centers.
import React from 'react'
import { ArrowLeft, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { WikiConsultation } from '../../../../../shared/orca-fork/wiki/wiki-types'
import { useWikiActivity, type WikiTarget } from './wiki-rpc'
import { showWikiCenter } from './wiki-view-state'
import { useWikiActorName, WikiActorAvatar, wikiWhen } from './WikiActor'
import { ConsultationLog } from './WikiConsultations'

function Header({
  title,
  subtitle,
  back
}: {
  title: React.ReactNode
  subtitle: string
  back?: () => void
}): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="flex items-start gap-2">
      {back ? (
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t('orcaFork.wiki.back', 'Back')}
          onClick={back}
        >
          <ArrowLeft className="size-4" />
        </Button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  )
}

function Unavailable({ error }: { error: string }): React.JSX.Element {
  const t = useTranslate()
  return (
    <div className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
      <p>
        {t(
          'orcaFork.wiki.activityUnavailable',
          'This computer’s Orca does not log consultations yet. Install the fork’s latest orca-server there.'
        )}
      </p>
      <p className="mt-1 text-xs">{error}</p>
    </div>
  )
}

export function WikiConsultationsView({ target }: { target: WikiTarget }): React.JSX.Element {
  const t = useTranslate()
  const activity = useWikiActivity(target, { limit: 300 })
  const data = activity.data
  return (
    <div className="flex flex-col gap-5 pb-10">
      <Header
        title={t('orcaFork.wiki.consultations', 'Consultations')}
        subtitle={t(
          'orcaFork.wiki.consultationsSubtitle',
          'Every time an agent or you opened a page: who, when, and from which chat or task.'
        )}
      />
      {activity.error && !data ? <Unavailable error={activity.error} /> : null}
      {data ? (
        <ConsultationLog
          entries={data.consultations}
          hostId={target.hostId}
          empty={t(
            'orcaFork.wiki.noConsultations',
            'No consultations yet. Agents’ reads (orca wiki show) show here.'
          )}
        />
      ) : null}
    </div>
  )
}

/** The pages one reader read, most first, with the last time. */
function pagesRead(entries: readonly WikiConsultation[]) {
  const pages = new Map<string, { entry: WikiConsultation; count: number }>()
  for (const entry of entries) {
    const known = pages.get(entry.pageId)
    if (known) {
      known.count += 1
    } else {
      pages.set(entry.pageId, { entry, count: 1 })
    }
  }
  return [...pages.values()].sort((a, b) => b.count - a.count || b.entry.at - a.entry.at)
}

function ReaderDetail({
  target,
  actorKey
}: {
  target: WikiTarget
  actorKey: string
}): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  const activity = useWikiActivity(target, { actorKey, limit: 300 })
  const data = activity.data
  const entries = data?.consultations ?? []
  const reader = data?.readers.find((entry) => entry.key === actorKey)
  const actor = reader?.actor ?? entries[0]?.by
  const pages = pagesRead(entries)
  return (
    <div className="flex flex-col gap-5 pb-10">
      <Header
        back={() => showWikiCenter({ kind: 'readers', actorKey: null })}
        title={
          <>
            {actor ? (
              <WikiActorAvatar actor={actor} hostId={target.hostId} className="size-7" />
            ) : null}
            {actor ? actorName(actor) : actorKey}
          </>
        }
        subtitle={t(
          'orcaFork.wiki.readerSubtitle',
          'What it read in the wiki: {{reads}} reads of {{pages}} pages.',
          {
            reads: entries.length,
            pages: pages.length
          }
        )}
      />
      {activity.error && !data ? <Unavailable error={activity.error} /> : null}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="flex flex-col gap-1.5">
          <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('orcaFork.wiki.pagesRead', 'Pages it read')}
          </h2>
          <ul className="flex flex-col rounded-lg border border-border p-1">
            {pages.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-muted-foreground">
                {t('orcaFork.wiki.nothingRead', 'Nothing read yet.')}
              </li>
            ) : null}
            {pages.map(({ entry, count }) => (
              <li key={entry.pageId}>
                <button
                  type="button"
                  disabled={entry.trashed}
                  onClick={() => showWikiCenter({ kind: 'page', slug: entry.slug })}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] enabled:hover:bg-accent disabled:text-muted-foreground"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{entry.title}</span>
                  <span className="shrink-0 text-2xs text-muted-foreground">
                    {wikiWhen(entry.at)}
                  </span>
                  <span className="w-8 shrink-0 text-right text-2xs tabular-nums text-muted-foreground">
                    {count}×
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-1.5">
          <h2 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('orcaFork.wiki.timeline', 'When, and from where')}
          </h2>
          <ConsultationLog
            entries={entries}
            hostId={target.hostId}
            showReader={false}
            empty={t('orcaFork.wiki.nothingRead', 'Nothing read yet.')}
          />
        </section>
      </div>
    </div>
  )
}

export function WikiReadersView({
  target,
  actorKey
}: {
  target: WikiTarget
  actorKey: string | null
}): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  const activity = useWikiActivity(actorKey ? null : target, { limit: 1 })
  if (actorKey) {
    return <ReaderDetail key={actorKey} target={target} actorKey={actorKey} />
  }
  const data = activity.data
  const readers = data?.readers ?? []
  return (
    <div className="flex flex-col gap-5 pb-10">
      <Header
        title={t('orcaFork.wiki.readers', 'Agents')}
        subtitle={t(
          'orcaFork.wiki.readersSubtitle',
          'Who reads the wiki, last {{days}} days. Open one to see what it read.',
          {
            days: data?.windowDays ?? 30
          }
        )}
      />
      {activity.error && !data ? <Unavailable error={activity.error} /> : null}
      {data && readers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('orcaFork.wiki.noReaders', 'No one read the wiki in this period.')}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {readers.map((reader) => (
          <button
            key={reader.key}
            type="button"
            onClick={() => showWikiCenter({ kind: 'readers', actorKey: reader.key })}
            className={cn(
              'flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-accent'
            )}
          >
            <WikiActorAvatar actor={reader.actor} hostId={target.hostId} className="size-9" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{actorName(reader.actor)}</span>
              <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                <Eye className="size-3" />
                {t('orcaFork.wiki.readerStats', '{{reads}} reads · {{pages}} pages · {{when}}', {
                  reads: reader.count,
                  pages: reader.pages,
                  when: wikiWhen(reader.lastAt)
                })}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
