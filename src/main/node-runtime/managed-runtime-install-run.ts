import { randomUUID } from 'node:crypto'

export type ManagedRuntimeRun = {
  id: string
  controller: AbortController
  committed: boolean
  detachAutomaticCancellation?: () => void
}

export function createManagedRuntimeRun(parent?: AbortSignal): ManagedRuntimeRun {
  const run: ManagedRuntimeRun = {
    id: randomUUID(),
    controller: new AbortController(),
    committed: false
  }
  if (parent) {
    const abort = () => {
      if (!run.committed) {
        run.controller.abort(parent.reason)
      }
    }
    run.detachAutomaticCancellation = () => {
      parent.removeEventListener('abort', abort)
      run.detachAutomaticCancellation = undefined
    }
    parent.addEventListener('abort', abort, { once: true })
    if (parent.aborted) {
      abort()
    }
  }
  return run
}
