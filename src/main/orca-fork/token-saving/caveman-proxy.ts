// orca-fork: this machine's Caveman proxy. Orca starts it when token saving is on and it is installed
// but down, and reads its health before routing an agent through it; a down proxy means direct.
import { spawnDetachedWithoutInheritance } from '@orca/process-host/isolated-detached-spawn'
import { chmod, mkdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import type { TokenSavingProxyMode } from '../../../shared/orca-fork/token-saving/token-saving'
import type { TokenSavingProxyState } from '../../../shared/orca-fork/token-saving/token-saving-rpc'
import { CAVEMAN_PROXY_ADDRESS, cavemanHome, findCavemanBinary } from './caveman-install'

const HEALTH_TIMEOUT_MS = 700
const HEALTH_CACHE_MS = 10_000
const START_WAIT_MS = 3_000
const START_RETRY_MS = 60_000

export const CAVEMAN_PROXY_URL = `http://${CAVEMAN_PROXY_ADDRESS}`

type Health = { state: TokenSavingProxyState; at: number }

let health: Health | null = null
let managed: { pid: number; mode: TokenSavingProxyMode } | null = null
let lastStartAttempt = 0
let starting: Promise<void> | null = null

function isHealthyCaveman(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'ok' in body &&
    body.ok === true &&
    'service' in body &&
    body.service === 'caveman-proxy'
  )
}

async function probe(): Promise<TokenSavingProxyState> {
  if (!(await findCavemanBinary('caveman-proxy'))) {
    return 'not_installed'
  }
  try {
    const response = await fetch(`${CAVEMAN_PROXY_URL}/health/ready`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS)
    })
    if (!response.ok) {
      return 'unhealthy'
    }
    const body: unknown = await response.json()
    return isHealthyCaveman(body) ? 'running' : 'unhealthy'
  } catch {
    return 'stopped'
  }
}

export async function cavemanProxyState(fresh = false): Promise<TokenSavingProxyState> {
  if (!fresh && health && Date.now() - health.at < HEALTH_CACHE_MS) {
    return health.state
  }
  const state = await probe()
  health = { state, at: Date.now() }
  return state
}

/** The proxy's address when the last health read found it running; no network read. */
export function lastKnownCavemanProxyUrl(): string | null {
  return health?.state === 'running' ? CAVEMAN_PROXY_URL : null
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function managedCavemanProxy(): { pid: number; mode: TokenSavingProxyMode } | null {
  if (managed && !alive(managed.pid)) {
    managed = null
  }
  return managed
}

async function waitFor(target: TokenSavingProxyState, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if ((await cavemanProxyState(true)) === target) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return false
}

/** The proxy keeps its recovery store only in a private home; a group-writable one drops it to
 *  record-only, so Orca's own launch makes the home private first (POSIX only). */
async function privateHome(home: string): Promise<void> {
  await mkdir(home, { recursive: true, mode: 0o700 })
  if (process.platform === 'win32') {
    return
  }
  try {
    const stats = await stat(home)
    if ((stats.mode & 0o022) !== 0 && stats.uid === process.getuid?.()) {
      await chmod(home, 0o700)
    }
  } catch (error) {
    console.warn('[token-saving] could not make the caveman home private', error)
  }
}

async function launch(binary: string, mode: TokenSavingProxyMode): Promise<number | null> {
  await privateHome(cavemanHome())
  // Detached so it outlives Orca, as `caveman start` does; it runs from home so it holds no
  // project. It writes its own ~/.caveman/proxy.log.
  const child = spawnDetachedWithoutInheritance({
    program: binary,
    args: ['serve'],
    cwd: homedir(),
    env: { ...process.env, CAVEMAN_MODE: mode }
  })
  child.on('error', (error) => console.warn('[token-saving] caveman proxy failed to start', error))
  child.unref()
  return child.pid ?? null
}

/** Starts the proxy when installed and down; resolves once it answers or the wait ran out. */
export async function startCavemanProxy(mode: TokenSavingProxyMode): Promise<void> {
  if (starting) {
    return starting
  }
  starting = (async () => {
    const state = await cavemanProxyState(true)
    if (state !== 'stopped') {
      return
    }
    const binary = await findCavemanBinary('caveman-proxy')
    if (!binary) {
      return
    }
    lastStartAttempt = Date.now()
    const pid = await launch(binary, mode)
    if (pid !== null) {
      managed = { pid, mode }
    }
    await waitFor('running', START_WAIT_MS)
  })().finally(() => {
    starting = null
  })
  return starting
}

/** Stops the proxy only when Orca started it; one the owner runs stays his. */
export async function stopCavemanProxy(): Promise<boolean> {
  const own = managedCavemanProxy()
  if (!own) {
    return false
  }
  try {
    process.kill(own.pid, 'SIGTERM')
  } catch {
    // already gone
  }
  managed = null
  await waitFor('stopped', START_WAIT_MS)
  return true
}

/**
 * The proxy's address for a launch now, or null to go direct. A down proxy is started in the
 * background (at most once a minute) so a later launch can use it; this launch never waits on it.
 * Launches and terminals call this, so a proxy that died comes back with the next agent.
 */
export async function cavemanProxyForLaunch(mode: TokenSavingProxyMode): Promise<string | null> {
  const state = await cavemanProxyState()
  if (state === 'running') {
    const own = managedCavemanProxy()
    if (own && own.mode !== mode) {
      // The owner changed the mode: Orca's own proxy restarts with it; this launch goes direct.
      void stopCavemanProxy().then(() => startCavemanProxy(mode))
      return null
    }
    return CAVEMAN_PROXY_URL
  }
  if (state === 'stopped' && Date.now() - lastStartAttempt > START_RETRY_MS) {
    void startCavemanProxy(mode).catch((error: unknown) =>
      console.warn('[token-saving] caveman proxy start failed', error)
    )
  }
  return null
}
