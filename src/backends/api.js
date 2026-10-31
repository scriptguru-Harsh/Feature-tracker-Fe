const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
const TOKEN_KEY = 'ft_token'
const authListeners = new Set()
const rowListeners = new Set()

function notifyAuth(user) {
  for (const listener of authListeners) listener(user)
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  notifyAuth(null)
}

async function request(path, options = {}) {
  if (!API_URL) {
    throw new Error('VITE_API_URL is not configured. Set it in the frontend environment and rebuild.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  const headers = new Headers(options.headers || {})
  const token = localStorage.getItem(TOKEN_KEY)

  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    const body = response.status === 204 ? null : await response.json().catch(() => null)

    if (response.status === 401) clearToken()
    if (!response.ok) {
      throw new Error(body?.error || `Request failed (${response.status})`)
    }
    return body
  } finally {
    clearTimeout(timeout)
  }
}

export function createBackend() {
  return {
    name: 'API',

    onAuth(cb) {
      authListeners.add(cb)
      let active = true
      const token = localStorage.getItem(TOKEN_KEY)

      if (!token) {
        cb(null)
      } else {
        request('/api/auth/me')
          .then((user) => { if (active) cb(user) })
          .catch((error) => { if (active) cb(null, error) })
      }

      return () => {
        active = false
        authListeners.delete(cb)
      }
    },

    async signIn(email, password) {
      const result = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem(TOKEN_KEY, result.token)
      notifyAuth(result.user)
      return result.user
    },

    async signOut() {
      localStorage.removeItem(TOKEN_KEY)
      notifyAuth(null)
    },

    subscribe(onRows, onError) {
      let stopped = false
      let fetching = false
      let interval

      const reload = async () => {
        if (stopped || fetching) return
        fetching = true
        try {
          const rows = await request('/api/features')
          if (!stopped) onRows(rows)
        } catch (error) {
          if (!stopped) onError(error)
        } finally {
          fetching = false
        }
      }
      const startPolling = () => {
        clearInterval(interval)
        interval = undefined
        if (document.visibilityState === 'visible') {
          interval = setInterval(reload, 15_000)
        }
      }
      const onVisibilityChange = () => {
        startPolling()
        if (document.visibilityState === 'visible') reload()
      }

      rowListeners.add(reload)
      document.addEventListener('visibilitychange', onVisibilityChange)
      void reload()
      startPolling()

      return () => {
        stopped = true
        clearInterval(interval)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        rowListeners.delete(reload)
      }
    },

    async add() {
      await request('/api/features', { method: 'POST', body: JSON.stringify({}) })
      await Promise.all([...rowListeners].map((reload) => reload()))
    },

    async update(id, field, value) {
      await request(`/api/features/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: value }),
      })
      await Promise.all([...rowListeners].map((reload) => reload()))
    },

    async remove(id) {
      await request(`/api/features/${encodeURIComponent(id)}`, { method: 'DELETE' })
      await Promise.all([...rowListeners].map((reload) => reload()))
    },
  }
}
