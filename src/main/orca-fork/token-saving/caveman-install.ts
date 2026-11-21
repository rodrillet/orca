// orca-fork: where this machine's Caveman lives. Its installer puts the runtime in ~/.caveman/bin
// (CAVEMAN_HOME moves it), the same place on a Mac and on a paired Linux server.
import { access, constants } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const CAVEMAN_PROXY_ADDRESS = '127.0.0.1:8787'

type CavemanBinaryName = 'caveman-proxy' | 'caveman-mcp'

export function cavemanHome(): string {
  const configured = process.env.CAVEMAN_HOME?.trim()
  return configured ? configured : join(homedir(), '.caveman')
}

export function cavemanBinDirectory(): string {
  return join(cavemanHome(), 'bin')
}

export function cavemanDatabasePath(): string {
  return process.env.CAVEMAN_DB?.trim() || join(cavemanHome(), 'caveman.db')
}

function binaryPath(name: CavemanBinaryName): string {
  return join(cavemanBinDirectory(), process.platform === 'win32' ? `${name}.exe` : name)
}

const found = new Map<CavemanBinaryName, string | null>()

/** Looks again (installed or removed since); every status and launch read refreshes it. */
export async function findCavemanBinary(name: CavemanBinaryName): Promise<string | null> {
  const path = binaryPath(name)
  try {
    await access(path, process.platform === 'win32' ? constants.F_OK : constants.X_OK)
    found.set(name, path)
    return path
  } catch {
    found.set(name, null)
    return null
  }
}

/** What the last look found, for callers that can't wait (a terminal's environment). */
export function knownCavemanBinary(name: CavemanBinaryName): string | null {
  return found.get(name) ?? null
}
