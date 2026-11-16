import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isLoggedIn, login } from '../api'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@khachikmedia.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isLoggedIn()) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <div className="login-card">
        <div className="brand" style={{ padding: 0 }}>
          <div className="brand-mark">KM</div>
          <div className="brand-copy">
            <span className="brand-name">Khachik</span>
            <span className="brand-sub">Media library</span>
          </div>
        </div>
        <h1>Welcome back</h1>
        <p className="lede">Sign in to upload Films, Stills, and Globe HQ media.</p>
        {error ? <p className="error">{error}</p> : null}
        <form className="stack" onSubmit={onSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="button primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
