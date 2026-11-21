// orca-fork: a refused wiki read or write; reaches the CLI and the app as an `invalid_argument` message.
import { BotItemError } from '../../bots/bot-item-error'

export class WikiError extends BotItemError {
  constructor(message: string) {
    super('invalid_argument', message)
  }
}
