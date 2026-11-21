import { describe, expect, it } from 'vitest'
import {
  botOrganizationEdits,
  emptyBotOrganization,
  normalizeBotOrganization
} from '../organization/bot-organization'
import { departmentEdits } from './department-edits'
import {
  departmentApplyJobs,
  readDepartmentSoulBlock,
  withDepartmentSoulBlock
} from './department-inheritance'

const sales = (() => {
  let doc = botOrganizationEdits.addDepartment('d1', 'Sales')(emptyBotOrganization())
  doc = botOrganizationEdits.addDepartment('d2', 'Support')(doc)
  return departmentEdits.setDefaults('d1', {
    instructions: 'Answer in Portuguese.',
    agent: { agent: 'codex', launch: null }
  })(doc)
})()

describe('departmentApplyJobs', () => {
  it('applies every set default to a bot placed in a department', () => {
    const after = botOrganizationEdits.place('local/a', { departmentId: 'd1', sectionId: null })(
      sales
    )
    expect(departmentApplyJobs(sales, after)).toEqual([
      { entryKey: 'local/a', fields: ['instructions', 'agent'] }
    ])
  })

  it('drops the SOUL.md block of a bot taken out', () => {
    const placed = botOrganizationEdits.place('local/a', { departmentId: 'd1', sectionId: null })(
      sales
    )
    const after = botOrganizationEdits.place('local/a', null)(placed)
    expect(departmentApplyJobs(placed, after)).toEqual([
      { entryKey: 'local/a', fields: ['instructions'] }
    ])
  })

  it('applies a changed default only to bots that inherit it', () => {
    let doc = botOrganizationEdits.place('local/a', { departmentId: 'd1', sectionId: null })(sales)
    doc = botOrganizationEdits.place('local/b', { departmentId: 'd1', sectionId: 's' })(doc)
    doc = departmentEdits.setOverride('local/b', 'agent', true)(doc)
    const after = departmentEdits.setDefaults('d1', { agent: { agent: 'claude', launch: null } })(
      doc
    )
    expect(departmentApplyJobs(doc, after)).toEqual([{ entryKey: 'local/a', fields: ['agent'] }])
  })

  it('applies a default again when its override is cleared', () => {
    let doc = botOrganizationEdits.place('local/a', { departmentId: 'd1', sectionId: null })(sales)
    doc = departmentEdits.setOverride('local/a', 'agent', true)(doc)
    const after = departmentEdits.setOverride('local/a', 'agent', false)(doc)
    expect(departmentApplyJobs(doc, after)).toEqual([{ entryKey: 'local/a', fields: ['agent'] }])
  })

  it('ignores edits that change no bot', () => {
    const after = departmentEdits.setProfile('d1', { description: 'Sells' })(sales)
    expect(departmentApplyJobs(sales, after)).toEqual([])
  })
})

describe('department SOUL.md block', () => {
  const block = { departmentName: 'Sales', heading: 'Department', instructions: 'Be brief.' }

  it('appends, replaces and removes its own section only', () => {
    const soul = '# Ana\n\nAna sells.\n'
    const once = withDepartmentSoulBlock(soul, block)
    expect(once).toBe(
      '# Ana\n\nAna sells.\n\n## Department: Sales\n<!-- orca-fork:department -->\nBe brief.\n<!-- /orca-fork:department -->\n'
    )
    expect(readDepartmentSoulBlock(once)).toBe('Be brief.')
    const twice = withDepartmentSoulBlock(once, { ...block, instructions: 'Be kind.' })
    expect(readDepartmentSoulBlock(twice)).toBe('Be kind.')
    expect(twice.match(/<!-- orca-fork:department -->/g)).toHaveLength(1)
    expect(withDepartmentSoulBlock(twice, null)).toBe(soul)
  })
})

describe('normalizeBotOrganization profiles', () => {
  it('keeps profiles of existing departments and drops malformed values', () => {
    const doc = normalizeBotOrganization({
      departments: [{ id: 'd1', name: 'Sales', sections: [] }],
      profiles: {
        d1: { color: '#c9b8e8', icon: 'nope', archived: true, defaults: { tokenSaving: 'yes' } },
        gone: { color: '#ffffff' }
      },
      overrides: { 'local/a': ['agent', 'bogus'] }
    })
    expect(doc.profiles).toEqual({
      d1: {
        color: '#c9b8e8',
        icon: null,
        description: '',
        leaderKey: null,
        archived: true,
        defaults: { instructions: '', agent: null, skillProjects: null, tokenSaving: null },
        roomKey: null
      }
    })
    expect(doc.overrides).toEqual({ 'local/a': ['agent'] })
  })
})
