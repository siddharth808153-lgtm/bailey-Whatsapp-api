import React from 'react'
import { NavLink } from 'react-router-dom'

export const Sidebar: React.FC = () => {
  return (
    <div className="w-64 bg-gray-900 text-gray-300 h-screen flex flex-col justify-between shadow-xl shrink-0">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        
        {/* Brand logo */}
        <div className="flex items-center px-6 mb-8 gap-2.5">
          <span className="text-2xl">🐝</span>
          <span className="text-xl font-black text-white tracking-wider">WASp Admin</span>
        </div>

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

        </nav>
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-gray-850 bg-gray-950/20 text-center text-[10px] text-gray-600 font-semibold uppercase tracking-widest">
        WASp Platform v1.0
      </div>
    </div>
  )
}
