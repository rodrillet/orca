// orca-fork: where this machine's Caveman lives. Its installer puts the runtime in ~/.caveman/bin
// (CAVEMAN_HOME moves it), the same place on a Mac and on a paired Linux server.
import { accessSync, constants } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const CAVEMAN_PROXY_ADDRESS = '127.0.0.1:8787'

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

export function cavemanBinary(name: 'caveman-proxy' | 'caveman-mcp'): string | null {
  const path = join(cavemanBinDirectory(), process.platform === 'win32' ? `${name}.exe` : name)
  try {
    accessSync(path, process.platform === 'win32' ? constants.F_OK : constants.X_OK)
    return path
  } catch {
    return null
  }
}
