// orca-fork: pages moved to the trash, by the owner or an agent: restore one, or delete it for good.
import React, { useState } from 'react'
import { toast } from 'sonner'
import { ArchiveRestore, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useTranslate } from '@/i18n/use-translate'
import type { WikiPageSummary } from '../../../../../shared/orca-fork/wiki/wiki-types'
import { useWikiList, writeWiki, type WikiTarget } from './wiki-rpc'
import { showWikiCenter } from './wiki-view-state'
import { useWikiActorName, wikiWhen } from './WikiActor'

export function WikiTrash({ target }: { target: WikiTarget }): React.JSX.Element {
  const t = useTranslate()
  const actorName = useWikiActorName()
  const trash = useWikiList(target, true)
  const [purging, setPurging] = useState<WikiPageSummary | null>(null)
  const pages = trash.data?.pages ?? []

  const act = async (method: 'restore' | 'purge', page: WikiPageSummary) => {
    try {
      await writeWiki(target, method, { page: page.id })
      toast.success(
        method === 'restore'
          ? t('orcaFork.wiki.restoredTitle', 'Restored "{{title}}"', { title: page.title })
          : t('orcaFork.wiki.purgedTitle', 'Deleted "{{title}}" for good', { title: page.title })
      )
      if (method === 'restore') {
        showWikiCenter({ kind: 'page', slug: page.slug })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('orcaFork.wiki.trash', 'Trash')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            'orcaFork.wiki.trashHint',
            'Deleted pages stay here with their history until you delete them for good.'
          )}
        </p>
      </div>
      {pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {trash.loading && !trash.data
            ? t('orcaFork.wiki.loading', 'Loading…')
            : t('orcaFork.wiki.trashEmpty', 'The trash is empty.')}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {pages.map((page) => (
            <li key={page.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{page.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t('orcaFork.wiki.deletedBy', 'Deleted {{when}} by {{who}}', {
                    when: page.deletedAt ? wikiWhen(page.deletedAt) : '',
                    who: page.deletedBy ? actorName(page.deletedBy) : '—'
                  })}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => void act('restore', page)}>
                <ArchiveRestore className="size-4" />
                {t('orcaFork.wiki.restore', 'Restore')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPurging(page)}>
                <Trash2 className="size-4" />
                {t('orcaFork.wiki.purge', 'Delete for good')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={purging !== null}
        onOpenChange={(open) => (open ? undefined : setPurging(null))}
      >
        <DialogContent size="confirm">
          <DialogHeader>
            <DialogTitle>
              {t('orcaFork.wiki.purgeTitle', 'Delete "{{title}}" for good?', {
                title: purging?.title ?? ''
              })}
            </DialogTitle>
            <DialogDescription>
              {t(
                'orcaFork.wiki.purgeText',
                'The page, its versions and its read history are removed. This cannot be undone.'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPurging(null)}>
              {t('orcaFork.wiki.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (purging) {
                  void act('purge', purging)
                }
                setPurging(null)
              }}
            >
              {t('orcaFork.wiki.purge', 'Delete for good')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
