import React, { useState, useEffect } from 'react'
import { INSTANCES, CONTACTS } from '../../api/endpoints.js'
import { WhatsappInstance } from '../../types/index.js'
import axios from 'axios'

interface QuickSendModalProps {
  isOpen: boolean
  onClose: () => void
  contactName: string
  contactPhone: string
}

export const QuickSendModal: React.FC<QuickSendModalProps> = ({
  isOpen,
  onClose,
  contactName,
  contactPhone,
}) => {
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('')
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'document'>('text')
  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaFilename, setMediaFilename] = useState('')
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchInstances()
      setBody('')
      setMediaUrl('')
      setMediaFilename('')
      setStatusMsg(null)
      setMessageType('text')
    }
  }, [isOpen])

  const fetchInstances = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(INSTANCES.LIST)
      if (res.data.success) {
        // Only show connected instances
        const connected = res.data.data.filter((ins: WhatsappInstance) => ins.status === 'connected')
        setInstances(connected)
        if (connected.length > 0) {
          setSelectedInstanceId(String(connected[0].id))
        }
      }
    } catch (err) {
      console.error('Failed to load instances', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMsg(null)

    if (!selectedInstanceId) {
      setStatusMsg({ type: 'error', text: 'Please select a connected WhatsApp instance.' })
      return
    }

    setIsSending(true)

    try {
      const res = await axios.post(CONTACTS.SEND_MESSAGE, {
        instance_id: parseInt(selectedInstanceId),
        phone: contactPhone,
        type: messageType,
        body,
        media_url: messageType !== 'text' ? mediaUrl : null,
        media_filename: messageType === 'document' ? mediaFilename : null,
      })

      if (res.data.success) {
        setStatusMsg({ type: 'success', text: 'Message sent successfully!' })
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to send message. Please try again.',
      })
    } finally {
      setIsSending(false)
    }
  }

  const applyPreviewPersonalization = (text: string) => {
    return text
      .replace(/\{\{name\}\}/g, contactName)
      .replace(/\{\{phone\}\}/g, contactPhone)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Quick Message</h3>
            <p className="text-xs text-gray-400">Send a quick manual chat to {contactName} ({contactPhone}).</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="flex-1 overflow-y-auto p-6 space-y-4">
          {statusMsg && (
            <div className={`p-3.5 text-sm rounded-xl border ${statusMsg.type === 'success' ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
              {statusMsg.text}
            </div>
          )}

          {/* Instance Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Select Connected Instance
            </label>
            {isLoading ? (
              <div className="text-sm text-gray-400 py-2">Loading active connections...</div>
            ) : instances.length > 0 ? (
              <select
                value={selectedInstanceId}
                onChange={(e) => setSelectedInstanceId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm text-gray-800 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              >
                {instances.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.name} ({ins.phone_number || 'No number'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                No connected WhatsApp numbers found. Connect an instance first in settings.
              </div>
            )}
          </div>

          {/* Message Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Message Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['text', 'image', 'video', 'document'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMessageType(type)}
                  className={`py-2 text-center text-xs font-bold rounded-xl border capitalize transition-all ${messageType === type ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Media URL / Media filename */}
          {messageType !== 'text' && (
            <div className="space-y-3 p-4 bg-gray-50 border border-gray-150 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Media Attachment URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/image.jpg"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-xs text-gray-800 bg-white"
                />
              </div>
              {messageType === 'document' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Document Filename (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Invoice.pdf"
                    value={mediaFilename}
                    onChange={(e) => setMediaFilename(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-xs text-gray-800 bg-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Message Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Message Body
              </label>
              <span className="text-xs text-gray-400">{body.length} characters</span>
            </div>
            <textarea
              rows={4}
              placeholder="Type your message here... Use {{name}} to personalize."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-800 bg-white transition-all resize-none"
            />
            <p className="mt-1 text-xs text-gray-400">Supported templates: {"{{name}}, {{phone}}"}.</p>
          </div>

          {/* Preview Section */}
          <div className="border border-gray-150 rounded-xl bg-gray-50 p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Message Live Preview</h4>
            <div className="p-3 bg-white border border-gray-150 rounded-lg shadow-sm text-sm text-gray-700 min-h-[50px] whitespace-pre-wrap">
              {messageType !== 'text' && mediaUrl && (
                <div className="mb-2 text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded border border-blue-100 font-semibold truncate">
                  📎 {messageType.toUpperCase()}: {mediaUrl}
                </div>
              )}
              {body ? applyPreviewPersonalization(body) : <span className="text-gray-400 italic">Message is empty</span>}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={isSending || !selectedInstanceId}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
          >
            {isSending ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      </div>
    </div>
  )
}
