import React from 'react'
import { NavLink } from 'react-router-dom'

export const Sidebar: React.FC = () => {
  // Get active session user
  const userStr = localStorage.getItem('wasp_user')
  const user = userStr ? JSON.parse(userStr) : null

  // Check if current session is an impersonation
  const isImpersonating = !!localStorage.getItem('wasp_admin_token')

  const handleStopImpersonating = () => {
    const adminToken = localStorage.getItem('wasp_admin_token')
    const adminUser = localStorage.getItem('wasp_admin_user')

    if (adminToken && adminUser) {
      localStorage.setItem('wasp_token', adminToken)
      localStorage.setItem('wasp_user', adminUser)

      localStorage.removeItem('wasp_admin_token')
      localStorage.removeItem('wasp_admin_user')

      // Redirect back to Admin Users page
      window.location.href = '/admin/users'
    }
  }

  const handleLogout = () => {
    // Clear all localStorage auth tokens and redirect to login page
    localStorage.removeItem('wasp_token')
    localStorage.removeItem('wasp_user')
    localStorage.removeItem('wasp_admin_token')
    localStorage.removeItem('wasp_admin_user')
    window.location.href = '/login'
  }

  return (
    <div className="w-64 bg-gray-900 text-gray-300 h-screen flex flex-col justify-between shadow-xl shrink-0">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        
        {/* Brand logo */}
        <div className="flex items-center px-6 mb-8 gap-2.5">
          <span className="text-2xl">🐝</span>
          <span className="text-xl font-black text-white tracking-wider">WASp Admin</span>
        </div>

        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="mx-4 mb-6 bg-red-950/40 border border-red-900/30 p-3 rounded-2xl text-center space-y-2">
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">🎭 Impersonating Account</p>
            <p className="text-xs font-semibold text-gray-200 truncate">{user?.name}</p>
            <button
              onClick={handleStopImpersonating}
              className="w-full py-1 text-[10px] font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
            >
              Stop Impersonation
            </button>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 space-y-7">
          
          {/* Main Group */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">WhatsApp Engine</p>
            <NavLink
              to="/instances"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>📱</span>
              <span>Connections</span>
            </NavLink>
          </div>

          {/* Contacts Section Group */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Contacts Management</p>
            
            <NavLink
              to="/contacts"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>👥</span>
              <span>All Contacts</span>
            </NavLink>

            <NavLink
              to="/contacts/lists"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>📂</span>
              <span>Contact Lists</span>
            </NavLink>

            <NavLink
              to="/contacts/tags"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>🏷</span>
              <span>Tag Manager</span>
            </NavLink>
          </div>

          {/* Campaigns Section Group */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Campaigns & Messaging</p>
            
            <NavLink
              to="/campaigns"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>📢</span>
              <span>All Campaigns</span>
            </NavLink>

            <NavLink
              to="/campaigns/new"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>➕</span>
              <span>New Campaign</span>
            </NavLink>

            <NavLink
              to="/campaigns/templates"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>📝</span>
              <span>Message Templates</span>
            </NavLink>
          </div>

          {/* Chatbot & AI Section Group */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Chatbot & AI</p>
            
            <NavLink
              to="/chatbot"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>🤖</span>
              <span>Chatbot Flows</span>
            </NavLink>

            <NavLink
              to="/chatbot/conversations"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>💬</span>
              <span>Conversations</span>
            </NavLink>
          </div>

          {/* Automation & Warmup Group */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Automation & Warmup</p>
            
            <NavLink
              to="/drip"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>🌿</span>
              <span>Drip Campaigns</span>
            </NavLink>

            <NavLink
              to="/warmup"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
              }
            >
              <span>🔥</span>
              <span>Number Warmer</span>
            </NavLink>
          </div>

          {/* Super Admin Section Group (only visible to role: super_admin) */}
          {user?.role === 'super_admin' && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Super Admin</p>
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30' : 'hover:bg-gray-800 hover:text-white'}`
                }
              >
                <span>🛡️</span>
                <span>Manage Users</span>
              </NavLink>
            </div>
          )}

        </nav>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-gray-800 bg-gray-950/40 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-500 truncate">{user?.role}</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-400 hover:text-white bg-gray-850 hover:bg-gray-800 rounded-xl transition-all"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </div>
  )
}
