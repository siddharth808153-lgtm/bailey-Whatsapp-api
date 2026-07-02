import React, { useState, useEffect, useRef } from 'react'
import { INSTANCES, CONTACT_LISTS, TEMPLATES, CAMPAIGNS } from '../../api/endpoints.js'
import { WhatsappInstance, ContactList, MessageTemplate } from '../../types/index.js'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { MediaSelectorModal } from '../../components/media/MediaSelectorModal.jsx'

export const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(1)

  // Step 1: Recipients
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState('')
  const [recipientSource, setRecipientSource] = useState<'list' | 'custom'>('list')
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [customContactsText, setCustomContactsText] = useState('')
  const [customIsCsv, setCustomIsCsv] = useState(false)
  const [estimateCount, setEstimateCount] = useState(0)

  // Step 2: Message Template
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'document' | 'audio'>('text')
  const [messageBody, setMessageBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaFilename, setMediaFilename] = useState('')
  const [footer, setFooter] = useState('')
  const [buttons, setButtons] = useState<{ text: string }[]>([])
  const [showButtons, setShowButtons] = useState(false)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)

  // Step 3: Settings & Schedule
  const [minDelay, setMinDelay] = useState(5)
  const [maxDelay, setMaxDelay] = useState(15)
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [campaignName, setCampaignName] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchMetadata()
  }, [])

  useEffect(() => {
    if (location.state && (location.state as any).templateId) {
      handleSelectTemplate((location.state as any).templateId)
      setStep(2)
    }
  }, [location.state])

  useEffect(() => {
    calculateRecipientsCount()
  }, [selectedListId, customContactsText, recipientSource, customIsCsv])

  useEffect(() => {
    // Auto generate campaign name
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    if (recipientSource === 'list' && selectedListId) {
      const list = contactLists.find((l) => String(l.id) === selectedListId)
      if (list) {
        setCampaignName(`${list.name} - Broadcast (${dateStr})`)
      }
    } else {
      setCampaignName(`Custom Broadcast (${dateStr})`)
    }
  }, [selectedListId, recipientSource])

  const fetchMetadata = async () => {
    try {
      const insRes = await axios.get(INSTANCES.LIST)
      if (insRes.data.success) {
        setInstances(insRes.data.data)
        const active = insRes.data.data.filter((i: any) => i.status === 'connected')
        if (active.length > 0) {
          setSelectedInstanceId(String(active[0].id))
        }
      }
      const listsRes = await axios.get(CONTACT_LISTS.LIST)
      if (listsRes.data.success) {
        setContactLists(listsRes.data.data)
      }
      const tempRes = await axios.get(TEMPLATES.LIST)
      if (tempRes.data.success) {
        setTemplates(tempRes.data.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const calculateRecipientsCount = () => {
    if (recipientSource === 'list') {
      const list = contactLists.find((l) => String(l.id) === selectedListId)
      setEstimateCount(list ? list.contact_count : 0)
    } else {
      // Parse custom contacts
      const lines = customContactsText.split('\n').filter((l) => l.trim() !== '')
      let validPhones = 0
      lines.forEach((line) => {
        const parts = customIsCsv ? line.split(',') : [line]
        const phoneVal = customIsCsv ? (parts[1] || parts[0]) : parts[0]
        const phone = phoneVal.replace(/\D/g, '')
        if (phone.length >= 10 && phone.length <= 13) {
          validPhones++
        }
      })
      setEstimateCount(validPhones)
    }
  }

  const handleInsertVariable = (variable: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentText = messageBody

    const newText = currentText.substring(0, start) + variable + currentText.substring(end)
    setMessageBody(newText)

    // Reset selection index
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variable.length, start + variable.length)
    }, 0)
  }

  const handleSelectTemplate = async (id: number) => {
    try {
      const res = await axios.get(TEMPLATES.USE(id))
      if (res.data.success) {
        const data = res.data.data
        setMessageType(data.message_type)
        setMessageBody(data.message_body || '')
        setMediaUrl(data.media_url || '')
        setMediaFilename(data.media_filename || '')
        setFooter(data.footer || '')
        if (data.buttons && data.buttons.length > 0) {
          setButtons(data.buttons)
          setShowButtons(true)
        } else {
          setButtons([])
          setShowButtons(false)
        }
        setIsTemplateModalOpen(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleLaunch = async () => {
    setErrorMsg('')
    
    if (!selectedInstanceId) {
      setErrorMsg('A connected WhatsApp connection is required.')
      return
    }

    if (!campaignName.trim()) {
      setErrorMsg('Campaign name is required.')
      return
    }

    setIsSubmitting(true)

    // Build payload
    const payload: Record<string, any> = {
      name: campaignName,
      instance_id: parseInt(selectedInstanceId),
      message_type: messageType,
      message_body: messageType === 'text' ? messageBody : (messageBody || ' '),
      media_url: messageType !== 'text' ? mediaUrl : null,
      media_filename: messageType === 'document' ? mediaFilename : null,
      footer: footer || null,
      buttons: showButtons && buttons.length > 0 ? buttons : null,
      min_delay_seconds: minDelay,
      max_delay_seconds: maxDelay,
      scheduled_at: scheduleType === 'later' && scheduledAt ? scheduledAt : null,
    }

    if (recipientSource === 'list') {
      payload.contact_list_id = parseInt(selectedListId)
    } else {
      const lines = customContactsText.split('\n').filter((l) => l.trim() !== '')
      const customArr: { phone: string; name: string | null }[] = []
      lines.forEach((line) => {
        const parts = customIsCsv ? line.split(',') : [line]
        const nameVal = customIsCsv ? parts[0].trim() : null
        const phoneVal = customIsCsv ? (parts[1] || parts[0]) : parts[0]
        const phone = phoneVal.replace(/\D/g, '')
        if (phone.length >= 10 && phone.length <= 13) {
          customArr.push({ phone, name: nameVal })
        }
      })
      payload.custom_contacts = customArr
    }

    try {
      const res = await axios.post(CAMPAIGNS.CREATE, payload)
      if (res.data.success) {
        navigate(`/campaigns/${res.data.data.id}`)
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to trigger campaign broadcast.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddButton = () => {
    if (buttons.length >= 3) return
    setButtons([...buttons, { text: '' }])
  }

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index))
  }

  const handleButtonTextChange = (index: number, text: string) => {
    setButtons(
      buttons.map((b, i) => (i === index ? { text: text.substring(0, 20) } : b))
    )
  }

  // Visual estimated send time
  const averageDelay = (minDelay + maxDelay) / 2
  const estDurationMinutes = Math.max(1, Math.ceil((estimateCount * averageDelay) / 60))

  return (
    <div className="h-screen bg-gray-50/50 flex flex-col p-6 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 mb-2 shrink-0">
        <button type="button" onClick={() => navigate('/campaigns')}>← Back to Campaigns</button>
      </div>

      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Create Broadcast Campaign</h2>
          <p className="text-xs text-gray-400">Configure parameters, select templates, and send bulk messages.</p>
        </div>
      </div>

      {/* Progress wizard indicator */}
      <div className="flex items-center justify-center border-b border-gray-150 pb-4 mb-6 shrink-0 gap-6 text-sm font-semibold">
        <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <span className="w-5 h-5 flex items-center justify-center rounded-full border text-xs font-bold border-current">1</span>
          <span>Recipients</span>
        </div>
        <div className="w-8 h-[1px] bg-gray-200" />
        <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <span className="w-5 h-5 flex items-center justify-center rounded-full border text-xs font-bold border-current">2</span>
          <span>Message Layout</span>
        </div>
        <div className="w-8 h-[1px] bg-gray-200" />
        <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
          <span className="w-5 h-5 flex items-center justify-center rounded-full border text-xs font-bold border-current">3</span>
          <span>Launch Settings</span>
        </div>
      </div>

      {/* Main setup layout (split side by side on step 2) */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Form area */}
        <div className="flex-1 overflow-y-auto bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
          {errorMsg && (
            <div className="p-3.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: RECIPIENTS */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Select WhatsApp Sender Instance
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {instances.map((ins) => {
                    const isConnected = ins.status === 'connected'
                    return (
                      <label
                        key={ins.id}
                        className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${selectedInstanceId === String(ins.id) ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 hover:bg-gray-50'} ${!isConnected ? 'opacity-55 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="instance"
                            disabled={!isConnected}
                            checked={selectedInstanceId === String(ins.id)}
                            onChange={() => setSelectedInstanceId(String(ins.id))}
                            className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                          />
                          <div>
                            <span className="font-bold text-gray-800 text-sm">{ins.name}</span>
                            <span className="block text-xs text-gray-400 font-semibold">{ins.phone_number || 'Not scanned yet'}</span>
                          </div>
                        </div>

                        {isConnected ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full uppercase">Connected</span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 text-gray-500 rounded-full uppercase">{ins.status}</span>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Audience Sourcing
                </label>
                <div className="flex border border-gray-250 rounded-xl overflow-hidden text-xs font-bold p-1 bg-gray-55/35 mb-4 max-w-xs">
                  <button
                    type="button"
                    onClick={() => setRecipientSource('list')}
                    className={`flex-1 text-center py-2 rounded-lg transition-all ${recipientSource === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    Contact List Group
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientSource('custom')}
                    className={`flex-1 text-center py-2 rounded-lg transition-all ${recipientSource === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    Custom Phone List
                  </button>
                </div>

                {recipientSource === 'list' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Select Contact List Group</label>
                      <select
                        value={selectedListId}
                        onChange={(e) => setSelectedListId(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm bg-white"
                      >
                        <option value="">-- Choose a list --</option>
                        {contactLists.map((l) => (
                          <option key={l.id} value={l.id}>{l.name} ({l.contact_count} contacts)</option>
                        ))}
                      </select>
                    </div>

                    {selectedListId && (
                      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-1">
                        <p className="font-bold">List Preview Summary:</p>
                        <p>• Estimated total target: {estimateCount} recipients.</p>
                        <p className="text-gray-400">• Opted-out (DND) and Invalid numbers will be skipped automatically during delivery.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Paste Phone Numbers</label>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="customCsv"
                          checked={customIsCsv}
                          onChange={(e) => setCustomIsCsv(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5"
                        />
                        <label htmlFor="customCsv" className="text-xs font-bold text-gray-500 cursor-pointer">
                          CSV Format (name, phone per line)
                        </label>
                      </div>
                    </div>
                    <textarea
                      rows={5}
                      placeholder={customIsCsv ? "Rahul Sharma, 919876543210\nVihaan Patel, 919876543211" : "919876543210\n919876543211"}
                      value={customContactsText}
                      onChange={(e) => setCustomContactsText(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-sm bg-white font-mono"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Enter one number/row with country code.</span>
                      <span className="font-bold text-blue-600">{estimateCount} valid phone(s) parsed.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: MESSAGE CONTENT LAYOUT */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Message Layout</span>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-xs"
                >
                  Use Template
                </button>
              </div>

              {/* Message Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Select Media Type
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(['text', 'image', 'video', 'document', 'audio'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMessageType(type)}
                      className={`py-2 border text-center text-xs font-bold rounded-xl capitalize transition-all ${messageType === type ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      {getTypeIcon(type)} {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Media URL / Media filename */}
              {messageType !== 'text' && (
                <div className="space-y-3 p-4 bg-gray-50 border border-gray-150 rounded-xl">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Media Attachment File (Select from File Manager)
                    </label>
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

              {/* Message Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Message Caption / Body
                  </label>
                  <span className="text-xs text-gray-400">{messageBody.length} characters</span>
                </div>
                <textarea
                  ref={textareaRef}
                  rows={6}
                  required={messageType === 'text'}
                  placeholder="Compose message... Personalize using tabs below."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-800 bg-white transition-all resize-none font-sans"
                />

                {/* Personalization variable helpers */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs font-bold text-gray-400 mr-2 py-0.5 flex items-center">Insert Variable:</span>
                  {['{{name}}', '{{phone}}', '{{custom1}}'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertVariable(tag)}
                      className="px-2.5 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded text-xs font-bold text-gray-600 transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Footer */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Footer Text (Optional, WhatsApp Official Style)
                </label>
                <input
                  type="text"
                  maxLength={60}
                  placeholder="e.g. Reply STOP to opt-out"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl outline-none text-sm text-gray-850"
                />
              </div>

              {/* Optional Buttons */}
              <div className="space-y-3 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="showButtons" className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer">
                    Add Quick Reply Buttons
                  </label>
                  <input
                    type="checkbox"
                    id="showButtons"
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
                  <div className="space-y-2 bg-gray-50/50 p-4 border border-gray-150 rounded-xl">
                    {buttons.map((btn, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-gray-400 w-16">Button {index + 1}:</span>
                        <input
                          type="text"
                          required
                          maxLength={20}
                          placeholder="Button label (max 20 chars)"
                          value={btn.text}
                          onChange={(e) => handleButtonTextChange(index, e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveButton(index)}
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
                        className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700"
                      >
                        + Add Button Button
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SETTINGS & SCHEDULE */}
          {step === 3 && (
            <div className="space-y-5">
              
              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Offer Broadcast"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-sm text-gray-800 focus:border-blue-500"
                />
              </div>

              {/* Delay Settings */}
              <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-100 py-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Min Send Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={60}
                    value={minDelay}
                    onChange={(e) => setMinDelay(Math.max(3, parseInt(e.target.value) || 3))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Max Send Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={maxDelay}
                    onChange={(e) => setMaxDelay(Math.max(5, parseInt(e.target.value) || 5))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white"
                  />
                </div>
                <div className="col-span-2 text-xs text-gray-400 bg-gray-50 p-3 rounded-lg">
                  💡 Delay setting randomizes JID sends to decrease account block rates. Suggested setting: 5 - 15 seconds.
                  <span className="block font-bold text-blue-600 mt-1">
                    Estimated sending time for {estimateCount} recipients: ~{estDurationMinutes} minute(s).
                  </span>
                </div>
              </div>

              {/* Schedule options */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Dispatch Schedule
                </label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={scheduleType === 'now'}
                      onChange={() => setScheduleType('now')}
                      className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Send Immediately</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule"
                      checked={scheduleType === 'later'}
                      onChange={() => setScheduleType('later')}
                      className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>Schedule for Later</span>
                  </label>
                </div>

                {scheduleType === 'later' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Choose Datetime (India Local Time)
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white text-gray-700"
                    />
                  </div>
                )}
              </div>

              {/* Review card summary */}
              <div className="p-4 border border-blue-100 bg-blue-50/20 rounded-2xl text-xs text-gray-600 space-y-1.5 shadow-inner">
                <p className="font-bold text-blue-700 uppercase tracking-wide mb-1">Summary Review</p>
                <p>• <b>Recipients Size</b>: {estimateCount} contacts</p>
                <p>• <b>Message Type</b>: {messageType.toUpperCase()}</p>
                <p>• <b>Random delay interval</b>: {minDelay} - {maxDelay} seconds</p>
                <p>• <b>Dispatch Date</b>: {scheduleType === 'now' ? 'Immediate' : scheduledAt || 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 shrink-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!selectedInstanceId || estimateCount === 0)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
              >
                Next Step
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLaunch}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl shadow-md shadow-green-150 transition-all"
              >
                {isSubmitting ? 'Creating campaign...' : 'Launch Broadcast'}
              </button>
            )}
          </div>
        </div>

        {/* STEP 2: WHATSAPP CHAT PREVIEW PANEL (Visible on step 2) */}
        {step === 2 && (
          <aside className="w-80 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col shrink-0">
            {/* Header bar */}
            <div className="bg-emerald-950 p-4 border-b border-emerald-900/60 flex items-center gap-2 shrink-0">
              <span className="text-lg">🤖</span>
              <div>
                <span className="block text-xs font-bold text-white leading-none">WASp Broadcast Preview</span>
                <span className="text-[10px] text-emerald-400 font-semibold mt-0.5 block">Mock Delivery View</span>
              </div>
            </div>

            {/* Chats stream background */}
            <div
              style={{ backgroundColor: '#0b141a' }}
              className="flex-1 p-4 overflow-y-auto space-y-3 font-sans relative"
            >
              {/* WhatsApp message bubble */}
              <div className="max-w-[85%] bg-emerald-900 text-gray-200 rounded-xl p-3 border border-emerald-800 shadow-md text-xs relative ml-auto space-y-1.5">
                
                {/* Media representation */}
                {messageType !== 'text' && mediaUrl && (
                  <div className="bg-emerald-950 rounded border border-emerald-850 p-2 text-center text-emerald-400 font-bold truncate">
                    📎 {messageType.toUpperCase()}
                  </div>
                )}

                {/* Caption / message body */}
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed">
                  {messageBody ? messageBody : <span className="text-gray-500 italic">Message body text...</span>}
                </p>

                {/* Optional Footer text */}
                {footer && (
                  <p className="text-[9px] text-gray-400 border-t border-emerald-800/50 pt-1 mt-1 font-medium">{footer}</p>
                )}

                <span className="block text-[8px] text-gray-400 text-right font-semibold">10:45 AM ✓✓</span>
              </div>

              {/* Render Buttons below bubble as separate cards */}
              {showButtons && buttons.map((btn, idx) => (
                <div
                  key={idx}
                  className="w-[85%] bg-[#1f2c34] border-t border-[#2a3942] hover:bg-[#202c33] text-blue-400 font-bold text-center py-2 rounded-xl text-xs shadow ml-auto select-none mt-1 cursor-pointer transition-colors"
                >
                  {btn.text || `Quick Reply button ${idx + 1}`}
                </div>
              ))}
            </div>
          </aside>
        )}

      </div>

      {/* TEMPLATE PICKER MODAL */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm">Select Message Template</h3>
              <button type="button" onClick={() => setIsTemplateModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/30">
              {templates.length > 0 ? (
                templates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTemplate(t.id)}
                    className="p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 cursor-pointer shadow-sm transition-all flex items-start justify-between"
                  >
                    <div>
                      <p className="font-bold text-gray-800 text-xs">{t.name}</p>
                      <p className="text-[10px] text-gray-400 mt-1 capitalize">• {t.category} • {t.message_type}</p>
                      <p className="text-[11px] text-gray-500 mt-2 line-clamp-2">{t.body}</p>
                    </div>
                    <span className="text-lg">{getTypeIcon(t.message_type)}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-gray-400 py-8">No templates found. Go to templates page to create templates.</div>
              )}
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
