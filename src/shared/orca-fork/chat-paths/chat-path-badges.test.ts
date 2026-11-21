import { describe, expect, it } from 'vitest'
import { chatPathFolder, chatPathLabel, readChatPath } from './chat-path-badges'

describe('chat path badges', () => {
  it('reads absolute file and folder paths, with a line', () => {
    expect(readChatPath('/home/ubuntu/src/orca/package.json')).toEqual({
      path: '/home/ubuntu/src/orca/package.json',
      line: null,
      isDirectory: false
    })
    expect(readChatPath('~/src/orca/')).toEqual({
      path: '~/src/orca/',
      line: null,
      isDirectory: true
    })
    expect(readChatPath('/srv/app/main.ts:42')).toEqual({
      path: '/srv/app/main.ts',
      line: 42,
      isDirectory: false
    })
    expect(readChatPath('C:\\Users\\me\\notes.md')?.path).toBe('C:\\Users\\me\\notes.md')
  })

  it('leaves code, commands, URLs and bare roots as text', () => {
    expect(readChatPath('pnpm test')).toBeNull()
    expect(readChatPath('https://example.com/a/b')).toBeNull()
    expect(readChatPath('/')).toBeNull()
    expect(readChatPath('~')).toBeNull()
    expect(readChatPath('src/relative.ts')).toBeNull()
    expect(readChatPath('const a = /x/')).toBeNull()
  })

  it('names the badge by its last segment and opens terminals in the folder', () => {
    expect(chatPathLabel('/home/ubuntu/src/orca/package.json')).toBe('package.json')
    expect(chatPathLabel('~/src/orca/')).toBe('orca/')
    expect(chatPathFolder({ path: '/srv/app/main.ts', line: 3, isDirectory: false })).toBe(
      '/srv/app'
    )
    expect(chatPathFolder({ path: '/srv/app', line: null, isDirectory: true })).toBe('/srv/app')
  })
})
