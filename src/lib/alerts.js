export const DUE_SOON_DAYS = 3

function localDate(value) {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }
  const date = value instanceof Date ? value : new Date(value)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dayNumber(date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
}

export function getAlert(feature, today = new Date()) {
  const current = localDate(today)
  const hasDeadline = typeof feature.deadline === 'string' && feature.deadline !== ''
  const deadline = hasDeadline ? localDate(feature.deadline) : null
  const daysLeft = deadline ? dayNumber(deadline) - dayNumber(current) : null
  const delivered = feature.dev === 'Done'
    && feature.test === 'Passed'
    && feature.dep === 'Production'
    && ['Informed', 'Not Required'].includes(feature.inf)
  const overdue = !delivered && daysLeft !== null && daysLeft < 0
  const dueSoon = !delivered && daysLeft !== null && daysLeft >= 0 && daysLeft <= DUE_SOON_DAYS
  const blocked = !delivered && (feature.dev === 'Blocked' || feature.test === 'Failed')
  const highPriority = !delivered && feature.priority === 'High'
  const highAlert = overdue || dueSoon || blocked || highPriority

  let label = ''
  if (overdue) label = `Overdue ${Math.abs(daysLeft)}d`
  else if (dueSoon && daysLeft === 0) label = 'Due today'
  else if (dueSoon) label = `Due in ${daysLeft}d`
  else if (blocked) label = 'Blocked'
  else if (highPriority) label = 'High priority'
  else if (delivered) label = 'Delivered'

  return {
    delivered,
    overdue,
    dueSoon,
    blocked,
    highPriority,
    highAlert,
    daysLate: overdue ? Math.abs(daysLeft) : 0,
    daysLeft,
    label,
  }
}

export function sortByUrgency(features, today = new Date()) {
  return [...features].sort((a, b) => {
    const alertA = getAlert(a, today)
    const alertB = getAlert(b, today)
    if (alertA.delivered !== alertB.delivered) return alertA.delivered ? 1 : -1
    if (alertA.overdue !== alertB.overdue) return alertA.overdue ? -1 : 1
    if (alertA.overdue && alertB.overdue) return alertB.daysLate - alertA.daysLate
    if (alertA.blocked !== alertB.blocked) return alertA.blocked ? -1 : 1
    if (alertA.dueSoon !== alertB.dueSoon) return alertA.dueSoon ? -1 : 1
    if (alertA.dueSoon && alertB.dueSoon) return alertA.daysLeft - alertB.daysLeft
    if (alertA.daysLeft !== null && alertB.daysLeft === null) return -1
    if (alertA.daysLeft === null && alertB.daysLeft !== null) return 1
    if (alertA.daysLeft !== null && alertB.daysLeft !== null) return alertA.daysLeft - alertB.daysLeft
    return 0
  })
}
