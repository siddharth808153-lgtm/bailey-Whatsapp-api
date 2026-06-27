import React, { useState, useEffect } from 'react'
import { TagManager } from './TagManager.js'
import { CONTACTS, CONTACT_LISTS, TAGS } from '../../api/endpoints.js'
import { ContactList } from '../../types/index.js'
import axios from 'axios'

interface AddContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [custom1, setCustom1] = useState('')
  const [custom2, setCustom2] = useState('')
  const [custom3, setCustom3] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [selectedLists, setSelectedLists] = useState<number[]>([])
  
  const [lists, setLists] = useState<ContactList[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [showCustomFields, setShowCustomFields] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [addAnother, setAddAnother] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchListsAndTags()
      resetForm()
    }
  }, [isOpen])

  const fetchListsAndTags = async () => {
    try {
      const listsRes = await axios.get(CONTACT_LISTS.LIST)
      if (listsRes.data.success) {
        setLists(listsRes.data.data)
      }
      const tagsRes = await axios.get(TAGS.LIST)
      if (tagsRes.data.success) {
        setAvailableTags(tagsRes.data.data.map((t: any) => t.tag))
      }
    } catch (err) {
      console.error('Failed to load lists/tags', err)
    }
  }

  const resetForm = () => {
    setName('')
    setPhone('')
    setEmail('')
    setCustom1('')
    setCustom2('')
    setCustom3('')
    setTags([])
    setSelectedLists([])
    setErrorMsg('')
  }

  const validatePhone = (num: string) => {
    const cleaned = num.replace(/\D/g, '')
    return cleaned.length >= 10 && cleaned.length <= 13
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!name.trim()) {
      setErrorMsg('Name is required.')
      return
    }

    if (!validatePhone(phone)) {
      setErrorMsg('Invalid phone number. Must be between 10 to 13 digits.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await axios.post(CONTACTS.CREATE, {
        name,
        phone,
        email: email || null,
        custom1: custom1 || null,
        custom2: custom2 || null,
        custom3: custom3 || null,
        tags,
        list_ids: selectedLists,
      })

      if (response.data.success) {
        onSuccess()
        if (addAnother) {
          resetForm()
        } else {
          onClose()
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to save contact. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleListToggle = (listId: number) => {
    setSelectedLists((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">Add New Contact</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Contact Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-800 transition-all bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              WhatsApp Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. 919876543210 (include country code)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-800 transition-all bg-white"
            />
            <p className="mt-1 text-xs text-gray-400">Indian numbers require code prefix 91.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Email Address (Optional)
            </label>
            <input
              type="email"
              placeholder="rahul@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-gray-800 transition-all bg-white"
            />
          </div>

          {/* Collapsible Custom Fields */}
          <div>
            <button
              type="button"
              onClick={() => setShowCustomFields(!showCustomFields)}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              {showCustomFields ? 'Hide' : 'Show'} Custom Fields (for Personalization)
            </button>

            {showCustomFields && (
              <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-150 transition-all">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Custom Field 1
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Company Name"
                    value={custom1}
                    onChange={(e) => setCustom1(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none text-sm text-gray-800 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Custom Field 2
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. City"
                    value={custom2}
                    onChange={(e) => setCustom2(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none text-sm text-gray-800 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Custom Field 3
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Last Order ID"
                    value={custom3}
                    onChange={(e) => setCustom3(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none text-sm text-gray-800 transition-all bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Tags
            </label>
            <TagManager tags={tags} onChange={setTags} suggestions={availableTags} />
          </div>

          {/* Add to Lists */}
          {lists.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Add to Contact Lists
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-150 rounded-xl p-3 space-y-2 bg-gray-50/50">
                {lists.map((list) => (
                  <label key={list.id} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedLists.includes(list.id)}
                      onChange={() => handleListToggle(list.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <span>{list.name} ({list.contact_count})</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="addAnother"
              checked={addAnother}
              onChange={(e) => setAddAnother(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="addAnother" className="text-sm text-gray-600 cursor-pointer">
              Keep open to add another contact
            </label>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-100 transition-all flex items-center gap-1.5"
          >
            {isSubmitting ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  )
}
