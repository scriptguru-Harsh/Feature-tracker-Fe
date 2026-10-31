import React, { useEffect, useMemo, useState } from 'react'
import { createBackend } from './backends/api.js'

const DEV = ['Not Started', 'In Progress', 'In Review', 'Done', 'Blocked']
const TEST = ['Not Started', 'In Testing', 'Failed', 'Passed']
const DEP = ['Not Deployed', 'Staging', 'Production']
const INF = ['Not Informed', 'Informed', 'Not Required']
const CRED = ['Not Set', 'Yes', 'Pending', 'No']
const COL = {
  Done: 'g', 'In Progress': 'b', 'In Review': 'p', Blocked: 'r', Passed: 'g', 'In Testing': 'b',
  Failed: 'r', Production: 'g', Staging: 'b', Informed: 'g', 'Not Informed': 'r', Yes: 'g',
  Pending: 'y', No: 'r', 'Not Set': 'n', 'Not Started': 'n', 'Not Deployed': 'n', 'Not Required': 'n',
}
const CSV_COLS = [
  ['Feature', 'name'], ['Dev status', 'dev'], ['Testing status', 'test'], ['Deployed to', 'dep'],
  ['Requested by', 'by'], ['Clinic', 'clinic'], ['Credentials', 'cred'], ["Doctor's lead", 'lead'],
  ['Doctor informed', 'inf'], ['Notes', 'notes'],
]

function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function toCsv(rows) {
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const head = CSV_COLS.map((c) => q(c[0])).join(',')
  const body = rows.map((r) => CSV_COLS.map((c) => q(r[c[1]])).join(','))
  return '\ufeff' + [head, ...body].join('\r\n')
}

function Pill({ value, list, onChange, disabled }) {
  return (
    <select
      className={'pill ' + (COL[value] || 'n')}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {list.map((o) => <option key={o}>{o}</option>)}
    </select>
  )
}

function Text({ value, onCommit, placeholder, area, disabled }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  const props = {
    value: v,
    placeholder,
    disabled,
    onChange: (e) => setV(e.target.value),
    onBlur: () => { if (v !== value) onCommit(v) },
  }
  return area ? <textarea {...props} /> : <input {...props} />
}

function Row({ f, set, remove, disabled }) {
  return (
    <tr>
      <td style={{ minWidth: 190 }}><Text value={f.name} placeholder="Feature name" disabled={disabled} onCommit={(v) => set(f.id, 'name', v)} /></td>
      <td><Pill value={f.dev} list={DEV} disabled={disabled} onChange={(v) => set(f.id, 'dev', v)} /></td>
      <td><Pill value={f.test} list={TEST} disabled={disabled} onChange={(v) => set(f.id, 'test', v)} /></td>
      <td><Pill value={f.dep} list={DEP} disabled={disabled} onChange={(v) => set(f.id, 'dep', v)} /></td>
      <td style={{ minWidth: 150 }}><Text value={f.by} placeholder="Doctor name" disabled={disabled} onCommit={(v) => set(f.id, 'by', v)} /></td>
      <td style={{ minWidth: 150 }}><Text value={f.clinic} placeholder="Clinic" disabled={disabled} onCommit={(v) => set(f.id, 'clinic', v)} /></td>
      <td><Pill value={f.cred} list={CRED} disabled={disabled} onChange={(v) => set(f.id, 'cred', v)} /></td>
      <td style={{ minWidth: 140 }}><Text value={f.lead} placeholder="Lead name" disabled={disabled} onCommit={(v) => set(f.id, 'lead', v)} /></td>
      <td><Pill value={f.inf} list={INF} disabled={disabled} onChange={(v) => set(f.id, 'inf', v)} /></td>
      <td style={{ minWidth: 200 }}><Text area value={f.notes} placeholder="Notes" disabled={disabled} onCommit={(v) => set(f.id, 'notes', v)} /></td>
      <td><button className="x" title="Delete" disabled={disabled} onClick={() => remove(f.id)}>✕</button></td>
    </tr>
  )
}

function Login({ signIn, busy, error }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = (event) => {
    event.preventDefault()
    signIn(email, password)
  }

  return (
    <main className="login">
      <h1>Feature Tracker</h1>
      <p className="sub">Sign in to view and manage your team's shared features.</p>
      <form className="login-form" onSubmit={submit}>
        <label>
          Email
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="warn" role="alert">{error}</p>}
        <button className="btn pri" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  )
}

