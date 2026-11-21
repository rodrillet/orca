import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import {
  reclaimRuntimeReleases,
  resolveInstalledRuntimeRelease,
  type ManagedRuntimePin
} from './managed-runtime-release'
import type * as ReleaseModule from './managed-runtime-release'
import { ManagedRuntimeInstallation } from './managed-runtime-installation'
import { followLatestRelease, hourlyLookup } from './managed-runtime-latest-release'

vi.mock('./managed-runtime-release', async (importOriginal) => {
  const actual = await importOriginal<typeof ReleaseModule>()
  return {
    ...actual,
    reclaimRuntimeReleases: vi.fn(actual.reclaimRuntimeReleases),
    resolveInstalledRuntimeRelease: vi.fn(actual.resolveInstalledRuntimeRelease)
  }
})

const roots: string[] = []
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

it('offers an unknown release but stops offering Install after lookup confirms no usable build', async () => {
  const root = await mkdtemp(join(tmpdir(), 'orca-runtime-network-'))
  roots.push(root)
  const now = vi.spyOn(Date, 'now').mockReturnValue(1_000)
  const installation = new ManagedRuntimeInstallation(
    'agent',
    { label: 'Agent', root: () => root, ...followLatestRelease(async () => null) },
    {
      dataDirectory: root,
      program: 'cli',
      findExternal: async () => false,
      fence: (work) => work()
    }
  )
  expect(await installation.status()).toMatchObject({ available: true })
  installation.install()
  await vi.waitFor(async () =>
    expect((await installation.status(false)).operation?.phase).toBe('failed')
  )
  expect(await installation.status()).toMatchObject({ available: false })
  now.mockReturnValue(3_601_001)
  expect(await installation.status()).toMatchObject({ available: true })
})

it.each([10, 100])(
  'keeps a shared release lookup alive for the remaining caller out of %s',
  async (count) => {
    let answer!: (value: string) => void
    const fetchLatest = vi.fn(
      (_signal?: AbortSignal) =>
        new Promise<string>((resolve) => {
          answer = resolve
        })
    )
    const lookup = hourlyLookup(fetchLatest)
    const callers = Array.from({ length: count }, () => new AbortController())
    const reads = callers.map((caller) => lookup.refresh(caller.signal))
    const abandoned = Promise.all(
      reads.slice(0, -1).map((read) => expect(read).rejects.toHaveProperty('name', 'AbortError'))
    )
    callers.slice(0, -1).forEach((caller) => caller.abort())
    await abandoned
    expect(fetchLatest.mock.calls[0]?.[0]?.aborted).toBe(false)
    answer('2.0')
    await reads.at(-1)
    expect(lookup.latest()).toBe('2.0')
    expect(fetchLatest).toHaveBeenCalledTimes(1)
  }
)

const pinFor = (version: string): ManagedRuntimePin => ({
  version,
  url: `https://example.test/${version}/agent`,
  archiveBytes: 5,
  archiveSha256: 'd4f0bc5a29de06b510f9aa428f1eedba926012b591fef7a518e776a7c9bd1824',
  format: 'file',
  members: [
    {
      path: 'agent',
      bytes: 5,
      sha256: 'd4f0bc5a29de06b510f9aa428f1eedba926012b591fef7a518e776a7c9bd1824'
    }
  ]
})

it.each([
  {
    join: false,
    committed: false,
    cancel: false,
    successor: false,
    phase: 'cancelled',
    version: '1.0',
    aborted: true
  },
  {
    join: true,
    committed: false,
    cancel: false,
    successor: false,
    phase: 'succeeded',
    version: '2.0',
    aborted: false
  },
  {
    join: false,
    committed: true,
    cancel: false,
    successor: false,
    phase: 'succeeded',
    version: '2.0',
    aborted: false
  },
  {
    join: true,
    committed: false,
    cancel: true,
    successor: false,
    phase: 'cancelled',
    version: '1.0',
    aborted: true
  },
  {
    join: false,
    committed: false,
    cancel: false,
    successor: true,
    phase: 'succeeded',
    version: '2.0',
    aborted: true
  }
])(
  'settles an automatic download with explicit join=$join and committed=$committed',
  async (scenario) => {
    const root = await mkdtemp(join(tmpdir(), 'orca-runtime-network-'))
    roots.push(root)
    let pin = pinFor('1.0')
    let downloads = 0
    let reached!: () => void
    const boundary = new Promise<void>((resolve) => {
      reached = resolve
    })
    let finish!: () => void
    let transport: AbortSignal | undefined
    const installation = new ManagedRuntimeInstallation(
      'agent',
      {
        label: 'Agent',
        root: () => root,
        pin: () => pin,
        refreshPin: async () => {}
      },
      {
        dataDirectory: root,
        program: 'cli',
        findExternal: async () => false,
        fence: (work) => work(),
        fetcher: async (_url, init) => {
          if (downloads++ === 0 || scenario.committed || (scenario.successor && downloads > 2)) {
            return new Response('agent')
          }
          transport = init?.signal ?? undefined
          return new Response(
            new ReadableStream({
              start(controller) {
                finish = () => {
                  controller.enqueue(new TextEncoder().encode('agent'))
                  controller.close()
                }
                transport?.addEventListener('abort', () => controller.error(transport?.reason), {
                  once: true
                })
                reached()
              }
            })
          )
        }
      }
    )
    installation.install()
    await vi.waitFor(async () =>
      expect((await installation.status(false)).operation?.phase).toBe('succeeded')
    )
    if (scenario.committed) {
      vi.mocked(reclaimRuntimeReleases).mockImplementationOnce(async () => {
        reached()
        await new Promise<void>((resolve) => {
          finish = resolve
        })
        return []
      })
    }
    pin = pinFor('2.0')
    const parent = new AbortController()
    const check = installation.updateIfBehind(parent.signal)
    await boundary
    const joined = scenario.join ? installation.install() : null
    parent.abort()
    if (scenario.successor) {
      installation.install()
    }
    if (joined && scenario.cancel) {
      await installation.cancel(joined.id)
    }
    if ((scenario.join && !scenario.cancel) || scenario.committed) {
      finish()
    }
    await check
    if (scenario.successor) {
      await vi.waitFor(async () =>
        expect((await installation.status(false)).operation?.phase).toBe('succeeded')
      )
    }
    expect(await installation.status()).toMatchObject({
      installedVersion: scenario.version,
      operation: { phase: scenario.phase }
    })
    if (transport) {
      expect(transport.aborted).toBe(scenario.aborted)
    }
  }
)

