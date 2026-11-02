import React, { useMemo, useState } from 'react'
import { getAlert, sortByUrgency } from '../lib/alerts.js'
import { getJourneySteps, getStats } from '../lib/stats.js'
import { getTimeline, timelineDateLabel, timelineTickLabel } from '../lib/timeline.js'

const STEP_LABELS = [
  ['build', 'Build'], ['test', 'Test'], ['staging', 'Staging'], ['live', 'Live'], ['doctor', 'Doctor told'],
]

function StepMark({ state, label }) {
  return (
    <span className={`step-mark step-${state}`} role="img" aria-label={`${label}: ${state === 'notStarted' ? 'not started' : state === 'inProgress' ? 'in progress' : state}`}>
      {state === 'done' ? <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" /><path d="m5.5 10 3 3 6-6" /></svg>
        : state === 'blocked' ? <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" /><path d="M10 5v6m0 3v.2" /></svg>
          : state === 'inProgress' ? <svg viewBox="0 0 20 20" aria-hidden="true"><circle className="mark-track" cx="10" cy="10" r="8" /><path d="M10 2a8 8 0 0 0 0 16z" /></svg>
            : <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" /></svg>}
    </span>
  )
}

export function AlertBanner({ rows, active, onToggle, today }) {
  const alerts = rows.map((feature) => getAlert(feature, today))
  const overdue = alerts.filter((alert) => alert.overdue).length
  const dueSoon = alerts.filter((alert) => alert.dueSoon).length
  const blocked = alerts.filter((alert) => alert.blocked).length
  const high = alerts.filter((alert) => alert.highPriority).length
  if (!alerts.some((alert) => alert.highAlert)) return null
  const summary = [
    overdue && `${overdue} overdue`,
    dueSoon && `${dueSoon} due within 3 days`,
    blocked && `${blocked} blocked`,
    high && `${high} high priority`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="alert-banner" role="status">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5m0 2.5v.1" /></svg>
      <span><strong>High alert</strong>{summary ? ` · ${summary}` : ''}</span>
      <button className={`btn alert-filter ${active ? 'selected' : ''}`} onClick={onToggle}>
        {active ? 'Show all features' : 'Show only these'}
      </button>
    </div>
  )
}

function Donut({ stats }) {
  const { informed, notInformed, notRequired, percentage } = stats.doctors
  const circumference = 2 * Math.PI * 37
  return (
    <section className="panel donut-panel">
      <h2>Doctors informed</h2>
      <div className="donut-content">
        <div className="donut-wrap">
          <svg viewBox="0 0 100 100" role="img" aria-label={`${percentage}% of doctors informed`}>
            <circle className="donut-track" cx="50" cy="50" r="37" />
            <circle className="donut-value" cx="50" cy="50" r="37"
              strokeDasharray={`${circumference * percentage / 100} ${circumference}`}
              transform="rotate(-90 50 50)" />
          </svg>
          <strong>{percentage}%</strong>
        </div>
        <div className="donut-counts">
          <span><b>{informed}</b> informed</span>
          <span><b>{notInformed}</b> waiting</span>
          <span><b>{notRequired}</b> not required</span>
        </div>
      </div>
    </section>
  )
}

function Pipeline({ stats }) {
  const total = stats.total || 1
  const items = [
    ['Built', stats.pipeline.built, 'blue'],
    ['Tested', stats.pipeline.tested, 'purple'],
    ['Staging', stats.pipeline.staging, 'amber'],
    ['Production', stats.pipeline.production, 'teal'],
  ]
  return (
    <section className="panel pipeline-panel">
      <h2>Delivery pipeline</h2>
      <div className="pipeline-list">
        {items.map(([label, count, color]) => (
          <div className="pipeline-row" key={label}>
            <span>{label}</span>
            <div className="pipeline-track"><i className={`pipeline-fill ${color}`} style={{ width: `${Math.min(100, count / total * 100)}%` }} /></div>
            <b>{count}</b>
          </div>
        ))}
      </div>
    </section>
  )
}

function Journey({ rows, today, highlightId }) {
  const [showAll, setShowAll] = useState(false)
  const ordered = useMemo(() => sortByUrgency(rows, today), [rows, today])
  const displayRows = showAll ? ordered : ordered.slice(0, 8)
  React.useEffect(() => {
    if (!highlightId) return
    setShowAll(true)
    const timer = window.setTimeout(() => {
      document.getElementById(`feature-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
    return () => window.clearTimeout(timer)
  }, [highlightId])
  return (
    <section className="panel journey-panel" id="journey-list">
      <div className="panel-heading">
        <h2>Feature journey <span>· most urgent first</span></h2>
        {ordered.length > 8 && (
          <button className="text-btn" onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Show fewer' : 'Show all'}
          </button>
        )}
      </div>
      {ordered.length === 0 ? <p className="empty-inline">No features match the current filters.</p> : (
        <>
          <div className="journey-labels" aria-hidden="true">
            <span>Feature</span>{STEP_LABELS.map(([, label]) => <span key={label}>{label}</span>)}<span>Deadline</span>
          </div>
          <div className="journey-rows">
            {displayRows.map((feature) => {
              const alert = getAlert(feature, today)
              const steps = getJourneySteps(feature)
              return (
                <article className={`journey-row ${alert.overdue ? 'journey-overdue' : alert.dueSoon ? 'journey-due-soon' : ''} ${feature.id === highlightId ? 'journey-highlight' : ''}`}
                  id={`feature-${feature.id}`} key={feature.id}>
                  <div className="journey-feature">
                    <strong>{feature.name || 'Untitled feature'}</strong>
                    <span>{[feature.by, feature.clinic].filter(Boolean).join(' · ') || 'Doctor and clinic not set'}
                      {feature.priority === 'High' && <b className="priority-label">High priority</b>}
                    </span>
                  </div>
                  {STEP_LABELS.map(([key, label]) => (
                    <div className="journey-step" data-label={label} key={key}>
                      <StepMark state={steps[key]} label={label} />
                    </div>
                  ))}
                  <div className="journey-deadline">
                    {alert.label && <span className={`deadline-chip ${alert.overdue ? 'chip-red' : alert.dueSoon ? 'chip-amber' : alert.delivered ? 'chip-done' : ''}`}>{alert.label}</span>}
                  </div>
                </article>
              )
            })}
          </div>
          <div className="journey-legend">
            {[
              ['done', 'Done'], ['inProgress', 'In progress'], ['blocked', 'Blocked'], ['notStarted', 'Not started'],
            ].map(([state, label]) => <span key={state}><StepMark state={state} label={label} />{label}</span>)}
          </div>
        </>
      )}
    </section>
  )
}

function Timeline({ rows, today }) {
  const timeline = getTimeline(rows, today)

  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <h2>Deadline timeline <span>· next 4 weeks</span></h2>
        <span className="timeline-range">{timelineDateLabel(timeline.start)} — {timelineDateLabel(timeline.end)}</span>
      </div>
      <div className="timeline-scroll">
        <div className="timeline-chart" style={{ height: `${Math.max(112, timeline.laneCount * 38 + 66)}px` }}>
          <div className="timeline-overdue-zone" />
          {timeline.ticks.map(({ day, date, x }) => (
            <div className="timeline-tick" key={day} style={{ left: `${x}%` }}>
              <span>{timelineTickLabel(date, timeline.today)}</span>
            </div>
          ))}
          <div className="timeline-today" style={{ left: `${timeline.todayX}%` }}>
            <b>Today · {timelineDateLabel(timeline.today)}</b>
          </div>
          {timeline.markers.map(({ feature, x, lane, status, alert, labelSide }) => (
            <div className={`timeline-marker marker-${status}`} key={feature.id}
              style={{ left: `${x}%`, top: `${8 + lane * 38}px` }}
              title={`${feature.name} · ${alert.label || timelineDateLabel(new Date(`${feature.deadline}T00:00:00Z`))}`}>
              <i />
              <span className={`timeline-marker-label label-${labelSide}`}>
                {feature.name} · {alert.overdue ? `${alert.daysLate}d late` : timelineDateLabel(new Date(`${feature.deadline}T00:00:00Z`))}
              </span>
            </div>
          ))}
          {!timeline.markers.length && <p className="timeline-empty">No upcoming deadlines in this window.</p>}
        </div>
      </div>
      {(timeline.earlier || timeline.later || timeline.omitted) > 0 && (
        <p className="timeline-foot">
          {timeline.earlier > 0 && <span>+{timeline.earlier} earlier</span>}
          {timeline.later > 0 && <span>+{timeline.later} later</span>}
          {timeline.omitted > 0 && <span>+{timeline.omitted} more in this window</span>}
        </p>
      )}
      <div className="timeline-legend">
        <span><i className="marker-dot overdue" />Overdue</span>
        <span><i className="marker-dot soon" />Due within 3 days</span>
        <span><i className="marker-dot later" />Later</span>
      </div>
    </section>
  )
}

export default function Dashboard({ rows, today, highlightId }) {
  const stats = getStats(rows, today)
  const cards = [
    ['Total features', stats.total, ''],
    ['In production', stats.inProduction, ''],
    ['Overdue', stats.overdue, 'danger'],
    ['Doctors informed', stats.doctors.informed, ''],
    ['Doctors not informed', stats.doctors.notInformed, ''],
  ]
  return (
    <div className="dashboard">
      <div className="stats-grid">
        {cards.map(([label, count, tone]) => <div className="stat-card" key={label}><strong className={tone}>{count}</strong><span>{label}</span></div>)}
      </div>
      <div className="dashboard-grid">
        <Journey rows={rows} today={today} highlightId={highlightId} />
        <div className="dashboard-side">
          <Donut stats={stats} />
          <Pipeline stats={stats} />
        </div>
      </div>
      <Timeline rows={rows} today={today} />
    </div>
  )
}
