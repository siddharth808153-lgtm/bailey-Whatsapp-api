import React, { useState, useEffect } from 'react'
import { DripStep } from '../../types/index.js'
import { MediaSelectorModal } from '../media/MediaSelectorModal.jsx'

interface StepEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<DripStep>) => void
  step: DripStep | null
}

export const StepEditorModal: React.FC<StepEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  step
}) => {
  const [name, setName] = useState('')
  const [waitDays, setWaitDays] = useState(1)
  const [waitHours, setWaitHours] = useState(0)
  const [sendTime, setSendTime] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'document'>('text')
  const [messageBody, setMessageBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)

  useEffect(() => {
    if (step) {
      setName(step.name || '')
      setWaitDays(step.wait_days)
      setWaitHours(step.wait_hours)
      setSendTime(step.send_time || '')
      setMessageType(step.message_type)
      setMessageBody(step.message_body || '')
      setMediaUrl(step.media_url || '')
    } else {
      setName('')
      setWaitDays(1)
      setWaitHours(0)
      setSendTime('')
      setMessageType('text')
      setMessageBody('')
      setMediaUrl('')
    }
  }, [step, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      wait_days: Number(waitDays),
      wait_hours: Number(waitHours),
      send_time: sendTime || undefined,
      message_type: messageType,
      message_body: messageBody,
      media_url: mediaUrl || undefined
    })
  }

  const insertVariable = (variable: string) => {
    setMessageBody(prev => prev + ` ${variable}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row h-[90vh] md:h-auto">
        
        {/* Left Side — Form Config */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 md:p-8 space-y-5 overflow-y-auto">
          <div>
            <h2 className="text-xl font-black text-gray-950 tracking-tight">
              {step ? 'Edit Drip Step' : 'Add Drip Step'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure when and what this campaign step sends.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Step Title</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Welcome onboard"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Preferred Send Time (Optional)</label>
              <input
                type="time"
                value={sendTime}
                onChange={e => setSendTime(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Wait Days</label>
              <input
                type="number"
                min="0"
                max="365"
                value={waitDays}
                onChange={e => setWaitDays(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Wait Hours</label>
              <input
                type="number"
                min="0"
                max="23"
                value={waitHours}
                onChange={e => setWaitHours(Number(e.target.value))}
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

           {/* Media URL Input */}
          {messageType !== 'text' && (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Media Attachment File (Select from File Manager)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  required
                  placeholder="Click Select to choose from File Manager..."
                  value={mediaUrl ? mediaUrl : ''}
                  className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm outline-none text-gray-500 cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-colors shrink-0"
                >
                  Select File
                </button>
              </div>
            </div>
          )}

          {/* Message Body */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Message Text</label>
              <div className="flex gap-1">
                {['{{name}}', '{{phone}}', '{{custom1}}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={4}
              value={messageBody}
              onChange={e => setMessageBody(e.target.value)}
              placeholder="Hi {{name}}, welcome to our workspace..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-colors"
            >
              Save Step
            </button>
          </div>

        </form>

        {/* Right Side — Live WhatsApp Preview */}
        <div className="w-full md:w-[320px] bg-gray-900 border-l border-gray-800 p-6 flex flex-col justify-between shrink-0">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-6 text-center">Live Preview</p>
            <div className="bg-[#efeae2] rounded-3xl p-4 min-h-[300px] border border-gray-950 flex flex-col justify-end space-y-4">
              <div className="self-start max-w-[85%] bg-white rounded-2xl rounded-tl-none p-3 shadow-sm relative text-xs text-gray-800 space-y-2 border border-gray-100">
                {messageType !== 'text' && mediaUrl && (
                  <div className="w-full h-24 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">{messageType} Attached</span>
                  </div>
                )}
                <p className="whitespace-pre-line leading-relaxed">
                  {messageBody || 'Start typing message body on the left to see live preview...'}
                </p>
                <span className="text-[9px] text-gray-400 float-right mt-1">10:00 AM</span>
              </div>
            </div>
          </div>
          <div className="text-center text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-4">
            WASp Mock Client
          </div>
        </div>

      </div>

      <MediaSelectorModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(url, name) => {
          setMediaUrl(url)
          setIsMediaModalOpen(false)
        }}
      />
    </div>
  )
}
