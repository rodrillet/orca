// orca-fork: reaches a paired machine's agent computers hub and its viewers over the runtime's own
// E2EE browser tunnel (a stock server's SOCKS route to its loopback), so no port is opened or forwarded.
import { app } from 'electron'
import { connect, createServer, type Server, type Socket } from 'node:net'
import { getPreferredPairedRuntimeConnection } from '../../../shared/remote-runtime/host-catalog/runtime-environments'
import { resolveEnvironment } from '../../../shared/remote-runtime/host-store/runtime-environment-store'
import { AGENT_COMPUTERS_HUB_PORT } from '../../../shared/orca-fork/agent-computers/agent-computer-contract'
import { PairedRuntimeBrowserHostLease } from '../../browser/client-hosts/leases/paired-runtime-browser-host-lease'
import { getBrowserClientHostId } from '../../browser/client-hosts/lifecycle/browser-client-host-id'
import { PairedRuntimeBrowserNetworkRoute } from '../../browser/network/execution-routes/paired-runtime-browser-network-route'
import { callRuntimeEnvironment } from '../../ipc/runtime-environments/requests/runtime-environment-transport-routing'

type SocksAddress = { host: string; port: number }
type EnvironmentTunnel = { socks: SocksAddress; close: () => Promise<void> }

export class AgentComputerHubMissing extends Error {
  constructor() {
    super('agent_computers_hub_missing')
  }
}

const tunnels = new Map<string, Promise<EnvironmentTunnel>>()

function userDataPath(): string {
  return app.getPath('userData')
}

/** The hub's page title names the server's runtime and start, which the tunnel's route must match. */
async function discoverRuntime(
  environmentId: string
): Promise<{ runtimeId: string; startedAt: number }> {
  const response = await callRuntimeEnvironment(
    userDataPath(),
    environmentId,
    'workspacePorts.probePage',
    { host: '127.0.0.1', port: AGENT_COMPUTERS_HUB_PORT, protocol: 'http' },
    10_000
  )
  if (!response.ok) {
    throw new Error(response.error.message)
  }
  const result = response.result as { kind?: string; title?: string | null }
  const match =
    result.kind === 'page' ? /^orca-computers v1 (\S+) (\d+)$/.exec(result.title ?? '') : null
  if (!match) {
    throw new AgentComputerHubMissing()
  }
  return { runtimeId: match[1], startedAt: Number(match[2]) }
}

async function openTunnel(environmentId: string): Promise<EnvironmentTunnel> {
  const environment = await resolveEnvironment(userDataPath(), environmentId)
  const runtime = await discoverRuntime(environmentId)
  const connection = getPreferredPairedRuntimeConnection(environment)
  const onError = (error: Error): void => {
    console.warn('[orca-fork:computers] tunnel error:', error.message)
  }
  const lease = new PairedRuntimeBrowserHostLease({
    connection,
    authorityRuntimeId: runtime.runtimeId,
    // Its own host identity, so the computers' lease never replaces the browser's.
    browserHostClientId: `${getBrowserClientHostId()}:orca-fork-computers`,
    hostCapabilities: ['webview'],
    onError
  })
  try {
    const authority = await lease.start()
    const route = new PairedRuntimeBrowserNetworkRoute({
      connection,
      lease: authority,
      executionHostRevision: runtime.startedAt,
      onError,
      onUnavailable: () => dropTunnel(environmentId)
    })
    const socks = await route.start()
    return {
      socks,
      close: async () => {
        await route.close().catch(() => undefined)
        await lease.close().catch(() => undefined)
      }
    }
  } catch (error) {
    await lease.close().catch(() => undefined)
    throw error
  }
}

function tunnelFor(environmentId: string): Promise<EnvironmentTunnel> {
  let tunnel = tunnels.get(environmentId)
  if (!tunnel) {
    tunnel = openTunnel(environmentId)
    tunnels.set(environmentId, tunnel)
    tunnel.catch(() => tunnels.delete(environmentId))
  }
  return tunnel
}

function dropTunnel(environmentId: string): void {
  const tunnel = tunnels.get(environmentId)
  tunnels.delete(environmentId)
  void tunnel?.then((open) => open.close()).catch(() => undefined)
}

