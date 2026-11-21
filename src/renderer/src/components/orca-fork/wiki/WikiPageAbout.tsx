// orca-fork: under a wiki page, as agentes.chat's "About the page": the agents that use it, its
// consultations (who, when, from which chat or task), where it is mentioned, and its history.
import React from 'react'
import { FileText, MessageSquare, SquareCheck } from 'lucide-react'
import { openBotSession } from '@/components/bots/bot-session-open'
import { readHostBots } from '@/lib/bot-catalog'
import { useTranslate } from '@/i18n/use-translate'
import type {
  WikiBacklink,
  WikiConsultation,
  WikiPage
} from '../../../../../shared/orca-fork/wiki/wiki-types'
import type { WikiTarget } from './wiki-rpc'
import { closeWikiPage, showWikiCenter } from './wiki-view-state'
import { useWikiActorName, wikiWhen } from './WikiActor'
import { ConsultationLog, ReaderBars } from './WikiConsultations'

function Block({
  title,
  count,
  children
}: {
  title: string
  count?: number
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
        {count !== undefined ? <span className="ml-1.5 tabular-nums">{count}</span> : null}
      </h3>
      {children}
    </section>
  )
}

function backlinkIcon(kind: WikiBacklink['kind']): React.JSX.Element {
  const Icon = kind === 'page' ? FileText : kind === 'chat' ? MessageSquare : SquareCheck
  return <Icon className="size-3.5 shrink-0 text-muted-foreground" />
}

function Backlinks({ target, page }: { target: WikiTarget; page: WikiPage }): React.JSX.Element {
  const t = useTranslate()
  if (page.backlinks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {t(
          'orcaFork.wiki.noBacklinks',
          'Nothing mentions this page yet. Agents record it when they cite [[{{title}}]].',
          { title: page.title }
        )}
      </p>
    )
  }
  const open = (link: WikiBacklink) => {
    if (link.kind === 'page') {
      showWikiCenter({ kind: 'page', slug: link.id })
      return
    }
    const botId = link.by?.kind === 'bot' ? link.by.botId : null
    const bot = readHostBots(target.hostId).find((entry) => entry.id === botId)
    if (link.kind === 'chat' && bot) {
      closeWikiPage()
      openBotSession(bot, link.id)
    }
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {page.backlinks.map((link) => (
        <li key={`${link.kind}:${link.id}`}>
          <button
            type="button"
            onClick={() => open(link)}
            className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-accent"
          >
            {backlinkIcon(link.kind)}
            <span className="min-w-0 flex-1 truncate">{link.title || link.id}</span>
            <span className="shrink-0 text-2xs text-muted-foreground">{wikiWhen(link.at)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function WikiPageAbout({
  target,
  page,
  onHistory
}: {
  target: WikiTarget
  page: WikiPage
  onHistory: () => void
}): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  const last = page.recentViews[0]
  const consultations: WikiConsultation[] = page.recentViews.map((view) => ({
    ...view,
    pageId: page.id,
    slug: page.slug,
    title: page.title,
    folder: page.folder,
    trashed: page.deletedAt !== null
  }))
  return (
    <div
      id="wiki-page-about"
      className="grid max-w-5xl grid-cols-1 gap-8 border-t border-border pt-6 pb-12 lg:grid-cols-2"
      aria-label={t('orcaFork.wiki.aboutPage', 'About the page')}
    >
      <div className="flex flex-col gap-6">
        <Block title={t('orcaFork.wiki.usedBy', 'Agents that use this page')}>
          {page.viewers.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t(
                'orcaFork.wiki.noViews',
                'No one has consulted it yet. Agents read it with orca wiki show when they need it.'
              )}
            </p>
          ) : (
            <ReaderBars readers={page.viewers} hostId={target.hostId} />
          )}
          {last ? (
            <p className="text-2xs text-muted-foreground">
              {last.chatTitle
                ? t('orcaFork.wiki.lastReadIn', '{{name}} read it {{when}}, in “{{chat}}”', {
                    name: actorName(last.by),
                    when: wikiWhen(last.at),
                    chat: last.chatTitle
                  })
                : t('orcaFork.wiki.lastRead', '{{name}} read it {{when}}', {
                    name: actorName(last.by),
                    when: wikiWhen(last.at)
                  })}
            </p>
          ) : null}
        </Block>
        <Block title={t('orcaFork.wiki.consultations', 'Consultations')} count={page.viewCount}>
          <ConsultationLog
            entries={consultations}
            hostId={target.hostId}
            showPage={false}
            empty={t('orcaFork.wiki.noConsultationsPage', 'No consultations yet.')}
          />
        </Block>
      </div>
      <div className="flex flex-col gap-6">
        <Block title={t('orcaFork.wiki.mentionedIn', 'Mentioned in')} count={page.backlinks.length}>
          <Backlinks target={target} page={page} />
        </Block>
        <Block title={t('orcaFork.wiki.history', 'History')}>
          <button
            type="button"
            onClick={onHistory}
            className="text-left text-xs text-muted-foreground hover:text-foreground"
          >
            {t('orcaFork.wiki.allVersions', 'All {{count}} versions', {
              count: page.version,
              defaultValue_one: '{{count}} version'
            })}
            {' · '}
            {t('orcaFork.wiki.createdBy', 'created {{when}} by {{who}}', {
              when: wikiWhen(page.createdAt),
              who: actorName(page.createdBy)
            })}
          </button>
        </Block>
      </div>
    </div>
  )
}
