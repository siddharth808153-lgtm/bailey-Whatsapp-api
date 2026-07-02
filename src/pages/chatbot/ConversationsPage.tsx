import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { CHATBOT } from '../../api/endpoints.js'
import { ChatbotFlow, ChatbotConversation } from '../../types/index.js'

export const ConversationsPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const flowFilter = searchParams.get('flow') || ''

  const [flows, setFlows] = useState<ChatbotFlow[]>([])
  const [conversations, setConversations] = useState<ChatbotConversation[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedFlowId, setSelectedFlowId] = useState(flowFilter)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Side panel
  const [selectedConvo, setSelectedConvo] = useState<ChatbotConversation | null>(null)

  const fetchFlows = useCallback(async () => {
    try {
      const res = await axios.get(CHATBOT.FLOWS)
      setFlows(res.data.data || [])
    } catch { /* silently fail */ }
  }, [])

  const fetchConversations = useCallback(async () => {
    if (!selectedFlowId) {
      setConversations([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const params: Record<string, string> = { page: page.toString() }
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active' ? '1' : '0'

      const res = await axios.get(CHATBOT.FLOW_CONVERSATIONS(parseInt(selectedFlowId)), { params })
      setConversations(res.data.data || [])
      setTotalPages(res.data.meta?.last_page || 1)
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }, [selectedFlowId, activeFilter, page])

  useEffect(() => { fetchFlows() }, [fetchFlows])
  useEffect(() => { fetchConversations() }, [fetchConversations])

  // Auto-refresh every 15s
  useEffect(() => {
    const interval = setInterval(fetchConversations, 15000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  const clearConversations = async () => {
    if (!selectedFlowId) return
    try {
      await axios.post(CHATBOT.FLOW_CLEAR_CONVERSATIONS(parseInt(selectedFlowId)))
      fetchConversations()
    } catch { /* silently fail */ }
  }

  const formatDate = (d?: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-6 border-b border-gray-100">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mb-4">Conversations</h1>

          {/* Filters */}
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Flow</label>
              <select
                value={selectedFlowId}
                onChange={e => { setSelectedFlowId(e.target.value); setPage(1) }}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="">Select a flow...</option>
                {flows.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Status</label>
              <select
                value={activeFilter}
                onChange={e => { setActiveFilter(e.target.value); setPage(1) }}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Ended</option>
              </select>
            </div>

            {selectedFlowId && (
              <button
                onClick={clearConversations}
                className="px-4 py-2 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
              >
                Clear All Active
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!selectedFlowId ? (
            <div className="text-center py-20 text-gray-400 text-sm font-semibold">
              <div className="text-4xl mb-3">💬</div>
              Select a chatbot flow to view conversations.
            </div>
          ) : loading ? (
            <div className="text-center py-20 text-gray-400 text-sm font-semibold">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm font-semibold">
              <div className="text-4xl mb-3">📭</div>
              No conversations found for this flow.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider py-3 px-2">Phone</th>
                  <th className="text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider py-3 px-2">Status</th>
                  <th className="text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider py-3 px-2">Last Activity</th>
                  <th className="text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider py-3 px-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map(convo => (
                  <tr
                    key={convo.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${selectedConvo?.id === convo.id ? 'bg-blue-50' : ''}`}
                    onClick={() => setSelectedConvo(convo)}
                  >
                    <td className="py-3 px-2">
                      <span className="text-sm font-bold text-gray-800 font-mono">{convo.contact_phone}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${convo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {convo.is_active ? '● Active' : '○ Ended'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-xs text-gray-500">{formatDate(convo.last_message_at)}</td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedConvo(convo) }}
                        className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 py-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-500 font-semibold">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel — Chat History */}
      {selectedConvo && (
        <div className="w-96 border-l border-gray-100 bg-white flex flex-col shadow-lg">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-mono">{selectedConvo.contact_phone}</h3>
              <span className={`text-[10px] font-bold ${selectedConvo.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                {selectedConvo.is_active ? '● Active' : '○ Ended'}
              </span>
            </div>
            <button
              onClick={() => setSelectedConvo(null)}
              className="text-gray-400 hover:text-gray-600 text-lg font-bold"
            >✕</button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
            {(!selectedConvo.state?.history || selectedConvo.state.history.length === 0) ? (
              <div className="text-center text-gray-400 text-xs py-10 font-semibold">
                No chat history available.
              </div>
            ) : (
              selectedConvo.state.history.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] ${msg.role === 'user' ? 'ml-auto' : 'mr-auto'}`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-green-100 text-gray-800 rounded-br-md'
                        : 'bg-white border border-gray-200 text-gray-700 rounded-bl-md shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <p className={`text-[10px] text-gray-400 mt-0.5 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.role === 'user' ? 'Customer' : '🤖 Bot'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
