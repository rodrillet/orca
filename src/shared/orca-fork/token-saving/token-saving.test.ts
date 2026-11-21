import { describe, expect, it } from 'vitest'
import {
  hostPolicyEnables,
  normalizeTokenSavingHostPolicy,
  resolveTokenSaving
} from './token-saving'

describe('resolveTokenSaving', () => {
  it('takes the nearest level that chose and is on when none did', () => {
    expect(resolveTokenSaving({})).toEqual({ enabled: true, source: 'default' })
    expect(resolveTokenSaving({ global: false })).toEqual({ enabled: false, source: 'global' })
    expect(resolveTokenSaving({ global: false, workspace: true })).toEqual({
      enabled: true,
      source: 'workspace'
    })
    expect(resolveTokenSaving({ workspace: true, department: false })).toEqual({
      enabled: false,
      source: 'department'
    })
    expect(resolveTokenSaving({ department: false, bot: true, global: false })).toEqual({
      enabled: true,
      source: 'bot'
    })
  })
})

describe('hostPolicyEnables', () => {
  it('uses the bot choice, else the host default', () => {
    const policy = normalizeTokenSavingHostPolicy({ enabled: false, bots: { a: true } })
    expect(hostPolicyEnables(policy, 'a')).toBe(true)
    expect(hostPolicyEnables(policy, 'b')).toBe(false)
    expect(hostPolicyEnables(policy, null)).toBe(false)
    expect(hostPolicyEnables(normalizeTokenSavingHostPolicy(null), null)).toBe(true)
  })
})
