import { describe, expect, it } from 'vitest'
import {
  botOrganizationEdits as edits,
  emptyBotOrganization,
  groupBotSidebarEntries,
  normalizeBotOrganization,
  type BotOrganization
} from './bot-organization'

function orgWithSalesTeam(): BotOrganization {
  let doc = emptyBotOrganization()
  doc = edits.addDepartment('sales', 'Sales')(doc)
  doc = edits.addSection('sales', 'leads', 'Leads')(doc)
  doc = edits.place('local/a', { departmentId: 'sales', sectionId: 'leads' })(doc)
  doc = edits.place('vps/b', { departmentId: 'sales', sectionId: null })(doc)
  return edits.setGroupBy('organization')(doc)
}

const labels = {
  hostOf: (entry: { id: string }) => entry.id.split('/')[0]!,
  machine: (hostId: string) => `Machine ${hostId}`,
  unassigned: 'No department'
}
const entries = [{ id: 'local/a' }, { id: 'vps/b' }, { id: 'local/c' }]

function titles(doc: BotOrganization): string[] {
  return groupBotSidebarEntries(entries, doc, labels).map((row) =>
    'kind' in row ? `# ${row.title} ${row.count}` : row.id
  )
}

describe('bot organization', () => {
  it('lists departments, their sections and the unplaced bots', () => {
    expect(titles(orgWithSalesTeam())).toEqual([
      '# Sales 2',
      'vps/b',
      '# Leads 1',
      'local/a',
      '# No department 1',
      'local/c'
    ])
  })

  it('keeps a deleted section’s bots in its department and unplaces a deleted department’s', () => {
    const withoutSection = edits.remove({ departmentId: 'sales', sectionId: 'leads' })(
      orgWithSalesTeam()
    )
    expect(titles(withoutSection)).toEqual([
      '# Sales 2',
      'local/a',
      'vps/b',
      '# No department 1',
      'local/c'
    ])
    const withoutDepartment = edits.remove({ departmentId: 'sales', sectionId: null })(
      withoutSection
    )
    expect(titles(withoutDepartment)).toEqual(['# No department 3', 'local/a', 'vps/b', 'local/c'])
  })

  it('groups by machine in first-seen order', () => {
    const doc = edits.setGroupBy('machine')(emptyBotOrganization())
    expect(titles(doc)).toEqual([
      '# Machine local 2',
      'local/a',
      'local/c',
      '# Machine vps 1',
      'vps/b'
    ])
  })

  it('drops placements whose department is gone when reading a stored document', () => {
    const doc = normalizeBotOrganization({
      revision: 3,
      departments: [{ id: 'ops', name: 'Ops', sections: [] }],
      placements: { 'local/a': { departmentId: 'gone', sectionId: null } },
      view: { groupBy: 'bogus', collapsed: ['fork-org:ops'] }
    })
    expect(doc.placements).toEqual({})
    expect(doc.view).toEqual({ groupBy: 'none', collapsed: ['fork-org:ops'] })
  })
})
