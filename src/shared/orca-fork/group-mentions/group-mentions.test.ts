import { describe, expect, it } from 'vitest'
import {
  groupMentionQuery,
  groupMentionToken,
  groupOptions,
  groupSlug,
  splitGroupMentions,
  splitGroupRefs
} from './group-mentions'

describe('group mentions', () => {
  it('slugs a group name the way # inserts it', () => {
    expect(groupSlug('Equipe de Vendas')).toBe('equipe-de-vendas')
    expect(groupSlug('  Ação! ')).toBe('ação')
  })

  it('finds #name references but not issue numbers, headings inside words or emails', () => {
    expect(splitGroupRefs('veja #Vendas, e #123 ou a#b')).toEqual([
      { text: 'veja ' },
      { text: '#Vendas', slug: 'vendas' },
      { text: ', e #123 ou a#b' }
    ])
  })

  it('reads the #query before the caret', () => {
    expect(groupMentionQuery('fale com #ven')).toEqual({ from: 9, query: 'ven' })
    expect(groupMentionQuery('#')).toEqual({ from: 0, query: '' })
    expect(groupMentionQuery('issue a#b')).toBeNull()
  })

  it('ranks groups starting with the query first', () => {
    const groups = [{ name: 'Revendas' }, { name: 'Vendas' }, { name: 'Suporte' }]
    expect(groupOptions('vend', groups).map((g) => g.name)).toEqual(['Vendas', 'Revendas'])
  })

  it('keeps the picked group id in its token, whatever the name holds', () => {
    const token = groupMentionToken({ id: 'g-1', name: 'Vendas [BR]' })
    expect(token).toBe('[#Vendas \\[BR\\]](bot-group:g-1)')
    expect(splitGroupMentions(`fale no ${token} hoje`)).toEqual([
      'fale no ',
      { id: 'g-1', name: 'Vendas [BR]' },
      ' hoje'
    ])
  })
})
