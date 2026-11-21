// orca-fork: the runtime's handle on the wiki store, every call answered by the bots DB worker.
import { join } from 'node:path'
import { BotItemError } from '../../bots/bot-item-error'
import { BotsDbWorkerClient } from '../../bots/db-worker/bots-db-worker-client'
import { getProfileUserDataPath } from '../../orca-profiles/profile-storage-paths'
import { FORK_WIKI_DB_STORE, type WikiDbOp, type WikiDbOps } from './wiki-db-contract'
import { WikiError } from './wiki-error'

type WikiRemote = {
  [Op in WikiDbOp]: (...args: Parameters<WikiDbOps[Op]>) => Promise<ReturnType<WikiDbOps[Op]>>
}

let client: BotsDbWorkerClient | null = null

async function call(op: WikiDbOp, args: readonly unknown[]): Promise<unknown> {
  client ??= new BotsDbWorkerClient()
  const path = join(getProfileUserDataPath(), 'orca-fork-wiki.sqlite')
  try {
    return await client.call(FORK_WIKI_DB_STORE, path, op, [...args])
  } catch (error) {
    throw error instanceof BotItemError
      ? error
      : new WikiError(error instanceof Error ? error.message : String(error))
  }
}

function remote<Op extends WikiDbOp>(op: Op): WikiRemote[Op] {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the worker runs the store method named `op` with these arguments and answers its return value unchanged.
  return ((...args: unknown[]) => call(op, args)) as WikiRemote[Op]
}

export const forkWikiDb: WikiRemote = {
  list: remote('list'),
  show: remote('show'),
  recordView: remote('recordView'),
  create: remote('create'),
  update: remote('update'),
  tag: remote('tag'),
  mention: remote('mention'),
  history: remote('history'),
  restoreVersion: remote('restoreVersion'),
  trash: remote('trash'),
  restore: remote('restore'),
  purge: remote('purge')
}
