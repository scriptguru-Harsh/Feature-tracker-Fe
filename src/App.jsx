import React, { useEffect, useMemo, useState } from 'react'
import { createBackend } from './backends/api.js'
import Dashboard, { AlertBanner } from './components/Dashboard.jsx'
import FeaturesTable from './components/FeaturesTable.jsx'
import QuickAdd from './components/QuickAdd.jsx'
import { getAlert } from './lib/alerts.js'

const DEP = ['Not Deployed', 'Staging', 'Production']
const CSV_COLS = [
  ['Feature', 'name'], ['Dev status', 'dev'], ['Testing status', 'test'], ['Deployed to', 'dep'],
  ['Requested by', 'by'], ['Clinic', 'clinic'], ['Credentials', 'cred'], ["Doctor's lead", 'lead'],
  ['Doctor informed', 'inf'], ['Deadline', 'deadline'], ['Priority', 'priority'], ['Notes', 'notes'],
]

function download(name, data, type) {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function toCsv(rows) {
  const quote = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const header = CSV_COLS.map(([label]) => quote(label)).join(',')
  const body = rows.map((row) => CSV_COLS.map(([, field]) => quote(row[field])).join(','))
  return '\ufeff' + [header, ...body].join('\r\n')
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
      <p className="sub">Sign in to view and manage your team’s shared features.</p>
      <form className="login-form" onSubmit={submit}>
        <label>Email<input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
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
  const [search, setSearch] = useState('')
  const [doctor, setDoctor] = useState('')
  const [clinic, setClinic] = useState('')
  const [deployment, setDeployment] = useState('')
  const [view, setView] = useState('overview')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [showOnlyAlerts, setShowOnlyAlerts] = useState(false)
  const [highlightId, setHighlightId] = useState('')
  const [aiAvailable, setAiAvailable] = useState(false)
  const [message, setMessage] = useState('Checking sign-in…')
  const [error, setError] = useState('')
  const today = new Date()

  const fail = (failure) => setError(`Problem: ${failure?.message || failure}`)

  useEffect(() => backend.onAuth((nextUser, authError) => {
    setUser(nextUser)
    setAuthReady(true)
    if (!nextUser) {
      setRows([])
      setReady(false)
      setMessage('Sign in to load shared features.')
    }
    if (authError) fail(authError)
  }), [backend])

  useEffect(() => {
    if (!user) return undefined
    setReady(false)
    setMessage('Loading shared features…')
    return backend.subscribe(
      (nextRows) => {
        setRows(nextRows)
        setReady(true)
        setError('')
        setMessage('Connected · changes sync with the shared API.')
      },
      fail,
    )
  }, [backend, user])

  useEffect(() => {
    if (!user) {
      setAiAvailable(false)
      return
    }
    backend.getConfig()
      .then((config) => setAiAvailable(config.ai === true))
      .catch(fail)
  }, [backend, user])

  const signIn = async (email, password) => {
    setBusy(true)
    setError('')
    try {
      await backend.signIn(email, password)
    } catch (failure) {
      fail(failure)
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    await backend.signOut()
    setError('')
  }

  const change = async (operation, successMessage) => {
    setBusy(true)
    try {
      await operation()
      setError('')
      setMessage(successMessage)
    } catch (failure) {
      fail(failure)
    } finally {
      setBusy(false)
    }
  }

  const update = (id, field, value) => change(
    () => backend.update(id, field, value),
    'Saved · changes sync with the shared API.',
  )
  const remove = (id) => {
    if (window.confirm('Delete this feature?')) {
      void change(() => backend.remove(id), 'Deleted · changes sync with the shared API.')
    }
  }

  const addDraft = async (draft) => {
    setBusy(true)
    try {
      const feature = await backend.add(draft)
      setError('')
      setMessage('Added · changes sync with the shared API.')
      setSearch('')
      setDoctor('')
      setClinic('')
      setDeployment('')
      setShowOnlyAlerts(false)
      setView('overview')
      setHighlightId(feature?.id || '')
      return feature
    } catch (failure) {
      fail(failure)
      throw failure
    } finally {
      setBusy(false)
    }
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((feature) => {
      const haystack = [feature.name, feature.notes, feature.by, feature.clinic, feature.lead].join(' ').toLowerCase()
      return (!query || haystack.includes(query))
        && (!doctor || feature.by === doctor)
        && (!clinic || feature.clinic === clinic)
        && (!deployment || feature.dep === deployment)
    })
  }, [rows, search, doctor, clinic, deployment])

  const shownRows = showOnlyAlerts
    ? filteredRows.filter((feature) => getAlert(feature, today).highAlert)
    : filteredRows

  const doctorOptions = [...new Set(rows.map((feature) => feature.by).filter(Boolean))].sort()
  const clinicOptions = [...new Set(rows.map((feature) => feature.clinic).filter(Boolean))].sort()

  if (!authReady) return <main className="login"><h1>Feature Tracker</h1><p className="sub">Checking sign-in…</p></main>
  if (!user) return <Login signIn={signIn} busy={busy} error={error.replace(/^Problem: /, '')} />

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-row">
          <div>
            <h1>Feature Tracker</h1>
            <p className="sub">Feature progress, deadlines and doctor communication.</p>
          </div>
          <div className="header-actions">
            <button className="btn pri quick-open" disabled={!ready} onClick={() => setQuickAddOpen(true)}>+ Quick add</button>
            <span className="account-email">{user.email}</span>
            <button className="btn" disabled={busy} onClick={signOut}>Sign out</button>
          </div>
        </div>
        <nav className="view-tabs" aria-label="Feature views">
          <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>Overview</button>
          <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
        </nav>
      </header>

      <AlertBanner rows={filteredRows} active={showOnlyAlerts} today={today}
        onToggle={() => setShowOnlyAlerts((active) => !active)} />

      <section className="filter-bar" aria-label="Feature filters">
        <input type="search" aria-label="Search features" placeholder="Search features…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Filter by doctor" value={doctor} onChange={(event) => setDoctor(event.target.value)}>
          <option value="">All doctors</option>{doctorOptions.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select aria-label="Filter by clinic" value={clinic} onChange={(event) => setClinic(event.target.value)}>
          <option value="">All clinics</option>{clinicOptions.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select aria-label="Filter by deployment" value={deployment} onChange={(event) => setDeployment(event.target.value)}>
          <option value="">All deployments</option>{DEP.map((status) => <option key={status}>{status}</option>)}
        </select>
        <button className="btn export-btn" disabled={!ready} onClick={() => download('feature-tracker.csv', toCsv(rows), 'text/csv;charset=utf-8')}>Download CSV</button>
      </section>

      {view === 'overview'
        ? <Dashboard rows={shownRows} today={today} highlightId={highlightId} />
        : <FeaturesTable rows={shownRows} today={today} onUpdate={update} onRemove={remove} disabled={busy} />}

      <p className="app-status" role="status">{message}</p>
      {error && <p className="warn app-error" role="alert">{error}</p>}
      {quickAddOpen && <QuickAdd backend={backend} aiAvailable={aiAvailable} onClose={() => setQuickAddOpen(false)} onAdd={addDraft} />}
    </main>
  )
}
