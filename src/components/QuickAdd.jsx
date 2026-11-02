import React, { useEffect, useRef, useState } from 'react'
import { getAlert } from '../lib/alerts.js'
import { parseEntry } from '../lib/parseEntry.js'

const DEV = ['Not Started', 'In Progress', 'In Review', 'Done', 'Blocked']
const TEST = ['Not Started', 'In Testing', 'Failed', 'Passed']
const DEP = ['Not Deployed', 'Staging', 'Production']
const INF = ['Not Informed', 'Informed', 'Not Required']
const CRED = ['Not Set', 'Yes', 'Pending', 'No']
const PRIORITY = ['Normal', 'High']
const FIELD_ROWS = [
  ['Feature', 'name'], ['Requested by', 'by'], ['Clinic', 'clinic'], ['Deadline', 'deadline'],
  ['Priority', 'priority'], ['Dev status', 'dev'], ['Testing', 'test'], ['Deployed to', 'dep'],
  ['Doctor informed', 'inf'], ['Credentials', 'cred'], ['Lead', 'lead'], ['Notes', 'notes'],
]
const FIELD_OPTIONS = { dev: DEV, test: TEST, dep: DEP, inf: INF, cred: CRED, priority: PRIORITY }
const NEW_FEATURE = {
  name: '',
  by: '',
  clinic: '',
  deadline: '',
  priority: 'Normal',
  dev: 'Not Started',
  test: 'Not Started',
  dep: 'Not Deployed',
  inf: 'Not Informed',
  cred: 'Not Set',
  lead: '',
  notes: '',
}

function todayString(today) {
  return [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-')
}

function fromAi(draft, today) {
  const parsed = parseEntry('', today)
  const values = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== null && value !== ''))
  const found = Object.keys(values)
  return {
    draft: { ...parsed.draft, ...values },
    found,
    missing: parsed.missing.filter((field) => !found.includes(field)),
  }
}

function dueNote(draft, today) {
  if (!draft.deadline) return ''
  const alert = getAlert(draft, today)
  if (alert.overdue) return 'This is already overdue.'
  if (alert.daysLeft === 0) return 'Due today.'
  return `Due in ${alert.daysLeft} ${alert.daysLeft === 1 ? 'day' : 'days'}.`
}

