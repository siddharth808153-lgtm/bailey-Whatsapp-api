import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { CHATBOT } from '../../api/endpoints.js'
import { ChatbotFlow, WhatsappInstance } from '../../types/index.js'

interface Props {
  flow: ChatbotFlow | null
  instances: WhatsappInstance[]
  onClose: () => void
  onSaved: () => void
}

type Tab = 'basic' | 'hours' | 'ai'

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

  // AI Settings
  const [useAi, setUseAi] = useState(flow?.use_ai || false)
  const [aiProvider, setAiProvider] = useState(flow?.ai_provider || 'openai')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiSystemPrompt, setAiSystemPrompt] = useState(
    flow?.ai_system_prompt || 'You are a helpful WhatsApp assistant. Keep replies concise and friendly. Reply in the same language as the user.'
  )

  const promptPresets = [
    { label: 'Customer Support', prompt: 'You are a customer support agent. Be polite, helpful, and concise. Ask clarifying questions when needed. Never use markdown formatting.' },
    { label: 'Sales Assistant', prompt: 'You are a sales assistant. Be enthusiastic and helpful. Highlight benefits. Ask about their needs. Never use markdown formatting.' },
    { label: 'FAQ Bot', prompt: 'You are an FAQ bot. Answer common questions clearly. If unsure, offer to connect with a human agent. Never use markdown formatting.' },
    { label: 'Appointment Scheduler', prompt: 'You are an appointment scheduling assistant. Help users book appointments by asking for date, time, and service needed. Never use markdown formatting.' },
  ]

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
        use_ai: useAi,
        ai_provider: useAi ? aiProvider : null,
        ai_system_prompt: useAi ? aiSystemPrompt : null,
      }
      if (aiApiKey) payload.ai_api_key = aiApiKey

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
          <button className={tabClasses('ai')} onClick={() => setTab('ai')}>AI Settings</button>
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

          {/* AI Settings Tab */}
          {tab === 'ai' && (
            <>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAi}
                  onChange={e => setUseAi(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">Enable AI-powered replies</span>
              </label>

              {useAi && (
                <div className="space-y-4 pl-7 border-l-2 border-purple-100">
                  {/* Provider Cards */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">AI Provider</label>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { value: 'openai', icon: '🟢', label: 'OpenAI', desc: 'GPT-3.5 Turbo' },
                        { value: 'gemini', icon: '🔵', label: 'Gemini', desc: 'Gemini Pro' },
                        { value: 'anthropic', icon: '🟠', label: 'Anthropic', desc: 'Claude Haiku' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setAiProvider(opt.value)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${aiProvider === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-gray-200'}`}
                        >
                          <div className="text-lg mb-1">{opt.icon}</div>
                          <div className="text-xs font-bold text-gray-800">{opt.label}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">API Key</label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={e => setAiApiKey(e.target.value)}
                      placeholder={isEdit ? '••••••••  (leave blank to keep existing)' : 'sk-...'}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono"
                    />
                    <p className="text-xs text-gray-400 mt-1">Your key is encrypted at rest and never exposed in the API.</p>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">System Prompt</label>
                    <textarea
                      value={aiSystemPrompt}
                      onChange={e => setAiSystemPrompt(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                    />
                    {/* Prompt presets */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {promptPresets.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => setAiSystemPrompt(p.prompt)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
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
