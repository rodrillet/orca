import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import type { ManagedRuntimePin } from './managed-runtime-release'
import { ManagedRuntimeInstallation } from './managed-runtime-installation'
import { followLatestRelease, hourlyLookup } from './managed-runtime-latest-release'

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
