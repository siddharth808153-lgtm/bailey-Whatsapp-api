import React, { useState } from 'react'
import axios from 'axios'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)
    try {
      const res = await axios.post('/auth/login', { email, password })
      const { token, user } = res.data.data

      localStorage.setItem('wasp_token', token)
      localStorage.setItem('wasp_user', JSON.stringify(user))

      // Redirect to landing dashboard
      window.location.href = '/'
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.')
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (role: 'super_admin' | 'reseller' | 'user') => {
    const credentials = {
      super_admin: { email: 'superadmin@wasp.com', password: 'secret123' },
      reseller: { email: 'reseller@wasp.com', password: 'secret123' },
      user: { email: 'user@wasp.com', password: 'secret123' }
    }
    const cred = credentials[role]
    setEmail(cred.email)
    setPassword(cred.password)
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center">
          <span className="text-4xl">🐝</span>
          <h2 className="text-2xl font-black text-white mt-2 tracking-tight">WASp Platform</h2>
          <p className="text-xs text-gray-500 mt-1">WhatsApp Automation SaaS Service</p>
        </div>

        {/* Credentials presets */}
        <div className="bg-gray-950 p-4 rounded-2xl border border-gray-850 space-y-2">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center mb-1">Quick Login Presets</p>
          <div className="flex gap-2">
            <button
              onClick={() => fillCredentials('super_admin')}
              className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-blue-600/20 text-blue-400 border border-blue-900/30 hover:bg-blue-600/30 transition-colors"
            >
              Admin
            </button>
            <button
              onClick={() => fillCredentials('reseller')}
              className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-purple-600/20 text-purple-400 border border-purple-900/30 hover:bg-purple-600/30 transition-colors"
            >
              Reseller
            </button>
            <button
              onClick={() => fillCredentials('user')}
              className="flex-1 py-1 px-2 text-[10px] font-bold rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-900/30 hover:bg-emerald-600/30 transition-colors"
            >
              User
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-900/30 text-red-400 px-4 py-2.5 rounded-xl text-xs font-semibold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-900/30"
          >
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  )
}
