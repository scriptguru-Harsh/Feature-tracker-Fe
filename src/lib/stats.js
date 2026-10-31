import { getAlert } from './alerts.js'

export function getJourneySteps(feature) {
  return {
    build: feature.dev === 'Done' ? 'done'
      : ['In Progress', 'In Review'].includes(feature.dev) ? 'inProgress'
        : feature.dev === 'Blocked' ? 'blocked' : 'notStarted',
    test: feature.test === 'Passed' ? 'done'
      : feature.test === 'In Testing' ? 'inProgress'
        : feature.test === 'Failed' ? 'blocked' : 'notStarted',
    staging: ['Staging', 'Production'].includes(feature.dep) ? 'done'
      : feature.test === 'Passed' && feature.dep === 'Not Deployed' ? 'inProgress' : 'notStarted',
    live: feature.dep === 'Production' ? 'done'
      : feature.dep === 'Staging' && feature.test === 'Passed' ? 'inProgress' : 'notStarted',
    doctor: ['Informed', 'Not Required'].includes(feature.inf) ? 'done'
      : feature.dep === 'Production' && feature.inf === 'Not Informed' ? 'inProgress' : 'notStarted',
  }
}

export function getStats(features, today = new Date()) {
  const count = (predicate) => features.filter(predicate).length
  const alerts = features.map((feature) => getAlert(feature, today))
  const informed = count((feature) => feature.inf === 'Informed')
  const notInformed = count((feature) => feature.inf === 'Not Informed')
  const notRequired = count((feature) => feature.inf === 'Not Required')

  return {
    total: features.length,
    inProduction: count((feature) => feature.dep === 'Production'),
    overdue: alerts.filter((alert) => alert.overdue).length,
    dueSoon: alerts.filter((alert) => alert.dueSoon).length,
    blocked: alerts.filter((alert) => alert.blocked).length,
    doctors: {
      informed,
      notInformed,
      notRequired,
      percentage: informed + notInformed
        ? Math.round((informed / (informed + notInformed)) * 100)
        : 0,
    },
    pipeline: {
      built: count((feature) => feature.dev === 'Done'),
      tested: count((feature) => feature.test === 'Passed'),
      staging: count((feature) => ['Staging', 'Production'].includes(feature.dep)),
      production: count((feature) => feature.dep === 'Production'),
    },
    journeySteps: features.map((feature) => ({ id: feature.id, steps: getJourneySteps(feature) })),
  }
}
