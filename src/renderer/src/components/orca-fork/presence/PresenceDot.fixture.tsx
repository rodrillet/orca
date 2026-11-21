import { defineFixture } from '../../../component-fixtures/component-fixture'
import { BotAvatarTile } from '../../bots/BotAvatar'
import { BOT_MASCOT_URLS } from '../../bots/bot-mascots'
import type { BotPresence } from '../../../../../shared/orca-fork/presence/bot-presence'
import { PresenceDot } from './ForkBotPresenceDot'

const PRESENCES: BotPresence[] = ['working', 'idle', 'blocked', 'off']
const SIZES = ['size-14 rounded-xl', 'size-9 rounded-md', 'size-7 rounded-full', 'size-5', 'size-4']

export const allStates = defineFixture({
  width: 360,
  render: () => (
    <div className="flex flex-col gap-4 p-4">
      {SIZES.map((size) => (
        <div key={size} className="flex items-end gap-5">
          {PRESENCES.map((presence) => (
            <BotAvatarTile
              key={presence}
              src={BOT_MASCOT_URLS.B1}
              fallback="B"
              className={size}
              overlay={<PresenceDot presence={presence} />}
            />
          ))}
        </div>
      ))}
    </div>
  )
})
