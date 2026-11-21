import { defineFixture } from '../../../component-fixtures/component-fixture'
import { NativeChatLinkClickContext } from '@/components/native-chat/links/actions/native-chat-link-click-context'
import type { CommentMarkdownLinkClickHandler } from '@/components/comment-markdown/comment-markdown-element-renderers'
import { NativeChatMarkdown } from '@/components/native-chat/markdown/NativeChatMarkdown'
import { tagForkLinkClickScope } from './fork-link-click-scope'

const onLinkClick: CommentMarkdownLinkClickHandler = () => {}
tagForkLinkClickScope(onLinkClick, {
  worktreeId: 'wt-orca',
  worktreePath: '/home/me/src/orca',
  runtimeEnvironmentId: null
})

const REPLY = [
  'Saved the report to `/home/me/src/orca/docs/fork/PLAN.md` and the build logs in `~/logs/build/`.',
  '',
  'The failing check is at `/home/me/src/orca/src/main/index.ts:42`; run `pnpm test` again after the fix.'
].join('\n')

function fixture(open: boolean) {
  return defineFixture({
    width: 460,
    interact: open
      ? async (frame) => {
          await new Promise((resolve) => setTimeout(resolve, 200))
          const badge = frame.querySelector<HTMLElement>('[data-orca-fork-path-badge]')
          badge?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0 }))
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      : undefined,
    render: () => (
      <NativeChatLinkClickContext.Provider value={onLinkClick}>
        <div className="p-3 text-[13px]">
          <NativeChatMarkdown content={REPLY} variant="document" />
        </div>
      </NativeChatLinkClickContext.Provider>
    )
  })
}

export const badges = fixture(false)
export const menu = fixture(true)