export default function App() {
  const backend = useMemo(() => createBackend(), [])
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [dep, setDep] = useState('')
  const [msg, setMsg] = useState('Checking sign-in…')
  const [err, setErr] = useState('')

  const fail = (error) => setErr('Problem: ' + (error?.message || error))

  useEffect(() => backend.onAuth((nextUser, authError) => {
    setUser(nextUser)
    setAuthReady(true)
    if (!nextUser) {
      setRows([])
      setReady(false)
      setMsg('Sign in to load shared features.')
    }
    if (authError) fail(authError)
  }), [backend])

  useEffect(() => {
    if (!user) return undefined

    setReady(false)
    setMsg('Loading shared features…')
    return backend.subscribe(
      (nextRows) => {
        setRows(nextRows)
        setReady(true)
        setErr('')
        setMsg('Connected · changes sync with the shared API.')
      },
      (error) => {
        fail(error)
        setMsg('Unable to load shared features.')
      },
    )
  }, [backend, user])

  const signIn = async (email, password) => {
    setBusy(true)
    setErr('')
    try {
      await backend.signIn(email, password)
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await backend.signOut()
    setErr('')
  }

  const change = async (operation, successMessage) => {
    setBusy(true)
    try {
      await operation()
      setErr('')
      setMsg(successMessage)
    } catch (error) {
      fail(error)
    } finally {
      setBusy(false)
    }
  }

  const set = (id, field, value) => change(
    () => backend.update(id, field, value),
    'Saved · changes sync with the shared API.',
  )
  const remove = (id) => {
    if (confirm('Delete this feature?')) {
      void change(() => backend.remove(id), 'Deleted · changes sync with the shared API.')
    }
  }
  const add = () => change(
    () => backend.add(),
    'Added · changes sync with the shared API.',
  )

  const stats = useMemo(() => {
    const c = (fn) => rows.filter(fn).length
    return [
      ['Total features', rows.length],
      ['Blocked', c((x) => x.dev === 'Blocked')],
      ['In testing', c((x) => x.test === 'In Testing')],
      ['On staging', c((x) => x.dep === 'Staging')],
      ['In production', c((x) => x.dep === 'Production')],
      ['Doctor not informed', c((x) => x.inf === 'Not Informed')],
    ]
  }, [rows])

  const shown = useMemo(() => {
    const s = q.toLowerCase()
    return rows.filter((x) => {
      const hay = [x.name, x.notes, x.by, x.clinic, x.lead].join(' ').toLowerCase()
      return (!s || hay.includes(s)) && (!dep || x.dep === dep)
    })
  }, [rows, q, dep])

  if (!authReady) {
    return <main className="login"><h1>Feature Tracker</h1><p className="sub">Checking sign-in…</p></main>
  }

  if (!user) {
    return <Login signIn={signIn} busy={busy} error={err.replace(/^Problem: /, '')} />
  }

  return (
    <div className="wrap">
      <div className="app-heading">
        <div>
          <h1>Feature Tracker</h1>
          <p className="sub">Development, testing, deployment and doctor communication in one place. Data is shared through the Feature Tracker API.</p>
        </div>
        <div className="account">
          <span>{user.email}</span>
          <button className="btn" disabled={busy} onClick={signOut}>Sign out</button>
        </div>
      </div>
      <div className="stats">
        {stats.map(([label, n]) => <div className="stat" key={label}><b>{n}</b><span>{label}</span></div>)}
      </div>
      <div className="bar">
        <input type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={dep} onChange={(e) => setDep(e.target.value)}>
          <option value="">All deployments</option>
          {DEP.map((o) => <option key={o}>{o}</option>)}
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn" disabled={!ready} onClick={() => download('feature-tracker.csv', toCsv(rows), 'text/csv;charset=utf-8')}>Download CSV</button>
        <button className="btn pri" disabled={!ready || busy} onClick={add}>+ Add feature</button>
      </div>
      <div className="tw">
        {!shown.length ? (
          <div className="empty">{rows.length ? 'No features match.' : ready ? 'No shared features yet. Click “Add feature” to start.' : 'Loading…'}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Feature</th><th>Dev status</th><th>Testing</th><th>Deployed to</th>
                <th>Requested by (doctor)</th><th>Clinic</th><th>Credentials?</th>
                <th>Doctor’s lead</th><th>Doctor informed?</th><th>Notes</th><th></th>
              </tr>
            </thead>
            <tbody>{shown.map((f) => <Row key={f.id} f={f} set={set} remove={remove} disabled={busy} />)}</tbody>
          </table>
        )}
      </div>
      <p className="note" role="status">{msg}</p>
      <p className="warn" role="alert">{err}</p>
    </div>
  )
}
