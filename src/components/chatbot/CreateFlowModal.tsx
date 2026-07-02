import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { CHATBOT, AI } from '../../api/endpoints.js'
import { ChatbotFlow, WhatsappInstance, AiAgent } from '../../types/index.js'

interface Props {
  flow: ChatbotFlow | null
  instances: WhatsappInstance[]
  onClose: () => void
  onSaved: () => void
}

type Tab = 'basic' | 'hours' | 'agent'

export const CreateFlowModal: React.FC<Props> = ({ flow, instances, onClose, onSaved }) => {
  const isEdit = !!flow

  const [tab, setTab] = useState<Tab>('basic')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [name, setName] = useState(flow?.name || '')
  const [instanceId, setInstanceId] = useState<string>(flow?.instance_id?.toString() || '')
  const [triggerType, setTriggerType] = useState(flow?.trigger_type || 'keyword')
  const [isActive, setIsActive] = useState(flow?.is_active || false)

  // Business Hours
  const [businessHoursOnly, setBusinessHoursOnly] = useState(flow?.business_hours_only || false)
  const [hoursStart, setHoursStart] = useState(flow?.business_hours_start || '09:00')
  const [hoursEnd, setHoursEnd] = useState(flow?.business_hours_end || '18:00')
  const [awayMessage, setAwayMessage] = useState(flow?.away_message || '')

  // AI Agent (replaces old ai_provider/ai_api_key/ai_system_prompt)
  const [agentId, setAgentId] = useState<string>((flow as any)?.agent_id?.toString() || '')
  const [agents, setAgents] = useState<AiAgent[]>([])

  // Fetch available agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await axios.get(AI.AGENTS)
        setAgents(res.data.data || [])
      } catch { /* silent */ }
    }
    fetchAgents()
  }, [])

  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) { setError('Flow name is required.'); return }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        instance_id: instanceId ? parseInt(instanceId) : null,
        trigger_type: triggerType,
        is_active: isActive,
        business_hours_only: businessHoursOnly,
        business_hours_start: businessHoursOnly ? hoursStart : null,
        business_hours_end: businessHoursOnly ? hoursEnd : null,
        away_message: businessHoursOnly ? awayMessage : null,
        agent_id: agentId ? parseInt(agentId) : null,
        use_ai: false, // Legacy field — no longer used from modal
      }

      if (isEdit) {
        await axios.put(CHATBOT.FLOW_DETAIL(flow!.id), payload)
      } else {
        await axios.post(CHATBOT.FLOWS, payload)
      }
      onSaved()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setError(axiosErr?.response?.data?.message || 'Failed to save flow.')
    } finally {
      setSaving(false)
    }
  }

  const tabClasses = (t: Tab) =>
    `px-4 py-2 text-sm font-bold rounded-lg transition-all ${tab === t ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">{isEdit ? 'Edit Flow' : 'Create Chatbot Flow'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 px-6 pt-4">
          <button className={tabClasses('basic')} onClick={() => setTab('basic')}>Basic Settings</button>
          <button className={tabClasses('hours')} onClick={() => setTab('hours')}>Business Hours</button>
          <button className={tabClasses('agent')} onClick={() => setTab('agent')}>🧠 AI Agent</button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Basic Tab */}
          {tab === 'basic' && (
            <>
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Flow Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Welcome Bot, Support Replies..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Instance */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">WhatsApp Instance</label>
                <select
                  value={instanceId}
                  onChange={e => setInstanceId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"
                >
                  <option value="">All Instances (Global)</option>
                  {instances.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} {inst.phone_number ? `(${inst.phone_number})` : ''} — {inst.status}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Leave empty to apply this flow to all instances.</p>
              </div>

              {/* Trigger Type */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Trigger Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'keyword', icon: '🔑', label: 'Keyword', desc: 'Match specific keywords' },
                    { value: 'any_message', icon: '💬', label: 'Any Message', desc: 'Reply to all messages' },
                    { value: 'first_message', icon: '👋', label: 'First Message', desc: 'Only the first message' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTriggerType(opt.value)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${triggerType === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="text-lg mb-1">{opt.icon}</div>
                      <div className="text-xs font-bold text-gray-800">{opt.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">Activate immediately</span>
              </label>
            </>
          )}

          {/* Business Hours Tab */}
          {tab === 'hours' && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={businessHoursOnly}
                  onChange={e => setBusinessHoursOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">Only reply during business hours</span>
              </label>

              {businessHoursOnly && (
                <div className="space-y-4 pl-7 border-l-2 border-blue-100">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Start Time</label>
                      <input
                        type="time"
                        value={hoursStart}
                        onChange={e => setHoursStart(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">End Time</label>
                      <input
                        type="time"
                        value={hoursEnd}
                        onChange={e => setHoursEnd(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Away Message</label>
                    <textarea
                      value={awayMessage}
                      onChange={e => setAwayMessage(e.target.value)}
                      rows={3}
                      placeholder="Sorry, we're currently outside business hours. We'll get back to you soon!"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Sent automatically when a message arrives outside business hours.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* AI Agent Tab (replaces old AI Settings tab) */}
          {tab === 'agent' && (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Link AI Agent</label>
                <p className="text-xs text-gray-400 mb-3">
                  Assign an AI agent to handle messages that don't match any rules. The agent uses your global API key and its own knowledge base.
                </p>
                <select
                  value={agentId}
                  onChange={e => setAgentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white transition-all"
                >
                  <option value="">No AI Agent (rules-only)</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      🧠 {agent.name} {!agent.is_active ? '(inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {agentId && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-purple-800">How it works:</p>
                  <ul className="text-xs text-purple-700 space-y-1 list-disc ml-4">
                    <li>Incoming messages are first checked against your keyword rules</li>
                    <li>If no rule matches, the AI agent generates a response</li>
                    <li>The agent uses its system prompt + knowledge base for context</li>
                    <li>All conversations are logged under the agent's conversation tab</li>
                  </ul>
                </div>
              )}

              {agents.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">No agents created yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Go to <span className="font-bold">AI Agents</span> in the sidebar to create one.</p>
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow transition-all"
          >
            {saving ? 'Saving...' : (isEdit ? 'Update Flow' : 'Create Flow')}
          </button>
        </div>
      </div>
    </div>
  )
}
