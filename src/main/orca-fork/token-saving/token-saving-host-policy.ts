// orca-fork: the token-saving policy this host applies, as the desktop last resolved it. Kept in
// userData/orca-fork/token-saving-host.json so it holds while the desktop is closed; none yet is on.
import { readFileSync } from 'node:fs'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  normalizeTokenSavingHostPolicy,
  type TokenSavingHostPolicy
} from '../../../shared/orca-fork/token-saving/token-saving'
import { getProfileUserDataPath } from '../../orca-profiles/profile-storage-paths'

let current: TokenSavingHostPolicy | null = null

function policyPath(): string {
  return join(getProfileUserDataPath(), 'orca-fork', 'token-saving-host.json')
}

export function tokenSavingHostPolicy(): TokenSavingHostPolicy {
  if (!current) {
    try {
      current = normalizeTokenSavingHostPolicy(JSON.parse(readFileSync(policyPath(), 'utf8')))
    } catch {
      current = normalizeTokenSavingHostPolicy(null)
    }
  }
  return current
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
