import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { AI } from '../../api/endpoints.js'
import { AiAgent, AiConfig } from '../../types/index.js'

export const AiAgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<AiAgent[]>([])
  const [config, setConfig] = useState<AiConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AiAgent | null>(null)
  const [formName, setFormName] = useState('')
  const [formPrompt, setFormPrompt] = useState('You are a helpful WhatsApp assistant. Keep replies concise and friendly. Reply in the same language as the user. Never use markdown formatting.')
  const [formTemp, setFormTemp] = useState(0.7)
  const [formMaxTokens, setFormMaxTokens] = useState(500)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Config modal
  const [showConfig, setShowConfig] = useState(false)
  const [configProvider, setConfigProvider] = useState<string>('openai')
  const [configKey, setConfigKey] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)

  // Delete state
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const promptPresets = [
    { label: '🛎 Customer Support', prompt: 'You are a customer support agent. Be polite, helpful, and concise. Ask clarifying questions when needed. Never use markdown formatting.' },
    { label: '💰 Sales Assistant', prompt: 'You are a sales assistant. Be enthusiastic and helpful. Highlight benefits. Ask about their needs. Never use markdown formatting.' },
    { label: '❓ FAQ Bot', prompt: 'You are an FAQ bot. Answer common questions clearly. If unsure, offer to connect with a human agent. Never use markdown formatting.' },
    { label: '📅 Appointment Bot', prompt: 'You are an appointment scheduling assistant. Help users book appointments by asking for date, time, and service needed. Never use markdown formatting.' },
  ]

  const fetchAgents = useCallback(async () => {
    try {
      const res = await axios.get(AI.AGENTS)
      setAgents(res.data.data || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(AI.CONFIG)
      setConfig(res.data.data || null)
      if (res.data.data?.provider) setConfigProvider(res.data.data.provider)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchAgents()
    fetchConfig()
  }, [fetchAgents, fetchConfig])

  const openCreate = () => {
    setEditingAgent(null)
    setFormName('')
    setFormPrompt('You are a helpful WhatsApp assistant. Keep replies concise and friendly. Reply in the same language as the user. Never use markdown formatting.')
    setFormTemp(0.7)
    setFormMaxTokens(500)
    setError('')
    setShowModal(true)
  }

  const openEdit = (agent: AiAgent) => {
    setEditingAgent(agent)
    setFormName(agent.name)
    setFormPrompt(agent.system_prompt || '')
    setFormTemp(agent.temperature)
    setFormMaxTokens(agent.max_tokens)
    setError('')
    setShowModal(true)
  }

  const handleSaveAgent = async () => {
    if (!formName.trim()) { setError('Agent name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: formName.trim(),
        system_prompt: formPrompt,
        temperature: formTemp,
        max_tokens: formMaxTokens,
      }
      if (editingAgent) {
        await axios.put(AI.AGENT_DETAIL(editingAgent.id), payload)
      } else {
        await axios.post(AI.AGENTS, payload)
      }
      setShowModal(false)
      fetchAgents()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e?.response?.data?.message || 'Failed to save agent.')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await axios.delete(AI.AGENT_DETAIL(deleteId))
      fetchAgents()
    } catch { /* silent */ } finally { setDeleteId(null) }
  }

  const handleSaveConfig = async () => {
    setSavingConfig(true)
    try {
      await axios.post(AI.CONFIG, {
        provider: configProvider,
        api_key: configKey || undefined,
      })
      setShowConfig(false)
      setConfigKey('')
      fetchConfig()
    } catch { /* silent */ } finally { setSavingConfig(false) }
  }

  const totalAgents = agents.length
  const activeAgents = agents.filter(a => a.is_active).length
  const totalKnowledge = agents.reduce((s, a) => s + (a.knowledge_docs_count || 0), 0)
  const totalConversations = agents.reduce((s, a) => s + (a.conversations_count || 0), 0)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">🧠 AI Agents</h1>
            <p className="text-sm text-gray-400 mt-1">Create and manage AI-powered agents for your WhatsApp flows.</p>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setShowConfig(true)}
              className="px-4 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-600 transition-all flex items-center gap-2"
            >
              <span>⚙️</span> API Key
            </button>
            <button
              onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
            >
              <span>➕</span> New Agent
            </button>
          </div>
        </div>

        {/* API Key Status Banner */}
        {config && !config.has_key && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">No API Key Configured</p>
              <p className="text-xs text-amber-600 mt-0.5">You need to set up an AI provider API key before your agents can respond.</p>
            </div>
            <button
              onClick={() => setShowConfig(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Configure Now
            </button>
          </div>
        )}

        {config && config.has_key && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-lg">✅</span>
            <p className="text-xs text-green-700 font-semibold">
              Provider: <span className="uppercase font-black">{config.provider}</span> · Key: <span className="font-mono">{config.masked_key}</span>
            </p>
            <button
              onClick={() => setShowConfig(true)}
              className="ml-auto px-3 py-1 text-[10px] font-bold text-green-700 hover:bg-green-100 rounded-lg transition-colors"
            >
              Change
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Agents', value: totalAgents, icon: '🤖' },
            { label: 'Active', value: activeAgents, icon: '✅' },
            { label: 'Knowledge Docs', value: totalKnowledge, icon: '📚' },
            { label: 'Conversations', value: totalConversations, icon: '💬' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-xl font-black text-gray-900">{s.value}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Agents Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400 font-semibold">Loading agents...</div>
        ) : agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {agents.map(agent => (
              <div key={agent.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${agent.is_active ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                        🧠
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-gray-900">{agent.name}</h3>
                        <span className={`text-[9px] font-bold uppercase ${agent.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {agent.is_active ? '● Active' : '○ Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 mt-3 line-clamp-2 h-8">
                    {agent.system_prompt?.substring(0, 100) || 'No prompt configured'}
                  </p>

                  <div className="flex items-center gap-3 mt-3 text-[10px] font-bold text-gray-400">
                    <span>📚 {agent.knowledge_docs_count || 0} docs</span>
                    <span>💬 {agent.conversations_count || 0} chats</span>
                    <span>🔗 {agent.chatbot_flows_count || 0} flows</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                    <span>🌡 {agent.temperature}</span>
                    <span>📝 {agent.max_tokens} tokens</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-4">
                  <Link
                    to={`/ai/agents/${agent.id}`}
                    className="px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 font-bold rounded-lg text-[10px] hover:bg-blue-100 transition-colors"
                  >
                    Open Agent →
                  </Link>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(agent)} className="px-2.5 py-1 text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors">
                      Edit
                    </button>
                    <button onClick={() => setDeleteId(agent.id)} className="px-2.5 py-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 bg-white border border-gray-100 rounded-2xl text-center shadow-sm">
            <span className="text-5xl mb-4">🧠</span>
            <h3 className="text-base font-bold text-gray-800 mb-1">No AI Agents Yet</h3>
            <p className="text-sm text-gray-400 mb-5">Create your first agent to power AI-driven WhatsApp conversations.</p>
            <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow transition-all">
              Create First Agent
            </button>
          </div>
        )}

        {/* CREATE / EDIT AGENT MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)}>
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900">{editingAgent ? 'Edit Agent' : 'Create AI Agent'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm font-semibold">{error}</div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Agent Name</label>
                  <input
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Support Agent, Sales Bot..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">System Prompt</label>
                  <textarea
                    value={formPrompt}
                    onChange={e => setFormPrompt(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {promptPresets.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setFormPrompt(p.prompt)}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Temperature ({formTemp})</label>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.1}
                      value={formTemp}
                      onChange={e => setFormTemp(parseFloat(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 font-bold mt-0.5">
                      <span>Precise</span><span>Creative</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Max Tokens</label>
                    <input
                      type="number"
                      min={50}
                      max={4000}
                      value={formMaxTokens}
                      onChange={e => setFormMaxTokens(parseInt(e.target.value) || 500)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                <button
                  onClick={handleSaveAgent}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow transition-all"
                >
                  {saving ? 'Saving...' : (editingAgent ? 'Update Agent' : 'Create Agent')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API KEY CONFIG MODAL */}
        {showConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowConfig(false)}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900">⚙️ AI Settings</h2>
                <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">AI Provider</label>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { value: 'openai', icon: '🟢', label: 'OpenAI', desc: 'GPT-4o / 3.5' },
                      { value: 'gemini', icon: '🔵', label: 'Gemini', desc: 'Gemini 1.5 Flash' },
                      { value: 'anthropic', icon: '🟠', label: 'Anthropic', desc: 'Claude 3.5 Haiku' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setConfigProvider(opt.value)}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${configProvider === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="text-lg mb-1">{opt.icon}</div>
                        <div className="text-xs font-bold text-gray-800">{opt.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">API Key</label>
                  <input
                    type="password"
                    value={configKey}
                    onChange={e => setConfigKey(e.target.value)}
                    placeholder={config?.has_key ? '••••••••  (leave blank to keep existing)' : 'sk-...'}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                  <p className="text-xs text-gray-400 mt-1">Your key is encrypted at rest. One key shared across all agents.</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <button onClick={() => setShowConfig(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow transition-all"
                >
                  {savingConfig ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE CONFIRM */}
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
              <span className="text-4xl">🗑️</span>
              <h3 className="text-base font-bold text-gray-900 mt-3">Delete this agent?</h3>
              <p className="text-sm text-gray-400 mt-1">This will remove the agent and unlink it from any flows.</p>
              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={() => setDeleteId(null)} className="px-5 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={handleDelete} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow transition-all">Delete</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
