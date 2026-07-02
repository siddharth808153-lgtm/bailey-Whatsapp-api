import React, { useState, useEffect } from 'react'
import { TEMPLATES } from '../../api/endpoints.js'
import { MessageTemplate } from '../../types/index.js'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { MediaSelectorModal } from '../../components/media/MediaSelectorModal.jsx'

export const MessageTemplatesPage: React.FC = () => {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')

  // Create / Edit modal state
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<'promotional' | 'transactional' | 'greeting' | 'follow_up' | 'other'>('promotional')
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'document' | 'audio'>('text')
  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaFilename, setMediaFilename] = useState('')
  const [footer, setFooter] = useState('')
  const [showButtons, setShowButtons] = useState(false)
  const [buttons, setButtons] = useState<{ text: string }[]>([])
  
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [categoryFilter, typeFilter])

  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const params: Record<string, any> = {}
      if (categoryFilter !== 'all') {
        params.category = categoryFilter
      }
      if (typeFilter) {
        params.message_type = typeFilter
      }
      if (search.trim()) {
        params.search = search
      }

      const res = await axios.get(TEMPLATES.LIST, { params })
      if (res.data.success) {
        setTemplates(res.data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      fetchTemplates()
    }
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setName('')
    setCategory('promotional')
    setMessageType('text')
    setBody('')
    setMediaUrl('')
    setMediaFilename('')
    setFooter('')
    setShowButtons(false)
    setButtons([])
    setErrorMsg('')
    setIsOpen(true)
  }

  const handleOpenEdit = (t: MessageTemplate) => {
    setEditingId(t.id)
    setName(t.name)
    setCategory(t.category)
    setMessageType(t.message_type)
    setBody(t.body)
    setMediaUrl(t.media_url || '')
    setMediaFilename(t.media_filename || '')
    setFooter(t.footer || '')
    if (t.buttons && t.buttons.length > 0) {
      setButtons(t.buttons)
      setShowButtons(true)
    } else {
      setButtons([])
      setShowButtons(false)
    }
    setErrorMsg('')
    setIsOpen(true)
  }

  const handleDelete = async (id: number, templateName: string) => {
    if (!confirm(`Are you sure you want to delete template "${templateName}"?`)) return
    try {
      const res = await axios.delete(TEMPLATES.DELETE(id))
      if (res.data.success) {
        fetchTemplates()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!name.trim()) {
      setErrorMsg('Template name is required.')
      return
    }

    if (!body.trim()) {
      setErrorMsg('Template body text is required.')
      return
    }

    setIsSubmitting(true)

    const payload = {
      name,
      category,
      message_type: messageType,
      body,
      media_url: messageType !== 'text' ? mediaUrl : null,
      media_filename: messageType === 'document' ? mediaFilename : null,
      footer: footer || null,
      buttons: showButtons && buttons.length > 0 ? buttons : null,
    }

    try {
      let res
      if (editingId) {
        res = await axios.put(TEMPLATES.UPDATE(editingId), payload)
      } else {
        res = await axios.post(TEMPLATES.CREATE, payload)
      }

      if (res.data.success) {
        setIsOpen(false)
        fetchTemplates()
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save template.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUseInCampaign = (id: number) => {
    navigate('/campaigns/new', { state: { templateId: id } })
  }

  const handleAddButton = () => {
    if (buttons.length >= 3) return
    setButtons([...buttons, { text: '' }])
  }

  const handleRemoveButton = (idx: number) => {
    setButtons(buttons.filter((_, i) => i !== idx))
  }

  const handleButtonTextChange = (idx: number, val: string) => {
    setButtons(
      buttons.map((b, i) => (i === idx ? { text: val.substring(0, 20) } : b))
    )
  }

  const getCategoryBadge = (cat: string) => {
    const base = 'px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase '
    switch (cat) {
      case 'promotional': return <span className={`${base} bg-red-100 text-red-700`}>Promotional</span>
      case 'transactional': return <span className={`${base} bg-green-100 text-green-700`}>Transactional</span>
      case 'greeting': return <span className={`${base} bg-blue-100 text-blue-700`}>Greeting</span>
      case 'follow_up': return <span className={`${base} bg-yellow-100 text-yellow-700`}>Follow Up</span>
      default: return <span className={`${base} bg-gray-100 text-gray-700`}>Other</span>
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝'
      case 'image': return '🖼️'
      case 'video': return '🎥'
      case 'document': return '📄'
      case 'audio': return '🎵'
      default: return '✉️'
    }
  }

  return (
    <div className="h-screen bg-gray-50/50 overflow-y-auto p-6 flex flex-col font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Message Templates</h2>
          <p className="text-xs text-gray-400">Save and load pre-formatted layouts to send campaigns instantly.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-100 transition-all"
        >
          New Template
        </button>
      </div>

      {/* Filter Tabs */}
      <section className="bg-white border border-gray-150 rounded-2xl p-4 mb-5 shadow-sm shrink-0 space-y-3.5">
        <div className="flex flex-wrap border-b border-gray-100 pb-2.5 gap-1.5 text-xs font-bold text-gray-500">
          {['all', 'promotional', 'transactional', 'greeting', 'follow_up', 'other'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => { setCategoryFilter(cat); }}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${categoryFilter === cat ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search templates by name... (Press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="px-3.5 py-1.5 border border-gray-200 rounded-xl outline-none text-xs bg-white min-w-[200px]"
          />

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl outline-none text-xs bg-white text-gray-600"
          >
            <option value="">-- All Types --</option>
            <option value="text">Text Only</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </section>

      {/* Grid List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <span className="animate-spin text-xl text-blue-500">⏳</span>
        </div>
      ) : templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
          {templates.map((t) => (
            <div key={t.id} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-48">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-bold text-gray-800 text-sm truncate">{t.name}</h4>
                  {getCategoryBadge(t.category)}
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mt-1.5">
                  Type: {t.message_type.toUpperCase()} {getTypeIcon(t.message_type)}
                </p>
                <p className="text-xs text-gray-500 mt-2 line-clamp-2 h-8">{t.body}</p>
                {t.buttons && t.buttons.length > 0 && (
                  <span className="inline-block text-[9px] bg-blue-50 border border-blue-100 text-blue-600 rounded px-1.5 py-0.5 mt-2 font-bold uppercase">
                    Interactive buttons ({t.buttons.length})
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                <button
                  type="button"
                  onClick={() => handleUseInCampaign(t.id)}
                  className="px-3 py-1 bg-green-50 border border-green-150 text-green-700 font-bold rounded-lg text-[10px] hover:bg-green-100"
                >
                  Use in Campaign
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(t)}
                    className="text-xs font-bold text-gray-500 hover:text-blue-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id, t.name)}
                    className="text-xs font-bold text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-2xl text-center shadow-sm">
          <span className="text-4xl mb-2.5">📝</span>
          <p className="text-sm font-bold text-gray-700 mb-1">No templates found</p>
          <p className="text-xs text-gray-400">Save layout options to broadcast quick messages.</p>
        </div>
      )}

      {/* CREATE / EDIT TEMPLATE MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-hidden">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm">{editingId ? 'Edit Message Template' : 'Create Message Template'}</h3>
              <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>

            {/* Split layout body */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              
              {/* Form panel */}
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 text-xs text-red-650 bg-red-50 border border-red-200 rounded-lg">
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Template Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Greeting Template"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-xs bg-white text-gray-700"
                    >
                      <option value="promotional">Promotional</option>
                      <option value="transactional">Transactional</option>
                      <option value="greeting">Greeting</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Media Type</label>
                  <div className="flex gap-2">
                    {(['text', 'image', 'video', 'document', 'audio'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMessageType(type)}
                        className={`px-3 py-1.5 border rounded-lg text-xs font-semibold capitalize transition-all ${messageType === type ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {messageType !== 'text' && (
                  <div className="p-4 bg-gray-55/35 border border-gray-150 rounded-xl space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Attachment media File (Select from File Manager)</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          required
                          placeholder="Click Select to choose from File Manager..."
                          value={mediaUrl ? `${mediaFilename || 'File'} (${mediaUrl})` : ''}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg outline-none text-xs text-gray-500 bg-gray-100 cursor-not-allowed"
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
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Body Text Content</label>
                  <textarea
                    rows={4}
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type message text... Use {{name}}, {{phone}}, {{custom1}} for variable replacements."
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl outline-none text-xs bg-white font-sans resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Footer Text (Optional)</label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Reply STOP to unsubscribe"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-xs bg-white"
                  />
                </div>

                {/* Buttons option */}
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="modalShowButtons" className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer">
                      Quick Reply Buttons
                    </label>
                    <input
                      type="checkbox"
                      id="modalShowButtons"
                      checked={showButtons}
                      onChange={(e) => {
                        setShowButtons(e.target.checked)
                        if (e.target.checked && buttons.length === 0) {
                          setButtons([{ text: '' }])
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5"
                    />
                  </div>

                  {showButtons && (
                    <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-150">
                      {buttons.map((btn, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 w-16">Button {idx + 1}:</span>
                          <input
                            type="text"
                            required
                            maxLength={20}
                            placeholder="Text (max 20 chars)"
                            value={btn.text}
                            onChange={(e) => handleButtonTextChange(idx, e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveButton(idx)}
                            className="text-red-500 font-bold hover:bg-red-50 p-1 rounded"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      {buttons.length < 3 && (
                        <button
                          type="button"
                          onClick={handleAddButton}
                          className="text-xs font-bold text-blue-600"
                        >
                          + Add button
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </form>

              {/* Live Preview Side panel */}
              <aside className="w-72 bg-gray-900 border-l border-gray-800 p-4 space-y-4 shrink-0 flex flex-col justify-between overflow-y-auto">
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-800 pb-2 mb-4">Live Layout Preview</h4>
                  
                  {/* WhatsApp bubble */}
                  <div className="bg-[#0b141a] p-3 rounded-2xl space-y-3">
                    <div className="bg-[#005c4b] text-gray-200 rounded-xl p-3 border border-[#025143] text-xs relative ml-auto space-y-1.5 shadow">
                      {messageType !== 'text' && mediaUrl && (
                        <div className="bg-[#025143] rounded border border-[#053d33] p-2 text-center text-emerald-300 font-bold truncate">
                          📎 {messageType.toUpperCase()}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-[11px] leading-relaxed">
                        {body || <span className="text-gray-500 italic">Body message text...</span>}
                      </p>
                      {footer && (
                        <p className="text-[9px] text-gray-400 border-t border-[#025143] pt-1 mt-1 font-semibold">{footer}</p>
                      )}
                      <span className="block text-[8px] text-gray-400 text-right mt-1">12:00 PM ✓✓</span>
                    </div>

                    {showButtons && buttons.map((btn, idx) => (
                      <div
                        key={idx}
                        className="bg-[#1f2c34] border-t border-[#2a3942] text-blue-400 font-bold text-center py-2 rounded-xl text-xs shadow select-none"
                      >
                        {btn.text || `Button ${idx + 1}`}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3.5 py-2 border border-gray-800 hover:bg-gray-800 text-gray-400 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </aside>

            </div>
          </div>
        </div>
      )}
      {/* MEDIA SELECTOR MODAL */}
      <MediaSelectorModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(url, name) => {
          setMediaUrl(url)
          setMediaFilename(name)
          setIsMediaModalOpen(false)
        }}
      />

    </div>
  )
}
