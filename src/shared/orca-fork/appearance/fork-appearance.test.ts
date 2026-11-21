import { describe, expect, it } from 'vitest'
import { resolveWindowMaterial } from '../../app-lifecycle/windows/window-material'

const mac = { platform: 'darwin' as const, osRelease: '24.0.0' }

describe('fork translucent interface', () => {
  it('keeps the window material with opaque terminals only while the interface lets it through', () => {
    const base = { windowMaterial: 'blur' as const, terminalBackgroundOpacity: 1 }
    expect(resolveWindowMaterial(base, mac, false)).toBe('off')
    expect(
      resolveWindowMaterial(
        { ...base, orcaForkAppearance: { surfaceTranslucency: 0.3 } },
        mac,
        false
      )
    ).toBe('blur')
  })
})
