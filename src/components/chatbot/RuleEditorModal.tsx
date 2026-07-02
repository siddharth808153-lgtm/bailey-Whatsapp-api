import React, { useState } from 'react'
import axios from 'axios'
import { CHATBOT } from '../../api/endpoints.js'
import { ChatbotRule } from '../../types/index.js'

interface Props {
  flowId: number
  rule: ChatbotRule | null
  onClose: () => void
  onSaved: () => void
}

export const RuleEditorModal: React.FC<Props> = ({ flowId, rule, onClose, onSaved }) => {
  const isEdit = !!rule

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form
  const [triggerKeyword, setTriggerKeyword] = useState(rule?.trigger_keyword || '')
  const [matchType, setMatchType] = useState(rule?.match_type || 'contains')
  const [isDefault, setIsDefault] = useState(rule?.is_default || false)
  const [responseType, setResponseType] = useState(rule?.response_type || 'text')
  const [responseBody, setResponseBody] = useState(rule?.response_body || '')
  const [responseMediaUrl, setResponseMediaUrl] = useState(rule?.response_media_url || '')
  const [nextFlowId, setNextFlowId] = useState(rule?.next_flow_id?.toString() || '')
  const [simulateTyping, setSimulateTyping] = useState(rule?.simulate_typing ?? true)
  const [typingDelay, setTypingDelay] = useState(rule?.typing_delay_seconds || 3)
  const [priority, setPriority] = useState(rule?.priority || 0)

  // Regex test
  const [testInput, setTestInput] = useState('')
  const regexMatches = (() => {
    if (matchType !== 'regex' || !triggerKeyword || !testInput) return null
    try {
      return new RegExp(triggerKeyword, 'iu').test(testInput)
    } catch {
      return false
    }
  })()

  const handleSubmit = async () => {
    setError('')

    if (!isDefault && !triggerKeyword.trim()) {
      setError('Trigger keyword is required for non-default rules.')
      return
    }
    if (responseType !== 'flow_redirect' && !responseBody.trim()) {
      setError('Response body is required.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        trigger_keyword: isDefault ? null : triggerKeyword.trim(),
        match_type: matchType,
        is_default: isDefault,
        response_type: responseType,
        response_body: responseType !== 'flow_redirect' ? responseBody : null,
        response_media_url: responseMediaUrl || null,
        next_flow_id: responseType === 'flow_redirect' && nextFlowId ? parseInt(nextFlowId) : null,
        simulate_typing: simulateTyping,
        typing_delay_seconds: typingDelay,
        priority,
      }

      if (isEdit) {
        await axios.put(CHATBOT.RULE_DETAIL(flowId, rule!.id), payload)
      } else {
        await axios.post(CHATBOT.RULES(flowId), payload)
      }
      onSaved()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setError(axiosErr?.response?.data?.message || 'Failed to save rule.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">{isEdit ? 'Edit Rule' : 'Add Rule'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-6">

            {/* Left Column — Trigger */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">Trigger Configuration</h3>

              {/* Default Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-gray-700">Default fallback rule</span>
              </label>

              {!isDefault && (
                <>
                  {/* Keyword */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Trigger Keyword</label>
                    <input
                      value={triggerKeyword}
                      onChange={e => setTriggerKeyword(e.target.value)}
                      placeholder="e.g. hello, pricing, help..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>

                  {/* Match Type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Match Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'exact', label: 'Exact Match', desc: 'Word for word' },
                        { value: 'contains', label: 'Contains', desc: 'Anywhere in text' },
                        { value: 'starts_with', label: 'Starts With', desc: 'Beginning of text' },
                        { value: 'regex', label: 'Regex', desc: 'Pattern matching' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setMatchType(opt.value)}
                          className={`p-2.5 rounded-xl border-2 text-left transition-all ${matchType === opt.value ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}`}
                        >
                          <div className="text-xs font-bold text-gray-800">{opt.label}</div>
                          <div className="text-[10px] text-gray-400">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Regex Tester */}
                  {matchType === 'regex' && (
                    <div className="bg-gray-50 p-3 rounded-xl space-y-2">
                      <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide">Test Your Pattern</label>
                      <input
                        value={testInput}
                        onChange={e => setTestInput(e.target.value)}
                        placeholder="Type a test message..."
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none"
                      />
                      {testInput && (
                        <p className={`text-xs font-bold ${regexMatches ? 'text-green-600' : 'text-red-500'}`}>
                          {regexMatches ? '✅ Pattern matches!' : '❌ No match'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Priority (higher = checked first)</label>
                    <input
                      type="number"
                      value={priority}
                      onChange={e => setPriority(parseInt(e.target.value) || 0)}
                      min={0}
                      max={999}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Right Column — Response */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-gray-500 uppercase tracking-wider">Response Configuration</h3>

              {/* Response Type */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Response Type</label>
                <select
                  value={responseType}
                  onChange={e => setResponseType(e.target.value as ChatbotRule['response_type'])}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="text">💬 Text Reply</option>
                  <option value="image">🖼 Image</option>
                  <option value="video">🎥 Video</option>
                  <option value="document">📎 Document</option>
                  <option value="audio">🎵 Audio</option>
                  <option value="flow_redirect">↪️ Redirect to Flow</option>
                </select>
              </div>

              {/* Response Body */}
              {responseType !== 'flow_redirect' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Response Body</label>
                  <textarea
                    value={responseBody}
                    onChange={e => setResponseBody(e.target.value)}
                    rows={5}
                    placeholder="Type the auto-reply message here..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{responseBody.length}/4096 characters</p>
                </div>
              )}

              {/* Media URL */}
              {['image', 'video', 'document', 'audio'].includes(responseType) && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Media URL</label>
                  <input
                    value={responseMediaUrl}
                    onChange={e => setResponseMediaUrl(e.target.value)}
                    placeholder="https://example.com/file.jpg"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {/* Flow Redirect */}
              {responseType === 'flow_redirect' && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Target Flow ID</label>
                  <input
                    type="number"
                    value={nextFlowId}
                    onChange={e => setNextFlowId(e.target.value)}
                    placeholder="Enter flow ID to redirect to..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              {/* Behavior — Typing */}
              <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Behavior</h4>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulateTyping}
                    onChange={e => setSimulateTyping(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-semibold text-gray-700">Simulate typing indicator</span>
                </label>
                {simulateTyping && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Delay: {typingDelay} seconds</label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={typingDelay}
                      onChange={e => setTypingDelay(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>1s</span><span>5s</span><span>10s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* WhatsApp Preview */}
          {responseType !== 'flow_redirect' && responseBody && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-5 border border-green-200">
              <h4 className="text-xs font-black text-green-700 uppercase tracking-wider mb-3">💬 WhatsApp Preview</h4>
              <div className="bg-white rounded-2xl p-4 max-w-xs shadow-sm">
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{responseBody}</p>
                <p className="text-[10px] text-gray-400 text-right mt-2">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                </p>
              </div>
            </div>
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
            {saving ? 'Saving...' : (isEdit ? 'Update Rule' : 'Create Rule')}
          </button>
        </div>
      </div>
    </div>
  )
}
