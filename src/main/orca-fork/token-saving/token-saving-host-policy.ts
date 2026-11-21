// orca-fork: the token-saving policy this host applies, as the desktop last resolved it. Kept in
// userData/orca-fork/token-saving-host.json so it holds while the desktop is closed; none yet is on.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  normalizeTokenSavingHostPolicy,
  type TokenSavingHostPolicy
} from '../../../shared/orca-fork/token-saving/token-saving'
import { getProfileUserDataPath } from '../../orca-profiles/profile-storage-paths'

let current: TokenSavingHostPolicy | null = null
let loading: Promise<TokenSavingHostPolicy> | null = null

function policyPath(): string {
  return join(getProfileUserDataPath(), 'orca-fork', 'token-saving-host.json')
}

/** The saved policy, read once per run. */
export function loadTokenSavingHostPolicy(): Promise<TokenSavingHostPolicy> {
  if (current) {
    return Promise.resolve(current)
  }
  loading ??= (async () => {
    let read: TokenSavingHostPolicy
    try {
      read = normalizeTokenSavingHostPolicy(JSON.parse(await readFile(policyPath(), 'utf8')))
    } catch {
      read = normalizeTokenSavingHostPolicy(null)
    }
    // A set that landed while reading wins.
    current ??= read
    return current
  })()
  return loading
}

/** The policy as known now, for callers that can't wait; starts the read when none happened yet. */
export function tokenSavingHostPolicy(): TokenSavingHostPolicy {
  if (!current) {
    void loadTokenSavingHostPolicy()
  }
  return current ?? normalizeTokenSavingHostPolicy(null)
}

let writing: Promise<unknown> = Promise.resolve()

export async function setTokenSavingHostPolicy(
  next: Omit<TokenSavingHostPolicy, 'updatedAt'>
): Promise<TokenSavingHostPolicy> {
  const policy = normalizeTokenSavingHostPolicy({ ...next, updatedAt: Date.now() })
  current = policy
  const file = policyPath()
  const write = writing.then(async () => {
    await mkdir(dirname(file), { recursive: true })
    const temp = `${file}.${process.pid}.tmp`
    await writeFile(temp, `${JSON.stringify(policy, null, 2)}\n`, 'utf8')
    await rename(temp, file)
  })
  writing = write.catch(() => undefined)
  await write
  return policy
}
