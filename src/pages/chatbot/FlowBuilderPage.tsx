import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { CHATBOT } from '../../api/endpoints.js'
import { ChatbotFlow, ChatbotRule } from '../../types/index.js'
import { RuleEditorModal } from '../../components/chatbot/RuleEditorModal.js'

export const FlowBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const flowId = parseInt(id || '0')

  const [flow, setFlow] = useState<ChatbotFlow | null>(null)
  const [rules, setRules] = useState<ChatbotRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editRule, setEditRule] = useState<ChatbotRule | null>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<number | null>(null)

  const fetchFlow = useCallback(async () => {
    try {
      const res = await axios.get(CHATBOT.FLOW_DETAIL(flowId))
      setFlow(res.data.data)
      setRules(res.data.data.chatbot_rules || [])
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }, [flowId])

  useEffect(() => {
    fetchFlow()
  }, [fetchFlow])

  const deleteRule = async () => {
    if (!deleteRuleId) return
    try {
      await axios.delete(CHATBOT.RULE_DETAIL(flowId, deleteRuleId))
      fetchFlow()
    } catch {
      /* silently fail */
    } finally {
      setDeleteRuleId(null)
    }
  }

  const moveRule = async (ruleId: number, direction: 'up' | 'down') => {
    const idx = rules.findIndex(r => r.id === ruleId)
    if (idx === -1) return
    const newRules = [...rules]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= newRules.length) return

    // Swap priorities
    const tempPriority = newRules[idx].priority
    newRules[idx].priority = newRules[swapIdx].priority
    newRules[swapIdx].priority = tempPriority

    try {
      await axios.post(CHATBOT.RULES_REORDER(flowId), {
        rules: newRules.map(r => ({ id: r.id, priority: r.priority }))
      })
      fetchFlow()
    } catch {
      /* silently fail */
    }
  }

  const matchTypeBadge = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      exact: { label: 'Exact', color: 'bg-green-100 text-green-700' },
      contains: { label: 'Contains', color: 'bg-blue-100 text-blue-700' },
      starts_with: { label: 'Starts With', color: 'bg-amber-100 text-amber-700' },
      regex: { label: 'RegExp', color: 'bg-red-100 text-red-700' },
    }
    const info = map[type] || { label: type, color: 'bg-gray-100 text-gray-700' }
    return <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${info.color}`}>{info.label}</span>
  }

  const responseTypeBadge = (type: string) => {
    const map: Record<string, { icon: string; label: string }> = {
      text: { icon: '💬', label: 'Text' },
      image: { icon: '🖼', label: 'Image' },
      video: { icon: '🎥', label: 'Video' },
      document: { icon: '📎', label: 'Doc' },
      audio: { icon: '🎵', label: 'Audio' },
      flow_redirect: { icon: '↪️', label: 'Redirect' },
    }
    const info = map[type] || { icon: '❓', label: type }
    return <span className="text-xs text-gray-500">{info.icon} {info.label}</span>
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400 font-semibold text-sm">Loading flow...</div>
  }

  if (!flow) {
    return <div className="flex items-center justify-center h-full text-red-500 font-semibold text-sm">Flow not found.</div>
  }

  const keywordRules = rules.filter(r => !r.is_default).sort((a, b) => b.priority - a.priority)
  const defaultRule = rules.find(r => r.is_default)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/chatbot" className="hover:text-blue-600 transition-colors font-semibold">Chatbot Flows</Link>
          <span>/</span>
          <span className="text-gray-700 font-bold">{flow.name}</span>
        </div>

        {/* Flow Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{flow.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${flow.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {flow.is_active ? '● Active' : '○ Inactive'}
              </span>
              {flow.whatsapp_instance && (
                <span className="text-xs text-gray-400">📱 {flow.whatsapp_instance.name}</span>
              )}
              {flow.use_ai && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-purple-100 text-purple-700">🤖 AI Enabled</span>
              )}
            </div>
          </div>
          <button
            onClick={() => { setEditRule(null); setShowRuleModal(true) }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
          >
            <span>➕</span> Add Rule
          </button>
        </div>

        {/* Rules List */}
        <div className="space-y-4">
          {/* Keyword Rules */}
          {keywordRules.length === 0 && !defaultRule && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-base font-bold text-gray-800 mb-1">No rules yet</h3>
              <p className="text-sm text-gray-400 mb-4">Add keyword rules and a default fallback to start auto-replying.</p>
              <button
                onClick={() => setShowRuleModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow transition-all"
              >
                Create First Rule
              </button>
            </div>
          )}

          {keywordRules.map((rule, idx) => (
            <div key={rule.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
              <div className="flex items-start gap-4">
                {/* Priority & Move */}
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    onClick={() => moveRule(rule.id, 'up')}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs"
                  >▲</button>
                  <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{rule.priority}</span>
                  <button
                    onClick={() => moveRule(rule.id, 'down')}
                    disabled={idx === keywordRules.length - 1}
                    className="text-gray-400 hover:text-gray-700 disabled:opacity-30 text-xs"
                  >▼</button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {matchTypeBadge(rule.match_type)}
                    <span className="text-sm font-bold text-gray-800 font-mono truncate">
                      "{rule.trigger_keyword}"
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {responseTypeBadge(rule.response_type)}
                    {rule.simulate_typing && (
                      <span>⌨️ {rule.typing_delay_seconds}s typing</span>
                    )}
                  </div>
                  {rule.response_body && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 bg-gray-50 rounded-lg p-2">
                      {rule.response_body}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditRule(rule); setShowRuleModal(true) }}
                    className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >Edit</button>
                  <button
                    onClick={() => setDeleteRuleId(rule.id)}
                    className="px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >🗑</button>
                </div>
              </div>
            </div>
          ))}

          {/* Default Rule Card */}
          {defaultRule ? (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase bg-amber-200 text-amber-800">⭐ Default Fallback</span>
                    {responseTypeBadge(defaultRule.response_type)}
                  </div>
                  {defaultRule.response_body && (
                    <p className="text-xs text-gray-600 line-clamp-2 bg-white/60 rounded-lg p-2 mt-1">
                      {defaultRule.response_body}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditRule(defaultRule); setShowRuleModal(true) }}
                    className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >Edit</button>
                  <button
                    onClick={() => setDeleteRuleId(defaultRule.id)}
                    className="px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >🗑</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-amber-300 rounded-2xl p-5 text-center bg-amber-50/50">
              <p className="text-sm font-bold text-amber-700 mb-2">⚠️ No default fallback rule</p>
              <p className="text-xs text-amber-600 mb-3">Messages that don't match any keyword will go unanswered{flow.use_ai ? ' (AI will handle them)' : ''}.</p>
              {!flow.use_ai && (
                <button
                  onClick={() => { setEditRule(null); setShowRuleModal(true) }}
                  className="px-4 py-2 text-xs font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors shadow"
                >
                  Add Default Rule
                </button>
              )}
            </div>
          )}
        </div>

        {/* Delete Rule Modal */}
        {deleteRuleId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Rule?</h3>
              <p className="text-sm text-gray-500 mb-6">This rule will be permanently removed.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteRuleId(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={deleteRule} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors shadow">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rule Editor Modal */}
        {showRuleModal && (
          <RuleEditorModal
            flowId={flowId}
            rule={editRule}
            onClose={() => { setShowRuleModal(false); setEditRule(null) }}
            onSaved={() => { setShowRuleModal(false); setEditRule(null); fetchFlow() }}
          />
        )}
      </div>
    </div>
  )
}
