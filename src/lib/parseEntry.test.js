import test from 'node:test'
import assert from 'node:assert/strict'
import { parseEntry } from './parseEntry.js'

const today = '2026-10-31'

test('parses the quick-add example', () => {
  const { draft } = parseEntry(
    'Dark mode for the patient app, Dr Rao from Sunrise Clinic asked, needed by 5 Nov, urgent. It is on staging and in testing.',
    today,
  )
  assert.equal(draft.name, 'Dark mode for the patient app')
  assert.equal(draft.by, 'Dr Rao')
  assert.equal(draft.clinic, 'Sunrise Clinic')
  assert.equal(draft.deadline, '2026-11-05')
  assert.equal(draft.priority, 'High')
  assert.equal(draft.dep, 'Staging')
  assert.equal(draft.test, 'In Testing')
})

test('parses relative deadlines from an injected local date', () => {
  assert.equal(parseEntry('A task needed by tomorrow', today).draft.deadline, '2026-11-01')
  assert.equal(parseEntry('A task due next Friday', today).draft.deadline, '2026-11-06')
  assert.equal(parseEntry('A task due in 2 weeks', today).draft.deadline, '2026-11-14')
  assert.equal(parseEntry('A task due next week', today).draft.deadline, '2026-11-07')
  assert.equal(parseEntry('A task due today', today).draft.deadline, '2026-10-31')
  assert.equal(parseEntry('A task due in 3 days', today).draft.deadline, '2026-11-03')
  assert.equal(parseEntry('A task due end of month', today).draft.deadline, '2026-10-31')
})

test('parses supported absolute date formats', () => {
  assert.equal(parseEntry('A task due 05/11/2026', today).draft.deadline, '2026-11-05')
  assert.equal(parseEntry('A task due 2026-11-05', today).draft.deadline, '2026-11-05')
  assert.equal(parseEntry('A task due Nov 5', today).draft.deadline, '2026-11-05')
  assert.equal(parseEntry('A task due 5 November 2026', today).draft.deadline, '2026-11-05')
})

test('moves a yearless date more than 60 days in the past to next year', () => {
  assert.equal(parseEntry('A task needed by 1 Jan', today).draft.deadline, '2027-01-01')
})

test('parses status and doctor metadata', () => {
  const { draft } = parseEntry(
    'Patient search, asked by Dr Patel at Green Hospital, lead is Maya, production, passed, done, doctor informed, credentials sent',
    today,
  )
  assert.equal(draft.by, 'Dr Patel')
  assert.equal(draft.clinic, 'Green Hospital')
  assert.equal(draft.lead, 'Maya')
  assert.equal(draft.dep, 'Production')
  assert.equal(draft.test, 'Passed')
  assert.equal(draft.dev, 'Done')
  assert.equal(draft.inf, 'Informed')
  assert.equal(draft.cred, 'Yes')
})

test('leaves unrecognised values unset and reports missing fields', () => {
  const result = parseEntry('A feature with no other details', today)
  assert.equal(result.draft.name, 'A feature with no other details')
  assert.equal(result.draft.by, '')
  assert.equal(result.draft.deadline, null)
  assert.equal(result.draft.priority, null)
  assert.equal(result.draft.dev, null)
  assert.equal(result.draft.test, null)
  assert.equal(result.draft.dep, null)
  assert.ok(result.missing.includes('deadline'))
  assert.ok(!result.found.includes('deadline'))
})

test('parses blocked, failed, staging, and pending credentials', () => {
  const { draft } = parseEntry('Lab results export is stuck, failed QA on stage, credentials pending', today)
  assert.equal(draft.dev, 'Blocked')
  assert.equal(draft.test, 'Failed')
  assert.equal(draft.dep, 'Staging')
  assert.equal(draft.cred, 'Pending')
})
