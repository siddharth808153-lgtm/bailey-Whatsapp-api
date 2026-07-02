import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { CHATBOT, INSTANCES } from '../../api/endpoints.js'
import { ChatbotFlow, WhatsappInstance } from '../../types/index.js'
import { CreateFlowModal } from '../../components/chatbot/CreateFlowModal.js'

export const ChatbotPage: React.FC = () => {
  const [flows, setFlows] = useState<ChatbotFlow[]>([])
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editFlow, setEditFlow] = useState<ChatbotFlow | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const fetchFlows = useCallback(async () => {
    try {
      const res = await axios.get(CHATBOT.FLOWS)
      setFlows(res.data.data || [])
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchInstances = useCallback(async () => {
    try {
      const res = await axios.get(INSTANCES.LIST)
      setInstances(res.data.data || [])
    } catch {
      /* silently fail */
    }
  }, [])

  useEffect(() => {
    fetchFlows()
    fetchInstances()
  }, [fetchFlows, fetchInstances])

  const toggleFlow = async (id: number) => {
    try {
      await axios.post(CHATBOT.FLOW_TOGGLE(id))
      fetchFlows()
    } catch {
      /* silently fail */
    }
  }

  const deleteFlow = async () => {
    if (!deleteId) return
    try {
      await axios.delete(CHATBOT.FLOW_DETAIL(deleteId))
      fetchFlows()
    } catch {
      /* silently fail */
    } finally {
      setDeleteId(null)
    }
  }

  // Stats
  const totalFlows = flows.length
  const activeFlows = flows.filter(f => f.is_active).length
  const aiFlows = flows.filter(f => f.agent_id || f.use_ai).length
  const totalConversations = flows.reduce((s, f) => s + (f.active_conversations_count || 0), 0)

  const triggerBadge = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      keyword: { label: 'Keyword', color: 'bg-blue-100 text-blue-700' },
      any_message: { label: 'Any Message', color: 'bg-purple-100 text-purple-700' },
      first_message: { label: 'First Message', color: 'bg-amber-100 text-amber-700' },
    }
    const info = map[type] || { label: type, color: 'bg-gray-100 text-gray-700' }
    return <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${info.color}`}>{info.label}</span>
  }

  const providerBadge = (provider?: string) => {
    const map: Record<string, { label: string; color: string }> = {
      openai: { label: 'GPT', color: 'bg-green-100 text-green-700' },
      gemini: { label: 'Gemini', color: 'bg-sky-100 text-sky-700' },
      anthropic: { label: 'Claude', color: 'bg-orange-100 text-orange-700' },
    }
    if (!provider) return null
    const info = map[provider] || { label: provider, color: 'bg-gray-100 text-gray-700' }
    return <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${info.color}`}>🤖 {info.label}</span>
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Chatbot</h1>
            <p className="text-sm text-gray-500 mt-1">Build automated reply flows with keyword triggers and AI agent integration.</p>
          </div>
          <button
            onClick={() => { setEditFlow(null); setShowCreate(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
          >
            <span>➕</span> New Flow
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Flows', value: totalFlows, icon: '🔄', color: 'from-blue-500 to-blue-600' },
            { label: 'Active Flows', value: activeFlows, icon: '✅', color: 'from-green-500 to-green-600' },
            { label: 'Agent-Linked', value: aiFlows, icon: '🧠', color: 'from-purple-500 to-purple-600' },
            { label: 'Active Chats', value: totalConversations, icon: '💬', color: 'from-amber-500 to-amber-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white text-lg shadow-sm`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                  <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Flow Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 text-sm font-semibold">Loading flows...</div>
        ) : flows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
            <div className="text-5xl mb-4">🤖</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">No chatbot flows yet</h3>
            <p className="text-sm text-gray-500 mb-6">Create your first chatbot flow to start auto-replying to incoming WhatsApp messages.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow transition-all"
            >
              Create First Flow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {flows.map(flow => (
              <div
                key={flow.id}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-4 ${flow.is_active ? 'border-green-200' : 'border-gray-100'}`}
              >
                {/* Top Row */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base truncate">{flow.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {flow.whatsapp_instance ? flow.whatsapp_instance.name : 'All instances'}
                    </p>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => toggleFlow(flow.id)}
                    className={`w-11 h-6 rounded-full transition-all relative ${flow.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${flow.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {triggerBadge(flow.trigger_type)}
                  {flow.agent_id && flow.ai_agent ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-purple-100 text-purple-700">🧠 {flow.ai_agent.name}</span>
                  ) : flow.use_ai ? (
                    providerBadge(flow.ai_provider)
                  ) : null}
                  {flow.business_hours_only && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-indigo-100 text-indigo-700">🕐 Hrs</span>
                  )}
                </div>

                {/* Stats Row */}
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>📋 {flow.chatbot_rules_count || 0} rules</span>
                  <span>💬 {flow.active_conversations_count || 0} active</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => { setEditFlow(flow); setShowCreate(true) }}
                    className="flex-1 text-xs font-bold text-blue-600 hover:bg-blue-50 py-1.5 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <Link
                    to={`/chatbot/flows/${flow.id}`}
                    className="flex-1 text-center text-xs font-bold text-gray-600 hover:bg-gray-50 py-1.5 rounded-lg transition-colors"
                  >
                    Rules
                  </Link>
                  <Link
                    to={`/chatbot/conversations?flow=${flow.id}`}
                    className="flex-1 text-center text-xs font-bold text-gray-600 hover:bg-gray-50 py-1.5 rounded-lg transition-colors"
                  >
                    Chats
                  </Link>
                  <button
                    onClick={() => setDeleteId(flow.id)}
                    className="text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Flow?</h3>
              <p className="text-sm text-gray-500 mb-6">This will remove all rules and conversation history. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={deleteFlow} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showCreate && (
          <CreateFlowModal
            flow={editFlow}
            instances={instances}
            onClose={() => { setShowCreate(false); setEditFlow(null) }}
            onSaved={() => { setShowCreate(false); setEditFlow(null); fetchFlows() }}
          />
        )}
      </div>
    </div>
  )
}
