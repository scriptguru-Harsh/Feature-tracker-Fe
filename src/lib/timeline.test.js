import test from 'node:test'
import assert from 'node:assert/strict'
import { getTimeline, TIMELINE_MAX_MARKERS, timelineTickLabel } from './timeline.js'

const today = new Date(2026, 10, 2)
const feature = (id, deadline, overrides = {}) => ({
  id,
  name: `Feature ${id}`,
  dev: 'In Progress',
  test: 'Not Started',
  dep: 'Not Deployed',
  inf: 'Not Informed',
  priority: 'Normal',
  deadline,
  ...overrides,
})

test('timeline uses a seven-day past and twenty-eight-day future window', () => {
  const result = getTimeline([
    feature('earlier', '2026-10-25'),
    feature('start', '2026-10-26'),
    feature('today', '2026-11-02'),
    feature('end', '2026-11-30'),
    feature('later', '2026-12-01'),
  ], today)

  assert.equal(result.earlier, 1)
  assert.equal(result.later, 1)
  assert.equal(result.markers.length, 3)
  assert.equal(result.markers[0].x, 0)
  assert.equal(result.markers[1].x, 20)
  assert.equal(result.markers[2].x, 100)
  assert.equal(result.todayX, 20)
  assert.equal(timelineTickLabel(result.ticks[1].date, result.today), 'Today')
})

test('timeline groups overlapping labels into separate lanes', () => {
  const result = getTimeline([
    feature('one', '2026-11-10'),
    feature('two', '2026-11-10'),
    feature('three', '2026-11-11'),
  ], today, 800)

  assert.equal(result.markers.length, 3)
  assert.ok(new Set(result.markers.map((marker) => marker.lane)).size > 1)
})

test('timeline caps visible markers and reports omitted features', () => {
  const features = Array.from({ length: TIMELINE_MAX_MARKERS + 3 }, (_, index) => (
    feature(String(index), '2026-11-10')
  ))
  const result = getTimeline(features, today)
  assert.equal(result.markers.length, TIMELINE_MAX_MARKERS)
  assert.equal(result.omitted, 3)
})

test('timeline ignores invalid and undated deadlines', () => {
  const result = getTimeline([
    feature('invalid', '2026-02-31'),
    feature('undated', null),
  ], today)
  assert.equal(result.markers.length, 0)
  assert.equal(result.earlier, 0)
  assert.equal(result.later, 0)
})
