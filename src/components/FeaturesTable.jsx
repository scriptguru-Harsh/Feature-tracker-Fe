import React from 'react'
import { getAlert } from '../lib/alerts.js'

const DEV = ['Not Started', 'In Progress', 'In Review', 'Done', 'Blocked']
const TEST = ['Not Started', 'In Testing', 'Failed', 'Passed']
const DEP = ['Not Deployed', 'Staging', 'Production']
const INF = ['Not Informed', 'Informed', 'Not Required']
const CRED = ['Not Set', 'Yes', 'Pending', 'No']
const PRIORITY = ['Normal', 'High']
const COLORS = {
  Done: 'g', 'In Progress': 'b', 'In Review': 'p', Blocked: 'r', Passed: 'g',
  'In Testing': 'b', Failed: 'r', Production: 'g', Staging: 'b', Informed: 'g',
  'Not Informed': 'r', Yes: 'g', Pending: 'y', No: 'r', 'Not Set': 'n',
  'Not Started': 'n', 'Not Deployed': 'n', 'Not Required': 'n', High: 'r', Normal: 'n',
}

function Pill({ value, options, disabled, onChange }) {
  return (
    <select
      className={`pill ${COLORS[value] || 'n'}`}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  )
}

function TextCell({ value, placeholder, onCommit, disabled, area = false }) {
  const [text, setText] = React.useState(value)
  React.useEffect(() => setText(value), [value])
  const props = {
    value: text,
    placeholder,
    disabled,
    onChange: (event) => setText(event.target.value),
    onBlur: () => { if (text !== value) onCommit(text) },
  }
  return area ? <textarea {...props} /> : <input {...props} />
}

function FeatureRow({ feature, onUpdate, onRemove, disabled, today }) {
  const alert = getAlert(feature, today)
  const set = (field, value) => onUpdate(feature.id, field, value)
  return (
    <tr>
      <td className="feature-name-cell"><TextCell value={feature.name} placeholder="Feature name" disabled={disabled} onCommit={(value) => set('name', value)} /></td>
      <td><Pill value={feature.dev} options={DEV} disabled={disabled} onChange={(value) => set('dev', value)} /></td>
      <td><Pill value={feature.test} options={TEST} disabled={disabled} onChange={(value) => set('test', value)} /></td>
      <td><Pill value={feature.dep} options={DEP} disabled={disabled} onChange={(value) => set('dep', value)} /></td>
      <td><TextCell value={feature.by} placeholder="Doctor name" disabled={disabled} onCommit={(value) => set('by', value)} /></td>
      <td><TextCell value={feature.clinic} placeholder="Clinic" disabled={disabled} onCommit={(value) => set('clinic', value)} /></td>
      <td><Pill value={feature.cred} options={CRED} disabled={disabled} onChange={(value) => set('cred', value)} /></td>
      <td><TextCell value={feature.lead} placeholder="Lead name" disabled={disabled} onCommit={(value) => set('lead', value)} /></td>
      <td><Pill value={feature.inf} options={INF} disabled={disabled} onChange={(value) => set('inf', value)} /></td>
      <td><input aria-label={`Deadline for ${feature.name || 'feature'}`} type="date" value={feature.deadline || ''} disabled={disabled} onChange={(event) => set('deadline', event.target.value || null)} /></td>
      <td><Pill value={feature.priority || 'Normal'} options={PRIORITY} disabled={disabled} onChange={(value) => set('priority', value)} /></td>
      <td><TextCell area value={feature.notes} placeholder="Notes" disabled={disabled} onCommit={(value) => set('notes', value)} /></td>
      <td><span className={`alert-tag ${alert.highAlert ? 'alert-tag-hot' : ''}`}>{alert.label || '—'}</span></td>
      <td><button className="icon-btn delete-btn" title="Delete feature" aria-label={`Delete ${feature.name || 'feature'}`} disabled={disabled} onClick={() => onRemove(feature.id)}>×</button></td>
    </tr>
  )
}

export default function FeaturesTable({ rows, onUpdate, onRemove, disabled, today }) {
  return (
    <div className="table-card">
      {!rows.length ? <div className="empty">No features match the current filters.</div> : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Feature</th><th>Dev status</th><th>Testing</th><th>Deployed to</th>
                <th>Requested by (doctor)</th><th>Clinic</th><th>Credentials</th>
                <th>Doctor’s lead</th><th>Doctor informed</th><th>Deadline</th>
                <th>Priority</th><th>Notes</th><th>Alert</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((feature) => (
                <FeatureRow key={feature.id} feature={feature} onUpdate={onUpdate}
                  onRemove={onRemove} disabled={disabled} today={today} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