function DirectEntryForm({ rows, onAdd }) {
  const [values, setValues] = useState(NEW_FEATURE)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const doctors = [...new Set(rows.map((row) => row.by).filter(Boolean))].sort()
  const clinics = [...new Set(rows.map((row) => row.clinic).filter(Boolean))].sort()
  const leads = [...new Set(rows.map((row) => row.lead).filter(Boolean))].sort()
  const update = (field, value) => {
    setValues((current) => ({ ...current, [field]: value }))
    setError('')
    setSaved('')
  }
  const submit = async (event) => {
    event.preventDefault()
    if (!values.name.trim()) {
      setError('Add a feature name to continue.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onAdd({ ...values, name: values.name.trim(), deadline: values.deadline || null })
      setSaved(`Added “${values.name.trim()}”.`)
      setValues(NEW_FEATURE)
    } catch (failure) {
      setError(failure?.message || 'Unable to save this feature. Try again.')
    } finally {
      setSaving(false)
    }
  }
  const select = (field, label, options) => (
    <label className="entry-field">
      {label}
      <select value={values[field]} onChange={(event) => update(field, event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )

  return (
    <form className="direct-entry-form" onSubmit={submit}>
      <div className="entry-intro">
        <strong>Add a feature</strong>
        <span>Enter the essentials now. You can update its progress later.</span>
      </div>
      <label className="entry-field entry-feature-name">
        Feature name <span className="required-mark">Required</span>
        <input autoFocus required maxLength={300} placeholder="e.g. Patient appointment reminders"
          value={values.name} onChange={(event) => update('name', event.target.value)} />
      </label>
      <div className="entry-form-grid">
        <label className="entry-field">
          Requested by
          <input list="quick-doctors" placeholder="Doctor name (optional)" value={values.by}
            onChange={(event) => update('by', event.target.value)} />
          <datalist id="quick-doctors">{doctors.map((value) => <option key={value} value={value} />)}</datalist>
        </label>
        <label className="entry-field">
          Clinic
          <input list="quick-clinics" placeholder="Clinic or client" value={values.clinic}
            onChange={(event) => update('clinic', event.target.value)} />
          <datalist id="quick-clinics">{clinics.map((value) => <option key={value} value={value} />)}</datalist>
        </label>
        <label className="entry-field">
          Deadline
          <input type="date" value={values.deadline} onChange={(event) => update('deadline', event.target.value)} />
        </label>
        {select('priority', 'Priority', PRIORITY)}
        {select('dev', 'Development', DEV)}
        {select('test', 'Testing', TEST)}
        {select('dep', 'Deployment', DEP)}
        {select('inf', 'Doctor informed', INF)}
        {select('cred', 'Credentials', CRED)}
        <label className="entry-field">
          Assigned to
          <input list="quick-leads" placeholder="Team member" value={values.lead}
            onChange={(event) => update('lead', event.target.value)} />
          <datalist id="quick-leads">{leads.map((value) => <option key={value} value={value} />)}</datalist>
        </label>
        <label className="entry-field entry-notes">
          Notes
          <textarea rows={3} maxLength={2000} placeholder="Extra context or next steps" value={values.notes}
            onChange={(event) => update('notes', event.target.value)} />
        </label>
      </div>
      {saved && <p className="entry-success" role="status">{saved}</p>}
      {error && <p className="warn" role="alert">{error}</p>}
      <button className="btn pri entry-submit" type="submit" disabled={saving}>{saving ? 'Adding…' : 'Add to tracker'}</button>
    </form>
  )
}

function FieldValue({ field, draft, found, editing, update }) {
  if (!editing) {
    if (field === 'name' && !found.includes(field)) {
      return <input aria-label="Feature name" placeholder="Feature name" value={draft.name} onChange={(event) => update(field, event.target.value)} />
    }
    if (!found.includes(field)) return <span className="not-set">Not set</span>
    if (field === 'deadline') return <span>{draft.deadline || 'No deadline'}</span>
    return <span>{draft[field] || 'Not set'}</span>
  }
  if (field === 'deadline') {
    return <input aria-label="Deadline" type="date" value={draft.deadline || ''} onChange={(event) => update(field, event.target.value || null)} />
  }
  if (FIELD_OPTIONS[field]) {
    return (
      <select aria-label={FIELD_ROWS.find(([, key]) => key === field)?.[0]} value={draft[field] || ''}
        onChange={(event) => update(field, event.target.value || null)}>
        <option value="">Not set</option>
        {FIELD_OPTIONS[field].map((option) => <option key={option}>{option}</option>)}
      </select>
    )
  }
  if (field === 'notes') {
    return <textarea aria-label="Notes" value={draft.notes} onChange={(event) => update(field, event.target.value)} />
  }
  return <input aria-label={FIELD_ROWS.find(([, key]) => key === field)?.[0]} value={draft[field]}
    onChange={(event) => update(field, event.target.value)} />
}

function DraftCard({ item, today, onChange, onAdd, saving }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const { draft, found } = item.parsed
  const update = (field, value) => onChange(item.id, field, value)
  const applyReply = (field, value) => {
    if (field === 'deadline' && value !== null) {
      const parsed = parseEntry(`${draft.name || 'Feature'} due ${value}`, today).draft.deadline
      update(field, parsed)
    } else update(field, value)
  }
  const save = async () => {
    setError('')
    try {
      const feature = await onAdd({
        ...draft,
        dev: draft.dev || 'Not Started',
        test: draft.test || 'Not Started',
        dep: draft.dep || 'Not Deployed',
        cred: draft.cred || 'Not Set',
        inf: draft.inf || 'Not Informed',
        priority: draft.priority || 'Normal',
      })
      if (feature) onChange(item.id, 'added', true)
    } catch (saveError) {
      setError(saveError?.message || 'Unable to add this feature.')
    }
  }
  if (item.added) {
    return <div className="chat-added" role="status">Added “{draft.name}” to your tracker.</div>
  }
  return (
    <section className="draft-card">
      <div className="draft-heading"><strong>Review feature</strong><button className="text-btn" onClick={() => setEditing((value) => !value)}>{editing ? 'Done editing' : 'Edit fields'}</button></div>
      <div className="draft-fields">
        {FIELD_ROWS.map(([label, field]) => (
          <div className="draft-field" key={field}>
            <span>{label}</span>
            <FieldValue field={field} draft={draft} found={found} editing={editing} update={update} />
          </div>
        ))}
      </div>
      {!found.includes('name') && (
        <p className="quick-prompt">What should this feature be called? Enter its name above.</p>
      )}
      {!found.includes('dev') && !editing && (
        <div className="quick-replies"><span>Choose dev status</span>{DEV.map((status) => <button key={status} onClick={() => update('dev', status)}>{status}</button>)}</div>
      )}
      {!found.includes('deadline') && !editing && (
        <div className="quick-replies"><span>Set a deadline</span>
          {['Today', 'Tomorrow', 'Next week'].map((value) => <button key={value} onClick={() => applyReply('deadline', value)}>{value}</button>)}
          <button onClick={() => applyReply('deadline', null)}>No deadline</button>
        </div>
      )}
      {draft.deadline && found.includes('deadline') && <p className="due-note">{dueNote(draft, today)}</p>}
      {error && <p className="warn" role="alert">{error}</p>}
      <button className="btn pri draft-add" disabled={saving || !draft.name.trim()} onClick={save}>Add to tracker</button>
    </section>
  )
}

export default function QuickAdd({ backend, aiAvailable, onClose, onAdd, rows }) {
  const [mode, setMode] = useState('form')
  const [text, setText] = useState('')
  const [messages, setMessages] = useState([])
  const [drafts, setDrafts] = useState([])
  const [smartParse, setSmartParse] = useState(false)
  const [usedBasic, setUsedBasic] = useState(false)
  const [sending, setSending] = useState(false)
  const [savingId, setSavingId] = useState('')
  const nextId = useRef(0)
  const scrollRef = useRef(null)
  const today = new Date()

  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, drafts])

  const send = async (event) => {
    event.preventDefault()
    const raw = text.trim()
    if (!raw || sending) return
    const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    setMessages((current) => [...current, { id: `m${nextId.current++}`, text: raw }])
    setText('')
    setSending(true)
    setUsedBasic(false)
    let parsedEntries
    if (smartParse && aiAvailable) {
      try {
        const result = await backend.parseWithAi(lines.join('\n'), todayString(today))
        if (!Array.isArray(result?.drafts) || !result.drafts.length) throw new Error('Empty AI response')
        parsedEntries = result.drafts.map((draft) => fromAi(draft, today))
      } catch {
        setUsedBasic(true)
        parsedEntries = lines.map((line) => parseEntry(line, today))
      }
    } else {
      parsedEntries = lines.map((line) => parseEntry(line, today))
    }
    setDrafts((current) => [
      ...current,
      ...parsedEntries.map((parsed) => ({ id: `d${nextId.current++}`, parsed, added: false })),
    ])
    setSending(false)
  }

  const updateDraft = (id, field, value) => {
    setDrafts((current) => current.map((item) => {
      if (item.id !== id) return item
      if (field === 'added') return { ...item, added: value }
      const found = new Set(item.parsed.found)
      if ((value === '' || value === null) && field !== 'deadline') found.delete(field)
      else found.add(field)
      const missing = item.parsed.missing.filter((missingField) => !found.has(missingField))
      if (!found.has(field) && !missing.includes(field)) missing.push(field)
      return {
        ...item,
        parsed: {
          draft: { ...item.parsed.draft, [field]: value },
          found: [...found],
          missing,
        },
      }
    }))
  }

  const add = async (draft, id) => {
    setSavingId(id)
    try {
      return await onAdd(draft)
    } finally {
      setSavingId('')
    }
  }

  return (
    <div className="quick-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside className="quick-panel" role="dialog" aria-modal="true" aria-labelledby="quick-title">
        <header className="quick-header">
          <div><h2 id="quick-title">Add a feature</h2><p>Use the form or describe it in a sentence.</p></div>
          <button className="icon-btn" aria-label="Close quick add" onClick={onClose}>×</button>
        </header>
        <div className="entry-modes" role="tablist" aria-label="Add feature method">
          <button type="button" role="tab" aria-selected={mode === 'form'} className={mode === 'form' ? 'active' : ''} onClick={() => setMode('form')}>Fill in form</button>
          <button type="button" role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>Describe it</button>
        </div>
        {mode === 'form' ? <DirectEntryForm rows={rows} onAdd={onAdd} /> : (
          <>
            {aiAvailable && <label className="smart-toggle"><input type="checkbox" checked={smartParse} onChange={(event) => setSmartParse(event.target.checked)} /> Smart parse</label>}
            <div className="quick-messages" ref={scrollRef}>
              <div className="chat-tip">Try “Dark mode for the patient app, Dr Rao from Sunrise Clinic, needed by 5 Nov, urgent. It is on staging and in testing.”</div>
              {messages.map((message) => <div className="chat-user" key={message.id}>{message.text}</div>)}
              {usedBasic && <p className="basic-note">Used basic parsing.</p>}
              {sending && <p className="chat-thinking">Parsing your feature…</p>}
              {drafts.map((item) => (
                <DraftCard key={item.id} item={item} today={today} onChange={updateDraft}
                  onAdd={(draft) => add(draft, item.id)} saving={savingId === item.id} />
              ))}
            </div>
            <form className="quick-compose" onSubmit={send}>
              <textarea aria-label="Describe a feature" placeholder="Describe a feature, or paste several lines…" value={text} onChange={(event) => setText(event.target.value)} rows={2} />
              <button className="btn pri" type="submit" disabled={!text.trim() || sending}>Send</button>
            </form>
          </>
        )}
      </aside>
    </div>
  )
}
