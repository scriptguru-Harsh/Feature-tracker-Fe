import test from 'node:test'
import assert from 'node:assert/strict'
import { getJourneySteps, getStats } from './stats.js'

const today = '2026-10-31'
const sample = [
  { id: 'a', dev: 'Done', test: 'Passed', dep: 'Production', inf: 'Informed', deadline: null, priority: 'Normal' },
  { id: 'b', dev: 'Blocked', test: 'Failed', dep: 'Not Deployed', inf: 'Not Informed', deadline: '2026-10-30', priority: 'High' },
  { id: 'c', dev: 'In Progress', test: 'In Testing', dep: 'Staging', inf: 'Not Informed', deadline: '2026-11-03', priority: 'Normal' },
  { id: 'd', dev: 'In Review', test: 'Passed', dep: 'Not Deployed', inf: 'Not Required', deadline: null, priority: 'Normal' },
  { id: 'e', dev: 'Not Started', test: 'Not Started', dep: 'Production', inf: 'Not Required', deadline: '2026-11-20', priority: 'Normal' },
  { id: 'f', dev: 'Done', test: 'Passed', dep: 'Staging', inf: 'Informed', deadline: null, priority: 'Normal' },
]

test('returns zeroed counts and journey data for an empty list', () => {
  assert.deepEqual(getStats([], today), {
    total: 0,
    inProduction: 0,
    overdue: 0,
    dueSoon: 0,
    blocked: 0,
    doctors: { informed: 0, notInformed: 0, notRequired: 0, percentage: 0 },
    pipeline: { built: 0, tested: 0, staging: 0, production: 0 },
    journeySteps: [],
  })
})

test('computes all dashboard counts from a six-feature sample', () => {
  assert.deepEqual(getStats(sample, today), {
    total: 6,
    inProduction: 2,
    overdue: 1,
    dueSoon: 1,
    blocked: 1,
    doctors: { informed: 2, notInformed: 2, notRequired: 2, percentage: 50 },
    pipeline: { built: 2, tested: 3, staging: 4, production: 2 },
    journeySteps: sample.map((item) => ({ id: item.id, steps: getJourneySteps(item) })),
  })
})

test('calculates the journey step states', () => {
  assert.deepEqual(getJourneySteps(sample[2]), {
    build: 'inProgress',
    test: 'inProgress',
    staging: 'done',
    live: 'notStarted',
    doctor: 'notStarted',
  })
  assert.deepEqual(getJourneySteps({
    dev: 'Blocked', test: 'Failed', dep: 'Production', inf: 'Not Informed',
  }), {
    build: 'blocked',
    test: 'blocked',
    staging: 'done',
    live: 'done',
    doctor: 'inProgress',
  })
})
