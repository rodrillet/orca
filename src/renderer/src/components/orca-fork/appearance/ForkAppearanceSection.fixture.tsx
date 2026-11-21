import React, { useState } from 'react'
import { defineFixture } from '../../../component-fixtures/component-fixture'
import { getDefaultSettings } from '../../../../../shared/orca-profiles/constants'
import type { GlobalSettings } from '../../../../../shared/settings/global-settings-types'
import { ForkAppearanceSection } from './ForkAppearanceSection'
import { ForkAppearanceRuntime } from './ForkAppearanceRuntime'

function Panel({ initial }: { initial: Partial<GlobalSettings> }): React.JSX.Element {
  const [settings, setSettings] = useState<GlobalSettings>({
    ...getDefaultSettings('/home/user'),
    ...initial
  })
  return (
    <div className="bg-background p-4">
      <ForkAppearanceSection
        settings={settings}
        updateSettings={(updates) => setSettings((before) => ({ ...before, ...updates }))}
      />
    </div>
  )
}

export const defaults = defineFixture({
  width: 920,
  render: () => <Panel initial={{}} />
})

export const agentesInset = defineFixture({
  width: 920,
  store: {
    settings: {
      ...getDefaultSettings('/home/user'),
      orcaForkAppearance: {
        palette: 'agentes',
        accent: 'sky',
        windowOpacity: 0.9,
        surfaceTranslucency: 0.3,
        density: 'compact',
        sidebarStyle: 'inset'
      }
    }
  },
  render: () => (
    <>
      <ForkAppearanceRuntime />
      <Panel
        initial={{
          orcaForkAppearance: {
            palette: 'agentes',
            accent: 'sky',
            windowOpacity: 0.9,
            surfaceTranslucency: 0.3,
            density: 'compact',
            sidebarStyle: 'inset'
          }
        }}
      />
    </>
  )
})
