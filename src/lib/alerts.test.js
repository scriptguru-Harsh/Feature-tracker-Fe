import test from 'node:test'
import assert from 'node:assert/strict'
import { getAlert, sortByUrgency } from './alerts.js'

const today = '2026-10-31'
const feature = (overrides = {}) => ({
  dev: 'In Progress',
  test: 'Not Started',
  dep: 'Not Deployed',
  inf: 'Not Informed',
  priority: 'Normal',
  deadline: null,
  ...overrides,
})

test('labels overdue and due dates at the configured thresholds', () => {
  assert.deepEqual(
    (({ overdue, daysLate, label }) => ({ overdue, daysLate, label }))(getAlert(feature({ deadline: '2026-10-28' }), today)),
    { overdue: true, daysLate: 3, label: 'Overdue 3d' },
  )
  assert.equal(getAlert(feature({ deadline: today }), today).label, 'Due today')
  assert.equal(getAlert(feature({ deadline: '2026-11-03' }), today).label, 'Due in 3d')
  assert.equal(getAlert(feature({ deadline: '2026-11-04' }), today).highAlert, false)
})

test('reports blocked and high priority alerts', () => {
  assert.equal(getAlert(feature({ dev: 'Blocked' }), today).label, 'Blocked')
  assert.equal(getAlert(feature({ priority: 'High' }), today).label, 'High priority')
  assert.equal(getAlert(feature({ test: 'Failed' }), today).blocked, true)
})

test('delivered features suppress deadline and priority alerts', () => {
  const delivered = getAlert(feature({
    dev: 'Done', test: 'Passed', dep: 'Production', inf: 'Informed',
    deadline: '2026-10-01', priority: 'High',
  }), today)
  assert.equal(delivered.delivered, true)
  assert.equal(delivered.highAlert, false)
  assert.equal(delivered.label, 'Delivered')
})

test('no deadline has no date alert', () => {
  const alert = getAlert(feature(), today)
  assert.equal(alert.daysLeft, null)
  assert.equal(alert.highAlert, false)
  assert.equal(alert.label, '')
})

test('sorts overdue, blocked, due soon, dated, undated, then delivered', () => {
  const items = [
    { id: 'later', ...feature({ deadline: '2026-11-20' }) },
    { id: 'delivered', ...feature({ dev: 'Done', test: 'Passed', dep: 'Production', inf: 'Not Required' }) },
    { id: 'blocked', ...feature({ dev: 'Blocked' }) },
    { id: 'overdue-1', ...feature({ deadline: '2026-10-30' }) },
    { id: 'no-date', ...feature() },
    { id: 'due-soon', ...feature({ deadline: '2026-11-01' }) },
    { id: 'overdue-3', ...feature({ deadline: '2026-10-28' }) },
  ]
  assert.deepEqual(sortByUrgency(items, today).map((item) => item.id), [
    'overdue-3', 'overdue-1', 'blocked', 'due-soon', 'later', 'no-date', 'delivered',
  ])
})