it.each([10, 100])(
  'validates a warm release once per admitted check across %s checks',
  async (count) => {
    const root = await mkdtemp(join(tmpdir(), 'orca-runtime-network-'))
    roots.push(root)
    const pin = pinFor('1.0')
    const installation = new ManagedRuntimeInstallation(
      'agent',
      {
        label: 'Agent',
        root: () => root,
        ...followLatestRelease(async () => pin)
      },
      {
        dataDirectory: root,
        program: 'cli',
        findExternal: async () => false,
        fence: (work) => work(),
        fetcher: async () => new Response('agent')
      }
    )
    installation.install()
    await vi.waitFor(async () =>
      expect((await installation.status(false)).operation?.phase).toBe('succeeded')
    )
    vi.mocked(resolveInstalledRuntimeRelease).mockClear()
    for (let index = 0; index < count; index += 1) {
      await installation.updateIfBehind()
    }
    expect(resolveInstalledRuntimeRelease).toHaveBeenCalledTimes(count)
  }
)

it('does not look up a release when only an invalid installation receipt remains', async () => {
  const root = await mkdtemp(join(tmpdir(), 'orca-runtime-network-'))
  roots.push(root)
  const refreshPin = vi.fn(async () => {})
  vi.mocked(reclaimRuntimeReleases).mockResolvedValueOnce([])
  const installation = new ManagedRuntimeInstallation(
    'agent',
    {
      label: 'Agent',
      root: () => root,
      pin: () => null,
      refreshPin
    },
    {
      dataDirectory: root,
      program: 'cli',
      findExternal: async () => false,
      fence: (work) => work()
    }
  )
  await mkdir(join(root, '1.0'))
  await writeFile(join(root, '1.0', '.install-complete.json'), '{}')
  await installation.updateIfBehind()
  expect(refreshPin).not.toHaveBeenCalled()
})

it('aborts release transport when its last caller cancels and allows a fresh request', async () => {
  const fetchLatest = vi.fn(
    (signal?: AbortSignal) =>
      new Promise<string>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
  )
  const lookup = hourlyLookup(fetchLatest)
  const caller = new AbortController()
  const read = lookup.refresh(caller.signal)
  const cancelled = expect(read).rejects.toHaveProperty('name', 'AbortError')
  caller.abort()
  await cancelled
  expect(fetchLatest.mock.calls[0]?.[0]?.aborted).toBe(true)
  fetchLatest.mockResolvedValueOnce('3.0')
  await lookup.refresh()
  expect(lookup.latest()).toBe('3.0')
})

it.each([10, 100])(
  'reads %s installation cards without release requests, then installs on request',
  async (count) => {
    const root = await mkdtemp(join(tmpdir(), 'orca-runtime-network-'))
    roots.push(root)
    let pin: ManagedRuntimePin | null = null
    const refreshPin = vi.fn(async () => {
      pin = {
        version: '1.0',
        url: 'https://example.test/agent',
        archiveBytes: 5,
        archiveSha256: 'd4f0bc5a29de06b510f9aa428f1eedba926012b591fef7a518e776a7c9bd1824',
        format: 'file',
        members: [
          {
            path: 'agent',
            bytes: 5,
            sha256: 'd4f0bc5a29de06b510f9aa428f1eedba926012b591fef7a518e776a7c9bd1824'
          }
        ]
      }
    })
    let updatesEnabled = false
    const installation = new ManagedRuntimeInstallation(
      'agent',
      {
        label: 'Agent',
        root: () => root,
        pin: () => pin,
        refreshPin
      },
      {
        dataDirectory: root,
        program: 'cli',
        available: () => true,
        findExternal: async () => false,
        updatesEnabled: () => updatesEnabled,
        fence: (work) => work(),
        fetcher: async () => new Response('agent')
      }
    )
    for (let index = 0; index < count; index += 1) {
      expect(await installation.status()).toMatchObject({ available: true, installedVersion: null })
    }
    expect(refreshPin).toHaveBeenCalledTimes(0)
    installation.install()
    await vi.waitFor(async () =>
      expect((await installation.status(false)).operation?.phase).toBe('succeeded')
    )
    expect(refreshPin).toHaveBeenCalledTimes(1)
    expect(await installation.status()).toMatchObject({
      installedVersion: '1.0',
      source: 'managed'
    })
    await installation.updateIfBehind()
    expect(refreshPin).toHaveBeenCalledTimes(1)
    updatesEnabled = true
    await installation.updateIfBehind()
    expect(refreshPin).toHaveBeenCalledTimes(2)
  }
)
