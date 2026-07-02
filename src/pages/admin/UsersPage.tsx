import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { User } from '../../types/index.js'

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (roleFilter !== 'all') params.role = roleFilter

      const res = await axios.get('/admin/users', { params })
      setUsers(res.data.data || [])
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleImpersonate = async (userId: number) => {
    setImpersonatingId(userId)
    try {
      // API call to impersonate user
      const res = await axios.post(`/admin/impersonate/${userId}`)
      const { token, user } = res.data.data

      // Save original admin token in localStorage so we can switch back
      const originalAdminToken = localStorage.getItem('wasp_token')
      const originalAdminUser = localStorage.getItem('wasp_user')
      if (originalAdminToken && originalAdminUser) {
        localStorage.setItem('wasp_admin_token', originalAdminToken)
        localStorage.setItem('wasp_admin_user', originalAdminUser)
      }

      // Overwrite session with the impersonated user's session
      localStorage.setItem('wasp_token', token)
      localStorage.setItem('wasp_user', JSON.stringify(user))

      // Redirect to home dashboard
      window.location.href = '/'
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to impersonate user.')
    } finally {
      setImpersonatingId(null)
    }
  }

  const roleBadge = (role: User['role']) => {
    const map = {
      super_admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
      reseller: { label: 'Reseller', color: 'bg-purple-100 text-purple-700' },
      user: { label: 'User', color: 'bg-blue-100 text-blue-700' },
    }
    const info = map[role] || { label: role, color: 'bg-gray-100 text-gray-700' }
    return <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${info.color}`}>{info.label}</span>
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Super Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Manage platform clients, check usage, and impersonate accounts for debugging.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 mb-6 flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Search User</label>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full px-4 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Role Filter</label>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="reseller">Resellers</option>
              <option value="super_admin">Admins</option>
            </select>
          </div>
        </div>

        {/* User List */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-400 text-sm font-semibold">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm font-semibold">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3.5 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">User Info</th>
                    <th className="py-3.5 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="py-3.5 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-3.5 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-gray-900 text-sm">{user.name}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{user.email}</div>
                      </td>
                      <td className="py-4 px-5">{roleBadge(user.role)}</td>
                      <td className="py-4 px-5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {user.role !== 'super_admin' && (
                          <button
                            onClick={() => handleImpersonate(user.id)}
                            disabled={impersonatingId === user.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 text-xs font-bold py-1.5 px-3 rounded-lg shadow-sm transition-all"
                          >
                            {impersonatingId === user.id ? 'Loading...' : 'Impersonate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
