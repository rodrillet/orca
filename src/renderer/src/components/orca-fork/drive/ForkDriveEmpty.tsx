// orca-fork: the Drive with nothing to show, and the notice for a paired server without a Drive.
import { useRef } from 'react'
import { HardDrive, Info, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslate } from '@/i18n/use-translate'
import type { DriveHostState } from './drive-host-data'

export function ForkDriveEmpty({
  trash,
  filtering,
  onUpload
}: {
  trash: boolean
  filtering: boolean
  onUpload: (files: File[]) => void
}): React.JSX.Element {
  const t = useTranslate()
  const input = useRef<HTMLInputElement>(null)
  const [title, body] = trash
    ? [
        t('orcaFork.drive.emptyTrashTitle', 'The trash is empty'),
        t('orcaFork.drive.emptyTrashBody', 'Files you delete wait here until you empty it.')
      ]
    : filtering
      ? [
          t('orcaFork.drive.noMatchTitle', 'Nothing here'),
          t('orcaFork.drive.noMatchBody', 'No file matches, or this folder is empty.')
        ]
      : [
          t('orcaFork.drive.emptyTitle', 'Everything your agents make, in one place'),
          t(
            'orcaFork.drive.emptyBody',
            'Files you send in chats and files your agents save show up here. Upload yours or drag them onto this page.'
          )
        ]
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HardDrive className="size-7" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {!trash && !filtering ? (
        <>
          <input
            ref={input}
            type="file"
            multiple
            hidden
            onChange={(event) => {
              const files = [...(event.target.files ?? [])]
              event.target.value = ''
              if (files.length > 0) {
                onUpload(files)
              }
            }}
          />
          <Button type="button" onClick={() => input.current?.click()}>
            <Upload className="size-4" />
            {t('orcaFork.drive.uploadFile', 'Upload file')}
          </Button>
        </>
      ) : null}
    </div>
  )
}

export function ForkDriveNotices({
  hosts,
  labelOf
}: {
  hosts: readonly { hostId: string; state: DriveHostState }[]
  labelOf: (hostId: string) => string
}): React.JSX.Element | null {
  const t = useTranslate()
  const unsupported = hosts.filter((host) => host.state === 'unsupported')
  const failed = hosts.filter((host) => host.state === 'failed')
  if (unsupported.length === 0 && failed.length === 0) {
    return null
  }
  return (
    <div className="flex shrink-0 flex-col gap-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {unsupported.map((host) => (
        <p key={host.hostId} className="flex items-center gap-2">
          <Info className="size-3.5 shrink-0" />
          {t(
            'orcaFork.drive.serverWithoutDrive',
            '{{name}} runs the stock orca-server: install the fork’s orca-server there to keep its files in the Drive.',
            { name: labelOf(host.hostId) }
          )}
        </p>
      ))}
      {failed.map((host) => (
        <p key={host.hostId} className="flex items-center gap-2">
          <Info className="size-3.5 shrink-0" />
          {t(
            'orcaFork.drive.serverUnreachable',
            'Could not read the Drive on {{name}}; showing what it had.',
            {
              name: labelOf(host.hostId)
            }
          )}
        </p>
      ))}
    </div>
  )
}
