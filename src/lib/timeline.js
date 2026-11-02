import { getAlert, sortByUrgency } from './alerts.js'

const DAY_MS = 86_400_000
export const TIMELINE_BEFORE_DAYS = 7
export const TIMELINE_AFTER_DAYS = 28
export const TIMELINE_MAX_MARKERS = 12

function dayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
}

function parseDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.getTime() / DAY_MS
}

function fromDay(day) {
  return new Date(day * DAY_MS)
}

function dateLabel(date, options = { month: 'short', day: 'numeric' }) {
  return date.toLocaleDateString('en-US', { ...options, timeZone: 'UTC' })
}

function labelWidthPercent(chartWidth) {
  return 190 / chartWidth * 100
}

function placeLanes(markers, chartWidth) {
  const lanes = []
  for (const marker of markers) {
    const textWidth = labelWidthPercent(chartWidth)
    const alignRight = marker.x < textWidth + 3
    const left = alignRight ? marker.x : marker.x - textWidth
    const right = alignRight ? marker.x + textWidth : marker.x
    let lane = lanes.findIndex((previousRight) => left - previousRight >= 1.5)
    if (lane < 0) lane = lanes.length
    lanes[lane] = right
    marker.lane = lane
    marker.labelSide = alignRight ? 'right' : 'left'
  }
  return lanes.length
}

export function getTimeline(features, today = new Date(), chartWidth = 760) {
  const todayDay = dayNumber(today)
  const startDay = todayDay - TIMELINE_BEFORE_DAYS
  const endDay = todayDay + TIMELINE_AFTER_DAYS
  const dated = features
    .filter((feature) => !getAlert(feature, today).delivered)
    .map((feature) => ({ feature, day: parseDay(feature.deadline), alert: getAlert(feature, today) }))
    .filter((item) => item.day !== null)
  const earlier = dated.filter((item) => item.day < startDay).length
  const later = dated.filter((item) => item.day > endDay).length
  const inWindow = dated.filter((item) => item.day >= startDay && item.day <= endDay)
  const visibleFeatures = sortByUrgency(inWindow.map((item) => item.feature), today)
    .slice(0, TIMELINE_MAX_MARKERS)
  const markers = visibleFeatures.map((feature) => {
    const item = inWindow.find((entry) => entry.feature.id === feature.id)
    return {
      ...item,
      x: (item.day - startDay) / (endDay - startDay) * 100,
      status: item.alert.overdue ? 'overdue' : item.alert.dueSoon ? 'soon' : 'later',
      lane: 0,
    }
  }).sort((a, b) => a.x - b.x)
  const laneCount = placeLanes(markers, chartWidth)
  const ticks = Array.from({ length: 6 }, (_, index) => {
    const day = startDay + index * 7
    return { day, date: fromDay(day), x: (day - startDay) / (endDay - startDay) * 100 }
  })

  return {
    start: fromDay(startDay),
    today: fromDay(todayDay),
    end: fromDay(endDay),
    todayX: (todayDay - startDay) / (endDay - startDay) * 100,
    ticks,
    markers,
    laneCount,
    earlier,
    later,
    omitted: Math.max(0, inWindow.length - markers.length),
  }
}

export function timelineDateLabel(value) {
  return dateLabel(value)
}

export function timelineTickLabel(date, today) {
  const dateDay = date.getTime() / DAY_MS
  const todayDay = today.getTime() / DAY_MS
  if (dateDay === todayDay) return 'Today'
  if (dateDay === todayDay - TIMELINE_BEFORE_DAYS) return '−7d'
  return dateLabel(date)
}
