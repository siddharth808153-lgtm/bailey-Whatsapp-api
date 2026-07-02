import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { INSTANCES, CONTACTS } from '../../api/endpoints.js'
import { WhatsappInstance } from '../../types/index.js'

export const QuickSendPage: React.FC = () => {
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('')
  const [phone, setPhone] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'document'>('text')
  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaFilename, setMediaFilename] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchInstances = async () => {
    setLoading(true)
    try {
      const res = await axios.get(INSTANCES.LIST)
      const connected = (res.data.data || []).filter((ins: WhatsappInstance) => ins.status === 'connected')
      setInstances(connected)
      if (connected.length > 0) {
        setSelectedInstanceId(connected[0].id.toString())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstances()
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (!selectedInstanceId) {
      setFeedback({ type: 'error', text: 'Please select a connected WhatsApp instance.' })
      return
    }
    if (!phone.trim()) {
      setFeedback({ type: 'error', text: 'Please enter a destination phone number.' })
      return
    }
    if (messageType === 'text' && !body.trim()) {
      setFeedback({ type: 'error', text: 'Please enter message text.' })
      return
    }

    setSending(true)
    try {
      await axios.post(CONTACTS.SEND_MESSAGE, {
        instance_id: Number(selectedInstanceId),
        phone: phone.trim(),
        type: messageType,
        body,
        media_url: messageType !== 'text' ? mediaUrl : null,
        media_filename: messageType === 'document' ? mediaFilename : null,
      })
      setFeedback({ type: 'success', text: 'Message sent successfully!' })
      // Clear inputs
      setPhone('')
      setBody('')
      setMediaUrl('')
      setMediaFilename('')
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send message. Check that the format is correct.'
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quick Send</h1>
          <p className="text-sm text-gray-500 mt-1">Send a one-off custom WhatsApp message to any phone number instantly.</p>
        </div>

        {/* Layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form container */}
          <div className="lg:col-span-2 bg-white border border-gray-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-gray-950 uppercase tracking-wider">Message Settings</h2>

            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading instances...</div>
            ) : instances.length === 0 ? (
              <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl text-center space-y-3">
                <span className="text-2xl block">⚠️</span>
                <p className="text-xs font-bold text-amber-800">No connected WhatsApp numbers found</p>
                <p className="text-[11px] text-amber-600">Connect a WhatsApp number under Connections before using Quick Send.</p>
              </div>
            ) : (
              <form onSubmit={handleSend} className="space-y-5">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp Connection</label>
                    <select
                      value={selectedInstanceId}
                      onChange={e => setSelectedInstanceId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                    >
                      {instances.map(ins => (
                        <option key={ins.id} value={ins.id}>
                          {ins.name} ({ins.phone_number})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Recipient Number (with country code)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 919876543210"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Message Type Tabs */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Message Type</label>
                  <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-200/50 gap-1">
                    {(['text', 'image', 'video', 'document'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMessageType(type)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all capitalize ${
                          messageType === type ? 'bg-white text-gray-950 shadow-sm border border-gray-200/40' : 'text-gray-400 hover:text-gray-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media fields */}
                {messageType !== 'text' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Attachment URL</label>
                      <input
                        type="url"
                        value={mediaUrl}
                        onChange={e => setMediaUrl(e.target.value)}
                        placeholder="https://example.com/file.jpg"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    {messageType === 'document' && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Document Filename</label>
                        <input
                          type="text"
                          value={mediaFilename}
                          onChange={e => setMediaFilename(e.target.value)}
                          placeholder="invoice.pdf"
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Message Body */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Message Text</label>
                  <textarea
                    rows={5}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Type your message text here..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>

                {feedback && (
                  <div className={`p-4 rounded-xl text-xs font-bold text-center border ${
                    feedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {feedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all"
                >
                  {sending ? 'Sending message...' : 'Send WhatsApp Message'}
                </button>

              </form>
            )}
          </div>

          {/* Live preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 flex flex-col justify-between h-[450px]">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-6 text-center">Live Preview</p>
              <div className="bg-[#efeae2] rounded-2xl p-4 min-h-[260px] border border-gray-950 flex flex-col justify-end space-y-4">
                <div className="self-start max-w-[85%] bg-white rounded-2xl rounded-tl-none p-3 shadow-sm text-xs text-gray-800 space-y-2 border border-gray-100">
                  {messageType !== 'text' && mediaUrl && (
                    <div className="w-full h-24 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{messageType} Attached</span>
                    </div>
                  )}
                  <p className="whitespace-pre-line leading-relaxed">
                    {body || 'Start typing message text on the left to preview...'}
                  </p>
                  <span className="text-[9px] text-gray-400 float-right mt-1">10:00 AM</span>
                </div>
              </div>
            </div>
            <div className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
              Recipient: {phone || 'None'}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
export default QuickSendPage
