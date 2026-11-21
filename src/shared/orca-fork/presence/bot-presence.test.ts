import { describe, expect, it } from 'vitest'
import { botPresence } from './bot-presence'

const base = { paused: false, offline: false, sleeping: false }

describe('botPresence', () => {
  it('maps a home status to one of four colors', () => {
    expect(botPresence({ ...base, status: 'working' })).toBe('working')
    expect(botPresence({ ...base, status: 'monitoring' })).toBe('working')
    expect(botPresence({ ...base, status: 'active' })).toBe('idle')
    expect(botPresence({ ...base, status: 'done' })).toBe('idle')
    expect(botPresence({ ...base, status: 'permission' })).toBe('blocked')
    expect(botPresence({ ...base, status: 'failed' })).toBe('blocked')
    expect(botPresence({ ...base, status: 'inactive' })).toBe('off')
  })

  it('reads paused, usage-limited, sleeping and offline bots', () => {
    expect(botPresence({ ...base, status: 'active', paused: true })).toBe('blocked')
    expect(botPresence({ ...base, status: 'active', blocked: true })).toBe('blocked')
    expect(botPresence({ ...base, status: 'done', sleeping: true })).toBe('off')
    expect(botPresence({ ...base, status: 'working', offline: true })).toBe('off')
  })
})
