// orca-fork: token saving over RPC, served by this app's own runtime and by a paired fork orca-server.
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  TOKEN_SAVING_PROXY_METHOD,
  TOKEN_SAVING_SET_POLICY_METHOD,
  TOKEN_SAVING_STATUS_METHOD,
  TokenSavingProxyParams,
  TokenSavingSetPolicyParams,
  TokenSavingStatusParams,
  type TokenSavingProxyResult,
  type TokenSavingStatus
} from '../../../../../shared/orca-fork/token-saving/token-saving-rpc'
import { assertBotGroupOwner } from '../bot-groups'
import { defineMethod, InvalidArgumentError } from '../../core'
import type { OrcaRuntimeService } from '../../../orca-runtime'
import {
  cavemanBinary,
  cavemanBinDirectory
} from '../../../../orca-fork/token-saving/caveman-install'
import {
  CAVEMAN_PROXY_URL,
  cavemanProxyState,
  managedCavemanProxy,
  startCavemanProxy,
  stopCavemanProxy
} from '../../../../orca-fork/token-saving/caveman-proxy'
import { readCavemanStats } from '../../../../orca-fork/token-saving/caveman-stats'
import {
  setTokenSavingHostPolicy,
  tokenSavingHostPolicy
} from '../../../../orca-fork/token-saving/token-saving-host-policy'
import { tokenSavingSlug } from '../../../../orca-fork/token-saving/token-saving-launch'

const DEFAULT_DAYS = 30

function assertEnabled(): void {
  if (!FORK_FEATURES.tokenSaving) {
    throw new InvalidArgumentError('Token saving is off in this build.')
  }
}

function botIds(runtime: OrcaRuntimeService): string[] {
  try {
    return runtime.bots.enabled() ? runtime.bots.list().map((bot) => bot.id) : []
  } catch {
    return []
  }
}

async function status(runtime: OrcaRuntimeService, days: number): Promise<TokenSavingStatus> {
  const bySlug = new Map(botIds(runtime).map((id) => [tokenSavingSlug(id), id]))
  const own = managedCavemanProxy()
  const policy = tokenSavingHostPolicy()
  return {
    installed: cavemanBinary('caveman-proxy') !== null,
    binDirectory: cavemanBinDirectory(),
    proxy: {
      state: await cavemanProxyState(true),
      url: CAVEMAN_PROXY_URL,
      mode: own?.mode ?? null,
      managed: own !== null
    },
    mcpInstalled: cavemanBinary('caveman-mcp') !== null,
    policy: { ...policy, bots: { ...policy.bots } },
    stats: readCavemanStats(days, (slug) => bySlug.get(slug) ?? null)
  }
}

export const TOKEN_SAVING_METHODS = [
  defineMethod({
    name: TOKEN_SAVING_STATUS_METHOD,
    permission: 'workspace',
    params: TokenSavingStatusParams,
    handler: async (params, { runtime }) => {
      assertEnabled()
      return status(runtime, params?.days ?? DEFAULT_DAYS)
    }
  }),
  defineMethod({
    name: TOKEN_SAVING_SET_POLICY_METHOD,
    permission: 'workspace',
    params: TokenSavingSetPolicyParams,
    handler: async (params, context) => {
      assertEnabled()
      // Only the owner's desktop or phone sets it; an agent can't turn its own saving off.
      assertBotGroupOwner(context)
      const policy = await setTokenSavingHostPolicy(params)
      if (policy.enabled || Object.values(policy.bots).some(Boolean)) {
        void startCavemanProxy(policy.proxyMode).catch(() => undefined)
      }
      return policy
    }
  }),
  defineMethod({
    name: TOKEN_SAVING_PROXY_METHOD,
    permission: 'workspace',
    params: TokenSavingProxyParams,
    handler: async ({ action }, context): Promise<TokenSavingProxyResult> => {
      assertEnabled()
      assertBotGroupOwner(context)
      const mode = tokenSavingHostPolicy().proxyMode
      let error: string | undefined
      try {
        if (action !== 'start') {
          await stopCavemanProxy()
        }
        if (action !== 'stop') {
          if (!cavemanBinary('caveman-proxy')) {
            error = 'not_installed'
          } else {
            await startCavemanProxy(mode)
          }
        }
      } catch (caught) {
        error = caught instanceof Error ? caught.message : String(caught)
      }
      const next = await status(context.runtime, DEFAULT_DAYS)
      const ok = !error && (action === 'stop' || next.proxy.state === 'running')
      return { ok, status: next, ...(error ? { error } : {}) }
    }
  })
]
