// orca-fork: every version of a wiki page; the one picked shows what changed from the one before,
// and can be restored as a new version.
import React, { useMemo, useState } from 'react'
import { diffLines } from 'diff'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useTranslate } from '@/i18n/use-translate'
import { cn } from '@/lib/class-names'
import type { WikiPage, WikiVersion } from '../../../../../shared/orca-fork/wiki/wiki-types'
import { useWikiHistory, writeWiki, type WikiTarget } from './wiki-rpc'
import { useWikiActorName, WikiActorAvatar, wikiWhen } from './WikiActor'

function versionText(version: WikiVersion): string {
  const head = [`# ${version.title}`]
  if (version.folder) {
    head.push(`Folder: ${version.folder}`)
  }
  if (version.tags.length) {
    head.push(`Tags: ${version.tags.join(', ')}`)
  }
  return `${head.join('\n')}\n\n${version.body}`
}

function VersionDiff({
  before,
  after
}: {
  before: WikiVersion | null
  after: WikiVersion
}): React.JSX.Element {
  const parts = useMemo(() => {
    const changes = diffLines(before ? versionText(before) : '', versionText(after))
    const starts = changes.reduce<number[]>(
      (acc, part, index) => [...acc, (acc[index] ?? 0) + part.value.length],
      [0]
    )
    return changes.map((part, index) => ({
      ...part,
      key: `${part.added ? '+' : part.removed ? '-' : '='}${starts[index] ?? 0}`
    }))
  }, [before, after])
  return (
    <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-5">
      {parts.map((part) => (
        <span
          key={part.key}
          className={cn(
            'block px-2',
            part.added && 'bg-[var(--diff-added-background)]',
            part.removed &&
              'bg-[var(--diff-removed-background)] line-through decoration-muted-foreground/50'
          )}
        >
          {part.value.replace(/\n$/, '')}
        </span>
      ))}
    </pre>
  )
}

export function WikiHistoryDialog({
  target,
  page,
  open,
  onOpenChange
}: {
  target: WikiTarget
  page: WikiPage
  open: boolean
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  const history = useWikiHistory(open ? target : null, page.id)
  const versions = history.data?.versions ?? []
  const [picked, setPicked] = useState<number | null>(null)
  const [restoring, setRestoring] = useState(false)
  const index = Math.max(
    0,
    versions.findIndex((version) => version.version === picked)
  )
  const current = versions[index] ?? null
  const previous = versions[index + 1] ?? null

  const restore = async () => {
    if (!current) {
      return
    }
    setRestoring(true)
    try {
      await writeWiki(target, 'restoreVersion', { page: page.id, version: current.version })
      toast.success(
        t('orcaFork.wiki.restoredVersion', 'Restored version {{version}}', {
          version: current.version
        })
      )
      setRestoring(false)
      onOpenChange(false)
    } catch (caught) {
      setRestoring(false)
      toast.error(caught instanceof Error ? caught.message : String(caught))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setPicked(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-5xl sm:max-w-5xl">
        <div className="flex h-[80vh] flex-col gap-3">
          <DialogTitle>
            {t('orcaFork.wiki.historyTitle', 'History of {{title}}', { title: page.title })}
          </DialogTitle>
          <div className="flex min-h-0 flex-1 gap-3">
            <ul className="flex w-64 shrink-0 flex-col gap-0.5 overflow-y-auto scrollbar-sleek">
              {versions.map((version) => (
                <li key={version.version}>
                  <button
                    type="button"
                    data-current={version.version === current?.version ? 'true' : undefined}
                    onClick={() => setPicked(version.version)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent data-[current=true]:bg-accent"
                  >
                    <WikiActorAvatar actor={version.by} hostId={target.hostId} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        v{version.version} · {actorName(version.by)}
                      </span>
                      <span className="block truncate text-2xs text-muted-foreground">
                        {wikiWhen(version.at)}
                        {version.note ? ` · ${version.note}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="min-w-0 flex-1 overflow-y-auto rounded-md border border-border py-2 scrollbar-sleek">
              {current ? (
                <VersionDiff before={previous} after={current} />
              ) : (
                <p className="px-3 text-xs text-muted-foreground">
                  {history.error ?? t('orcaFork.wiki.loading', 'Loading…')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-2xs text-muted-foreground">
              {t(
                'orcaFork.wiki.historyHint',
                'Green was added and struck-through was removed, compared with the version before.'
              )}
            </span>
            <Button
              disabled={!current || current.version === page.version || restoring}
              onClick={() => void restore()}
            >
              {t('orcaFork.wiki.restoreThisVersion', 'Restore this version')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
