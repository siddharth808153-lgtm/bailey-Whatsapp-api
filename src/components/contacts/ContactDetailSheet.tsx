import React, { useState, useEffect } from 'react'
import { CONTACTS, TAGS } from '../../api/endpoints.js'
import { Contact } from '../../types/index.js'
import { TagManager, getTagStyles } from './TagManager.js'
import { QuickSendModal } from './QuickSendModal.js'
import axios from 'axios'

interface ContactDetailSheetProps {
  contactId: number | null
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}

export const ContactDetailSheet: React.FC<ContactDetailSheetProps> = ({
  contactId,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [contact, setContact] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'drip'>('info')
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCustom1, setEditCustom1] = useState('')
  const [isQuickSendOpen, setIsQuickSendOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && contactId) {
      fetchContactDetail()
      fetchAvailableTags()
      setIsEditing(false)
      setActiveTab('info')
    } else {
      setContact(null)
    }
  }, [isOpen, contactId])

  const fetchContactDetail = async () => {
    if (!contactId) return
    setIsLoading(true)
    try {
      const res = await axios.get(CONTACTS.DETAIL(contactId))
      if (res.data.success) {
        setContact(res.data.data)
        setEditName(res.data.data.name)
        setEditEmail(res.data.data.email || '')
        setEditCustom1(res.data.data.custom1 || '')
      }
    } catch (err) {
      console.error('Failed to load contact details', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAvailableTags = async () => {
    try {
      const res = await axios.get(TAGS.LIST)
      if (res.data.success) {
        setAvailableTags(res.data.data.map((t: any) => t.tag))
      }
    } catch (err) {
      console.error('Failed to load tags', err)
    }
  }

  const handleTagsChange = async (newTags: string[]) => {
    if (!contact) return
    try {
      const res = await axios.put(CONTACTS.UPDATE(contact.id), { tags: newTags })
      if (res.data.success) {
        setContact((prev: any) => ({ ...prev, tags: newTags }))
        onUpdated()
      }
    } catch (err) {
      console.error('Failed to update tags', err)
    }
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact) return
    try {
      const res = await axios.put(CONTACTS.UPDATE(contact.id), {
        name: editName,
        email: editEmail || null,
        custom1: editCustom1 || null,
      })
      if (res.data.success) {
        setContact((prev: any) => ({
          ...prev,
          name: editName,
          email: editEmail,
          custom1: editCustom1,
        }))
        setIsEditing(false)
        onUpdated()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save changes.')
    }
  }

  const handleOptToggle = async () => {
    if (!contact) return
    const endpoint = contact.is_opted_out
      ? CONTACTS.OPT_IN(contact.id)
      : CONTACTS.OPT_OUT(contact.id)
    try {
      const res = await axios.post(endpoint)
      if (res.data.success) {
        setContact((prev: any) => ({
          ...prev,
          is_opted_out: !prev.is_opted_out,
        }))
        onUpdated()
      }
    } catch (err) {
      console.error('Failed to update Opt Out status', err)
    }
  }

  const handleDelete = async () => {
    if (!contact) return
    if (!confirm('Are you sure you want to delete this contact?')) return
    try {
      const res = await axios.delete(CONTACTS.DELETE(contact.id))
      if (res.data.success) {
        onUpdated()
        onClose()
      }
    } catch (err) {
      console.error('Failed to delete contact', err)
    }
  }

  const removeDripEnrollment = async (enrollmentId: number) => {
    if (!confirm('Are you sure you want to remove this contact from this drip sequence?')) return
    try {
      // Stub endpoint for Part 7, normally: DELETE /api/drip/enrollments/{id}
      await axios.delete(`/drip/enrollments/${enrollmentId}`)
      fetchContactDetail()
    } catch (err) {
      console.error('Failed to remove drip enrollment', err)
    }
  }

  // Helper to color initials avatar by name hash
  const getAvatarBg = (name: string) => {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash) % 360
    return `hsl(${hue}, 60%, 45%)`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-45 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Slide-out Sheet Panel */}
      <div className="relative w-full max-w-[500px] h-full bg-white shadow-2xl flex flex-col z-50 animate-slide-in">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="animate-spin text-2xl text-blue-500">⏳</span>
          </div>
        ) : contact ? (
          <>
            {/* Sheet Header */}
            <div className="p-6 border-b border-gray-100 flex items-start gap-4">
              <div
                style={{ backgroundColor: getAvatarBg(contact.name) }}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-inner"
              >
                {contact.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 truncate">{contact.name}</h3>
                <p className="text-sm text-gray-500 font-semibold mb-1.5">{contact.phone}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {contact.is_opted_out ? (
                    <span className="px-2 py-0.5 text-xs font-bold bg-red-150 text-red-700 rounded-full">DND</span>
                  ) : contact.is_invalid ? (
                    <span className="px-2 py-0.5 text-xs font-bold bg-orange-150 text-orange-700 rounded-full">Invalid</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-bold bg-green-150 text-green-700 rounded-full">Active</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-gray-500 hover:text-blue-600 px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-lg hover:border-blue-200 transition-all bg-white"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 font-bold text-lg"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 text-sm font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex-1 text-center py-3 border-b-2 transition-all ${activeTab === 'info' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Information
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`flex-1 text-center py-3 border-b-2 transition-all ${activeTab === 'activity' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Activity Log
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('drip')}
                className={`flex-1 text-center py-3 border-b-2 transition-all ${activeTab === 'drip' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
              >
                Drips & Warmup
              </button>
            </div>

            {/* Sheet Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* INFO TAB */}
              {activeTab === 'info' && (
                <div className="space-y-5">
                  {isEditing ? (
                    <form onSubmit={handleSaveInfo} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Name</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm text-gray-800 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm text-gray-800 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Custom Field 1</label>
                        <input
                          type="text"
                          value={editCustom1}
                          onChange={(e) => setEditCustom1(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none text-sm text-gray-800 focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-md"
                      >
                        Save Changes
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">WhatsApp Link</span>
                        <a
                          href={`https://wa.me/${contact.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-bold"
                        >
                          wa.me/{contact.phone} ↗
                        </a>
                      </div>

                      {contact.email && (
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</span>
                          <span className="text-sm text-gray-700">{contact.email}</span>
                        </div>
                      )}

                      {contact.custom1 && (
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Custom Field 1</span>
                          <span className="text-sm text-gray-700">{contact.custom1}</span>
                        </div>
                      )}

                      <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tags (Click tags block to edit)</span>
                        <TagManager
                          tags={contact.tags || []}
                          onChange={handleTagsChange}
                          suggestions={availableTags}
                        />
                      </div>

                      {contact.lists && contact.lists.length > 0 && (
                        <div>
                          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Member of Contact Lists</span>
                          <div className="flex flex-wrap gap-1.5">
                            {contact.lists.map((list: any) => (
                              <span key={list.id} className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600">
                                {list.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Created At</span>
                        <span className="text-sm text-gray-500">{new Date(contact.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVITY LOG TAB */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Last Messaged</span>
                    <span className="text-sm text-gray-700">{contact.last_messaged_at ? new Date(contact.last_messaged_at).toLocaleString() : 'Never'}</span>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-sm font-bold text-gray-800 mb-3">Recent 5 Campaign Messages</h4>
                    {contact.recent_messages && contact.recent_messages.length > 0 ? (
                      <div className="space-y-3">
                        {contact.recent_messages.map((msg: any) => (
                          <div key={msg.id} className="p-3 bg-gray-50 rounded-xl border border-gray-150 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-gray-800">{msg.campaign?.name || 'Campaign'}</p>
                              <p className="text-gray-400">{new Date(msg.created_at).toLocaleString()}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full font-semibold ${msg.status === 'delivered' || msg.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {msg.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No recent messages sent.</p>
                    )}
                  </div>
                </div>
              )}

              {/* DRIPS & WARMUP TAB */}
              {activeTab === 'drip' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-3">Active Drip Enrollments</h4>
                  {contact.drip_enrollments && contact.drip_enrollments.length > 0 ? (
                    <div className="space-y-3">
                      {contact.drip_enrollments.map((enr: any) => (
                        <div key={enr.id} className="p-4 bg-gray-50 rounded-xl border border-gray-150 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-gray-800">{enr.drip_sequence?.name || 'Drip Sequence'}</p>
                            <p className="text-xs text-gray-400 mt-1">Current Step: {enr.current_step}</p>
                            <p className="text-xs text-gray-400">Next Scheduled Send: {enr.next_message_at ? new Date(enr.next_message_at).toLocaleString() : 'N/A'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDripEnrollment(enr.id)}
                            className="px-2.5 py-1 border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No active drip sequences enrolled.</p>
                  )}
                </div>
              )}
            </div>

            {/* Sheet Footer Quick Actions */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsQuickSendOpen(true)}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-100 transition-all text-center"
                >
                  Send Message
                </button>
                <button
                  type="button"
                  onClick={handleOptToggle}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${contact.is_opted_out ? 'border-green-200 text-green-700 bg-green-50/30 hover:bg-green-50' : 'border-red-200 text-red-700 bg-red-50/30 hover:bg-red-50'}`}
                >
                  {contact.is_opted_out ? 'Opt In to Chat' : 'Opt Out (DND)'}
                </button>
              </div>
              
              <button
                type="button"
                onClick={handleDelete}
                className="w-full py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-all text-center"
              >
                Delete Contact
              </button>
            </div>
          </>
        ) : null}
      </div>

      {contact && (
        <QuickSendModal
          isOpen={isQuickSendOpen}
          onClose={() => setIsQuickSendOpen(false)}
          contactName={contact.name}
          contactPhone={contact.phone}
        />
      )}
    </div>
  )
}
