// orca-fork: one machine's token saving over RPC: its proxy and savings, the policy the desktop
// resolved for it, and the proxy buttons. A stock orca-server answers method_not_found.
import { useEffect, useMemo, useRef, useState } from 'react'
import { callRuntimeRpc } from '@/runtime/rpc/calls/runtime-rpc-call'
import { useAppStore } from '@/store'
import { useBots } from '@/lib/bot-catalog'
import { installWindowVisibilityInterval } from '@/lib/window-activity/window-visibility-interval'
import { getRuntimeTargetHostId } from '@/runtime/rpc/targets/runtime-client-target'
import type { RuntimeClientTarget } from '../../../../../shared/remote-runtime/host-catalog/runtime-client-target'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  TOKEN_SAVING_PROXY_METHOD,
  TOKEN_SAVING_SET_POLICY_METHOD,
  TOKEN_SAVING_STATUS_METHOD,
  type TokenSavingProxyResult,
  type TokenSavingStatus
} from '../../../../../shared/orca-fork/token-saving/token-saving-rpc'
import { botSidebarEntryKey } from '@/components/bots/bot-sidebar-entry-keys'
import { forkWorkspacesStore, useForkWorkspaces } from '../workspaces/fork-workspaces-store'
import {
  resolveBotTokenSaving,
  resolveHostTokenSaving,
  tokenSavingStore,
  useTokenSavingSettings
} from './token-saving-store'

const TIMEOUT_MS = 8_000
const RESEND_MS = 5 * 60_000

export type TokenSavingHostResult =
  | { status: 'ok'; data: TokenSavingStatus }
  /** A stock orca-server: no token saving there until the fork's server is installed. */
  | { status: 'unsupported' }
  | { status: 'unreachable' }

function errorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
}

function failure(error: unknown): TokenSavingHostResult {
  return errorCode(error) === 'method_not_found'
    ? { status: 'unsupported' }
    : { status: 'unreachable' }
}

const OPTIONS = { timeoutMs: TIMEOUT_MS, reuseRecentCompatibilityFailure: true }

const READ_REUSE_MS = 5_000
const reads = new Map<string, { at: number; read: Promise<TokenSavingHostResult> }>()

/** Cards and panels on the same machine share one read every few seconds. */
export function readTokenSavingHost(
  target: RuntimeClientTarget,
  days = 30
): Promise<TokenSavingHostResult> {
  const key = `${JSON.stringify(target)}:${days}`
  const recent = reads.get(key)
  if (recent && Date.now() - recent.at < READ_REUSE_MS) {
    return recent.read
  }
  const read = readTokenSavingHostNow(target, days)
  reads.set(key, { at: Date.now(), read })
  return read
}

async function readTokenSavingHostNow(
  target: RuntimeClientTarget,
  days: number
): Promise<TokenSavingHostResult> {
  try {
    const data = await callRuntimeRpc<TokenSavingStatus>(
      target,
      TOKEN_SAVING_STATUS_METHOD,
      { days },
      OPTIONS
    )
    return { status: 'ok', data }
  } catch (error) {
    return failure(error)
  }
}

export async function runTokenSavingProxy(
  target: RuntimeClientTarget,
  action: 'start' | 'stop' | 'restart'
): Promise<TokenSavingProxyResult | null> {
  try {
    return await callRuntimeRpc<TokenSavingProxyResult>(
      target,
      TOKEN_SAVING_PROXY_METHOD,
      { action },
      { timeoutMs: 15_000 }
    )
  } catch {
    return null
  }
}

/** Polls one machine's status while `enabled`. */
export function useTokenSavingHost(
  target: RuntimeClientTarget,
  enabled: boolean,
  pollMs = 15_000
): { result: TokenSavingHostResult | null; refresh: () => void } {
  const [result, setResult] = useState<TokenSavingHostResult | null>(null)
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(target)
  useEffect(() => {
    if (!enabled || !FORK_FEATURES.tokenSaving) {
      return
    }
    let cancelled = false
    const read = (): void => {
      void readTokenSavingHost(target).then((next) => {
        if (!cancelled) {
          setResult(next)
        }
      })
    }
    read()
    const stop = installWindowVisibilityInterval({ run: read, intervalMs: pollMs })
    return () => {
      cancelled = true
      stop()
    }
    // The target is compared by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, pollMs, tick])
  return { result, refresh: () => setTick((n) => n + 1) }
}

type HostPolicy = {
  target: RuntimeClientTarget
  params: { enabled: boolean; bots: Record<string, boolean>; proxyMode: 'compress' | 'record' }
}

/**
 * Sends every machine the policy resolved for it whenever an input changes (and every few minutes,
 * so a server that was away catches up). Mounted once, in the status bar.
 */
export function useTokenSavingPolicySync(): void {
  const settings = useTokenSavingSettings()
  const workspaces = useForkWorkspaces()
  const bots = useBots()
  const environments = useAppStore((s) => s.runtimeEnvironments)
  const policies = useMemo((): HostPolicy[] => {
    const targets: RuntimeClientTarget[] = [
      { kind: 'local' },
      ...environments.map((environment): RuntimeClientTarget => ({
        kind: 'environment',
        environmentId: environment.id
      }))
    ]
    return targets.map((target) => {
      const hostId = getRuntimeTargetHostId(target)
      const botChoices: Record<string, boolean> = {}
      for (const bot of bots) {
        if (bot.hostId === hostId) {
          botChoices[bot.id] = resolveBotTokenSaving(settings, workspaces, {
            hostId,
            botKey: botSidebarEntryKey(bot)
          }).enabled
        }
      }
      return {
        target,
        params: {
          enabled: resolveHostTokenSaving(settings, workspaces, hostId).enabled,
          bots: botChoices,
          proxyMode: settings.proxyMode
        }
      }
    })
  }, [settings, workspaces, bots, environments])
  const sent = useRef(new Map<string, string>())
  // Pushing before the saved choices load would send the defaults over them.
  const ready = tokenSavingStore.useReady() && forkWorkspacesStore.useReady()
  useEffect(() => {
    if (!FORK_FEATURES.tokenSaving || !ready) {
      return
    }
    const send = (force: boolean): void => {
      for (const policy of policies) {
        const key = JSON.stringify(policy.target)
        const body = JSON.stringify(policy.params)
        if (!force && sent.current.get(key) === body) {
          continue
        }
        sent.current.set(key, body)
        void callRuntimeRpc(
          policy.target,
          TOKEN_SAVING_SET_POLICY_METHOD,
          policy.params,
          OPTIONS
        ).catch(() => sent.current.delete(key))
      }
    }
    send(false)
    return installWindowVisibilityInterval({ run: () => send(true), intervalMs: RESEND_MS })
  }, [policies, ready])
}

/** Renders nothing; keeps every machine's policy current while the window is open. */
export function TokenSavingPolicySync(): null {
  useTokenSavingPolicySync()
  return null
}
