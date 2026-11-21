import { describe, expect, it } from 'vitest'
import { appendToWikiBody, parseWikiLinks, replaceWikiLinks, wikiSlug } from './wiki-links'

describe('wiki links', () => {
  it('slugs the leaf title without accents', () => {
    expect(wikiSlug('Processos/Guia de Implantação!')).toBe('guia-de-implantacao')
  })

  it('reads links outside code, once per page, and leaves code alone when replacing', () => {
    const text =
      'See [[Ops/Deploy|deploy]] and [[deploy#Rollback]], not `[[Code]]` or ![[img.png]].'
    expect(parseWikiLinks(text).map((link) => [link.slug, link.label, link.section])).toEqual([
      ['deploy', 'deploy', null]
    ])
    expect(replaceWikiLinks(text, (link) => `<${link.slug}>`)).toBe(
      'See <deploy> and <deploy>, not `[[Code]]` or ![[img.png]].'
    )
  })

  it('replaces one section and keeps the next', () => {
    const body = '# T\n\n## A\n\nold\n\n## B\n\nkeep\n'
    expect(appendToWikiBody(body, 'new', 'A', 'replace_section')).toBe(
      '# T\n\n## A\n\nnew\n\n## B\n\nkeep\n'
    )
  })
})
