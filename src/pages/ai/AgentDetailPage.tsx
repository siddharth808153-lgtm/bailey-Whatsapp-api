import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import { AI } from '../../api/endpoints.js'
import { AiAgent, AiKnowledgeDoc, AiConversation } from '../../types/index.js'

type Tab = 'knowledge' | 'playground' | 'conversations'

export const AgentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const agentId = parseInt(id || '0')

  const [agent, setAgent] = useState<AiAgent | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('playground')

  // Knowledge base
  const [docs, setDocs] = useState<AiKnowledgeDoc[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Playground
  const [playgroundMessages, setPlaygroundMessages] = useState<{ role: string; content: string; timestamp?: string }[]>([])
  const [playgroundInput, setPlaygroundInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Conversations
  const [conversations, setConversations] = useState<AiConversation[]>([])
  const [viewConv, setViewConv] = useState<AiConversation | null>(null)

  const fetchAgent = useCallback(async () => {
    try {
      const res = await axios.get(AI.AGENT_DETAIL(agentId))
      setAgent(res.data.data)
      setDocs(res.data.data.knowledge_docs || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }, [agentId])

  const fetchKnowledge = useCallback(async () => {
    try {
      const res = await axios.get(AI.KNOWLEDGE(agentId))
      setDocs(res.data.data || [])
    } catch { /* silent */ }
  }, [agentId])

  const fetchPlayground = useCallback(async () => {
    try {
      // The playground conversation is loaded by sending a blank — instead just fetch and it would be persisted
      // We load playground by querying conversations with null phone
      // Actually playground is persisted via the playground endpoint replies
      // On page load we fetch agent detail, and playground will be loaded from agent conversations
    } catch { /* silent */ }
  }, [])

  const fetchConversations = useCallback(async () => {
    try {
      const res = await axios.get(AI.CONVERSATIONS(agentId))
      setConversations(res.data.data || [])
    } catch { /* silent */ }
  }, [agentId])

  useEffect(() => {
    fetchAgent()
  }, [fetchAgent])

  useEffect(() => {
    if (tab === 'knowledge') fetchKnowledge()
    if (tab === 'conversations') fetchConversations()
  }, [tab, fetchKnowledge, fetchConversations])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [playgroundMessages])

  // Knowledge upload
  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await axios.post(AI.KNOWLEDGE(agentId), form, { headers: { 'Content-Type': 'multipart/form-data' } })
      fetchKnowledge()
    } catch { /* silent */ } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteDoc = async (docId: number) => {
    try {
      await axios.delete(AI.KNOWLEDGE_DELETE(agentId, docId))
      fetchKnowledge()
    } catch { /* silent */ }
  }

  // Playground send
  const handleSendMessage = async () => {
    if (!playgroundInput.trim() || sendingMsg) return
    const userMsg = playgroundInput.trim()
    setPlaygroundInput('')
    setPlaygroundMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setSendingMsg(true)
    try {
      const res = await axios.post(AI.AGENT_PLAYGROUND(agentId), { message: userMsg })
      if (res.data.data?.messages) {
        setPlaygroundMessages(res.data.data.messages)
      } else if (res.data.data?.reply) {
        setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: res.data.data.reply }])
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setPlaygroundMessages(prev => [...prev, { role: 'assistant', content: `❌ ${e?.response?.data?.message || 'Failed to get response'}` }])
    } finally { setSendingMsg(false) }
  }

  const handleClearPlayground = async () => {
    try {
      await axios.delete(AI.AGENT_CLEAR_PLAYGROUND(agentId))
      setPlaygroundMessages([])
    } catch { /* silent */ }
  }

  // View full conversation
  const handleViewConversation = async (conv: AiConversation) => {
    try {
      const res = await axios.get(AI.CONVERSATION_DETAIL(agentId, conv.id))
      setViewConv(res.data.data)
    } catch { /* silent */ }
  }

  const handleDeleteConversation = async (convId: number) => {
    try {
      await axios.delete(AI.CONVERSATION_DETAIL(agentId, convId))
      setViewConv(null)
      fetchConversations()
    } catch { /* silent */ }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  const tabClasses = (t: Tab) =>
    `px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:bg-gray-100'}`

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400 font-semibold">Loading agent...</div>
  if (!agent) return <div className="flex items-center justify-center h-full text-red-500 font-semibold">Agent not found.</div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link to="/ai/agents" className="hover:text-blue-600 transition-colors font-semibold">AI Agents</Link>
          <span>/</span>
          <span className="text-gray-700 font-bold">{agent.name}</span>
        </div>

        {/* Agent Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-2xl">🧠</div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">{agent.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 font-semibold">
                <span className={agent.is_active ? 'text-green-600' : 'text-gray-400'}>{agent.is_active ? '● Active' : '○ Inactive'}</span>
                <span>🌡 {agent.temperature}</span>
                <span>📝 {agent.max_tokens} tokens</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button className={tabClasses('playground')} onClick={() => setTab('playground')}>🎮 Playground</button>
          <button className={tabClasses('knowledge')} onClick={() => setTab('knowledge')}>📚 Knowledge Base</button>
          <button className={tabClasses('conversations')} onClick={() => setTab('conversations')}>💬 Conversations</button>
        </div>

        {/* ===== PLAYGROUND TAB ===== */}
        {tab === 'playground' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ height: '500px' }}>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-sm">🎮</span>
                <span className="text-sm font-bold text-gray-700">Agent Playground</span>
              </div>
              <button
                onClick={handleClearPlayground}
                className="px-3 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                Clear Chat
              </button>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#0b141a]">
              {playgroundMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <span className="text-4xl mb-3">💬</span>
                  <p className="text-sm font-semibold">Send a message to test your agent</p>
                  <p className="text-xs text-gray-600 mt-1">The agent will use its system prompt and knowledge base.</p>
                </div>
              )}
              {playgroundMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-[#005c4b] text-gray-200 border border-[#025143]'
                      : 'bg-[#1f2c34] text-gray-300 border border-[#2a3942]'
                  }`}>
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{msg.content}</p>
                    {msg.timestamp && (
                      <span className="block text-[9px] text-gray-500 text-right mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {sendingMsg && (
                <div className="flex justify-start">
                  <div className="bg-[#1f2c34] text-gray-400 border border-[#2a3942] rounded-2xl px-4 py-2.5 text-sm">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="px-4 py-3 border-t border-gray-100 bg-white flex gap-2">
              <input
                type="text"
                value={playgroundInput}
                onChange={e => setPlaygroundInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                placeholder="Type a test message..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                disabled={sendingMsg}
              />
              <button
                onClick={handleSendMessage}
                disabled={sendingMsg || !playgroundInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* ===== KNOWLEDGE BASE TAB ===== */}
        {tab === 'knowledge' && (
          <div className="space-y-5">
            {/* Upload */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Upload Knowledge Documents</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Supported: TXT, PDF, DOCX, MD, CSV (max 5 MB each)</p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                >
                  {uploading ? 'Uploading...' : '📤 Upload File'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx,.md,.csv"
                  onChange={handleUploadDoc}
                  className="hidden"
                />
              </div>
            </div>

            {/* Docs list */}
            {docs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <span className="text-4xl">📚</span>
                <h3 className="text-base font-bold text-gray-800 mt-3 mb-1">No knowledge documents</h3>
                <p className="text-sm text-gray-400">Upload documents to give this agent context about your business.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map(doc => (
                  <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-lg shrink-0">
                      {doc.mime_type?.includes('pdf') ? '📕' : doc.mime_type?.includes('word') || doc.mime_type?.includes('docx') ? '📘' : '📄'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{doc.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatFileSize(doc.size)} · Uploaded {new Date(doc.created_at).toLocaleDateString()}</p>
                      {doc.content_preview && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2 bg-gray-50 rounded-lg p-2">{doc.content_preview}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-700 shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== CONVERSATIONS TAB ===== */}
        {tab === 'conversations' && (
          <div className="space-y-3">
            {conversations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
                <span className="text-4xl">💬</span>
                <h3 className="text-base font-bold text-gray-800 mt-3 mb-1">No conversations yet</h3>
                <p className="text-sm text-gray-400">Conversations will appear here when contacts interact with this agent via WhatsApp.</p>
              </div>
            ) : (
              conversations.map(conv => (
                <div key={conv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer" onClick={() => handleViewConversation(conv)}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-black text-blue-700">
                    {conv.contact_phone?.slice(-2) || '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{conv.contact_phone || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {conv.last_message_role === 'assistant' ? '🤖 ' : '👤 '}
                      {conv.last_message || 'No messages'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{conv.message_count} msgs</span>
                    <p className="text-[9px] text-gray-400 mt-1">{new Date(conv.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CONVERSATION DETAIL MODAL */}
        {viewConv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setViewConv(null)}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900">📱 {viewConv.contact_phone || 'Unknown'}</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">{(viewConv.messages || []).length} messages</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDeleteConversation(viewConv.id)}
                    className="px-3 py-1 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <button onClick={() => setViewConv(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0b141a]">
                {(viewConv.messages || []).map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] ${
                      msg.role === 'user'
                        ? 'bg-[#005c4b] text-gray-200 border border-[#025143]'
                        : 'bg-[#1f2c34] text-gray-300 border border-[#2a3942]'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      {msg.timestamp && (
                        <span className="block text-[8px] text-gray-500 text-right mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
