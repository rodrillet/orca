// orca-fork: the wiki store inside the bots DB worker, so its SQL never runs on the runtime's thread.
import { FORK_WIKI_DB_OPS, type WikiDbOp, type WikiDbOps } from './wiki-db-contract'
import { WikiStore } from './wiki-store'

function isWikiDbOp(op: string): op is WikiDbOp {
  return FORK_WIKI_DB_OPS.some((entry) => entry === op)
}

export function openForkWikiDbStore(path: string): {
  call: (op: string, args: readonly unknown[]) => { found: boolean; value?: unknown }
  dispose: () => void
} {
  const store = WikiStore.open(path)
  const ops: WikiDbOps = store
  return {
    call: (op, args) => {
      if (!isWikiDbOp(op)) {
        return { found: false }
      }
      const method: (...values: never[]) => unknown = ops[op]
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the args crossed the worker boundary from a forkWikiDb call of this same op.
      return { found: true, value: method.apply(store, args as never[]) }
    },
    dispose: () => store.close()
  }
}