/** A paused socket to the machine's 127.0.0.1:port through the tunnel's SOCKS5 front. */
function socksConnect(socks: SocksAddress, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect(socks)
    let buffer = Buffer.alloc(0)
    let greeted = false
    const fail = (error: Error): void => {
      socket.destroy()
      reject(error)
    }
    const onData = (chunk: Buffer): void => {
      buffer = Buffer.concat([buffer, chunk])
      if (!greeted) {
        if (buffer.length < 2) {
          return
        }
        if (buffer[0] !== 5 || buffer[1] !== 0) {
          fail(new Error('SOCKS greeting refused'))
          return
        }
        greeted = true
        buffer = buffer.subarray(2)
        const host = Buffer.from('127.0.0.1')
        socket.write(
          Buffer.concat([
            Buffer.from([5, 1, 0, 3, host.length]),
            host,
            Buffer.from([port >> 8, port & 0xff])
          ])
        )
      }
      if (buffer.length < 10) {
        return
      }
      if (buffer[1] !== 0) {
        fail(new Error(`The machine refused 127.0.0.1:${port} (${buffer[1]})`))
        return
      }
      socket.pause()
      socket.off('data', onData)
      socket.off('error', fail)
      const rest = buffer.subarray(10)
      if (rest.length > 0) {
        socket.unshift(rest)
      }
      resolve(socket)
    }
    socket.once('error', fail)
    socket.once('connect', () => socket.write(Buffer.from([5, 1, 0])))
    socket.on('data', onData)
  })
}

async function connectRemote(environmentId: string, port: number): Promise<Socket> {
  try {
    return await socksConnect((await tunnelFor(environmentId)).socks, port)
  } catch (error) {
    // A route that died after it was cached is opened again once.
    dropTunnel(environmentId)
    if (error instanceof AgentComputerHubMissing) {
      throw error
    }
    return socksConnect((await tunnelFor(environmentId)).socks, port)
  }
}

/** Is there a hub on this machine? Cheap: a port probe over the existing RPC, no tunnel. */
export async function hasAgentComputersHub(environmentId: string): Promise<boolean> {
  try {
    await discoverRuntime(environmentId)
    return true
  } catch (error) {
    if (error instanceof AgentComputerHubMissing) {
      return false
    }
    throw error
  }
}

export async function agentComputersHubRequest(
  environmentId: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<unknown> {
  const socket = await connectRemote(environmentId, AGENT_COMPUTERS_HUB_PORT)
  const payload = body === undefined ? '' : JSON.stringify(body)
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    socket.on('data', (chunk: Buffer) => chunks.push(chunk))
    socket.once('error', reject)
    socket.once('close', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      const split = raw.indexOf('\r\n\r\n')
      const status = Number(/^HTTP\/1\.\d (\d+)/.exec(raw)?.[1] ?? 0)
      try {
        const parsed = split !== -1 ? JSON.parse(raw.slice(split + 4)) : null
        if (status >= 200 && status < 300) {
          resolve(parsed)
        } else {
          reject(new Error(parsed?.error ?? `Hub answered ${status}`))
        }
      } catch {
        reject(new Error(`Hub answered ${status || 'nothing'}`))
      }
    })
    socket.resume()
    socket.write(
      [
        `${method} ${path} HTTP/1.1`,
        'Host: 127.0.0.1',
        'Connection: close',
        'Content-Type: application/json',
        `Content-Length: ${Buffer.byteLength(payload)}`,
        '',
        payload
      ].join('\r\n')
    )
  })
}

const viewers = new Map<string, Promise<{ server: Server; port: number }>>()

/** A loopback port whose connections are relayed to the computer's websockify on the machine. */
export function openAgentComputerViewerRelay(
  environmentId: string,
  computerId: string,
  webPort: number
): Promise<number> {
  const key = JSON.stringify([environmentId, computerId, webPort])
  let viewer = viewers.get(key)
  if (!viewer) {
    viewer = new Promise((resolve, reject) => {
      const server = createServer((client) => {
        client.pause()
        connectRemote(environmentId, webPort).then(
          (remote) => {
            const end = (): void => {
              client.destroy()
              remote.destroy()
            }
            client.on('error', end).on('close', end)
            remote.on('error', end).on('close', end)
            client.pipe(remote)
            remote.pipe(client)
          },
          () => client.destroy()
        )
      })
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (address && typeof address === 'object') {
          resolve({ server, port: address.port })
        } else {
          reject(new Error('Viewer relay did not bind'))
        }
      })
    })
    viewers.set(key, viewer)
    viewer.catch(() => viewers.delete(key))
  }
  return viewer.then((open) => open.port)
}
