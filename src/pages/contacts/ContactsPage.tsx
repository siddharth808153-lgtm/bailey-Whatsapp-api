import React, { useState, useEffect } from 'react'
import { CONTACTS, CONTACT_LISTS, TAGS, INSTANCES } from '../../api/endpoints.js'
import { Contact, ContactList, Tag, WhatsappInstance } from '../../types/index.js'
import { ContactDetailSheet } from '../../components/contacts/ContactDetailSheet.js'
import { AddContactModal } from '../../components/contacts/AddContactModal.js'
import { ImportContactsModal } from '../../components/contacts/ImportContactsModal.js'
import { getTagStyles } from '../../components/contacts/TagManager.js'
import axios from 'axios'

export const ContactsPage: React.FC = () => {
  // Lists and Tags
  const [lists, setLists] = useState<ContactList[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [selectedListId, setSelectedListId] = useState<string | 'all' | 'opted_out' | 'invalid'>('all')

  // Contacts Datatable State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  const [metaStats, setMetaStats] = useState({ total_contacts: 0, opted_out_count: 0, invalid_count: 0 })
  const [isLoading, setIsLoading] = useState(false)

  // Selection
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])

  // Modal / Sheets visibility
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isCreatingList, setIsCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')

  // Bulk actions dropdown state
  const [showBulkTagMenu, setShowBulkTagMenu] = useState(false)
  const [bulkTagInput, setBulkTagInput] = useState('')
  const [checkNumInstanceId, setCheckNumInstanceId] = useState('')
  const [isCheckingNumbers, setIsCheckingNumbers] = useState(false)

  useEffect(() => {
    fetchListsAndTags()
    fetchInstances()
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [page, selectedListId, selectedTag])

  const fetchListsAndTags = async () => {
    try {
      const listsRes = await axios.get(CONTACT_LISTS.LIST)
      if (listsRes.data.success) {
        setLists(listsRes.data.data)
      }
      const tagsRes = await axios.get(TAGS.LIST)
      if (tagsRes.data.success) {
        setTags(tagsRes.data.data)
      }
    } catch (err) {
      console.error('Failed to load filters metadata', err)
    }
  }

  const fetchInstances = async () => {
    try {
      const res = await axios.get(INSTANCES.LIST)
      if (res.data.success) {
        setInstances(res.data.data.filter((ins: any) => ins.status === 'connected'))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchContacts = async () => {
    setIsLoading(true)
    setSelectedContactIds([])
    try {
      const params: Record<string, any> = { page }

      if (search.trim()) {
        params.search = search
      }
      if (selectedTag) {
        params.tag = selectedTag
      }

      if (selectedListId === 'opted_out') {
        params.is_opted_out = true
      } else if (selectedListId === 'invalid') {
        params.is_invalid = true
      } else if (selectedListId !== 'all') {
        params.list_id = selectedListId
      }

      const res = await axios.get(CONTACTS.LIST, { params })
      if (res.data.success) {
        setContacts(res.data.data)
        setTotalPages(res.data.meta.last_page)
        setTotalContacts(res.data.meta.total)
        setMetaStats({
          total_contacts: res.data.meta.total_contacts,
          opted_out_count: res.data.meta.opted_out_count,
          invalid_count: res.data.meta.invalid_count,
        })
      }
    } catch (err) {
      console.error('Failed to fetch contacts list', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1)
      fetchContacts()
    }
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return
    try {
      const res = await axios.post(CONTACT_LISTS.CREATE, { name: newListName })
      if (res.data.success) {
        setNewListName('')
        setIsCreatingList(false)
        fetchListsAndTags()
      }
    } catch (err) {
      console.error('Failed to create list', err)
    }
  }

  const handleDeleteList = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the list "${name}"? Contacts in the list will not be deleted.`)) return
    try {
      const res = await axios.delete(CONTACT_LISTS.DELETE(id))
      if (res.data.success) {
        if (selectedListId === String(id)) {
          setSelectedListId('all')
        }
        fetchListsAndTags()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete list.')
    }
  }

  // Row selection
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedContactIds(contacts.map((c) => c.id))
    } else {
      setSelectedContactIds([])
    }
  }

  const handleSelectContact = (id: number) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Bulk Actions
  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedContactIds.length} selected contacts?`)) return
    try {
      const res = await axios.post(CONTACTS.BULK_DELETE, { ids: selectedContactIds })
      if (res.data.success) {
        fetchContacts()
        fetchListsAndTags()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleBulkOptOut = async () => {
    try {
      const res = await axios.post(CONTACTS.BULK_OPT_OUT, { ids: selectedContactIds })
      if (res.data.success) {
        fetchContacts()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleBulkTagAdd = async () => {
    if (!bulkTagInput.trim()) return
    try {
      const res = await axios.post(TAGS.BULK_TAG, {
        contact_ids: selectedContactIds,
        tags: [bulkTagInput.trim()],
        action: 'add',
      })
      if (res.data.success) {
        setBulkTagInput('')
        setShowBulkTagMenu(false)
        fetchContacts()
        fetchListsAndTags()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCheckNumbers = async () => {
    if (!checkNumInstanceId) {
      alert('Please select an active WhatsApp connection.')
      return
    }
    setIsCheckingNumbers(true)
    try {
      const res = await axios.post(CONTACTS.CHECK_NUMBERS, {
        instance_id: parseInt(checkNumInstanceId),
        contact_ids: selectedContactIds,
      })
      if (res.data.success) {
        alert(`Verification completed: ${res.data.data.valid} Valid, ${res.data.data.invalid} Invalid numbers checked.`)
        fetchContacts()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Verification session failed.')
    } finally {
      setIsCheckingNumbers(false)
    }
  }

  const handleExport = () => {
    // Redirects to raw download route
    let exportUrl = `${axios.defaults.baseURL || ''}/api/contacts/export?`
    if (search.trim()) exportUrl += `search=${search}&`
    if (selectedTag) exportUrl += `tag=${selectedTag}&`
    if (selectedListId === 'opted_out') exportUrl += `is_opted_out=true&`
    else if (selectedListId === 'invalid') exportUrl += `is_invalid=true&`
    else if (selectedListId !== 'all') exportUrl += `list_id=${selectedListId}&`

    window.open(exportUrl, '_blank')
  }

  return (
    <div className="flex h-screen bg-gray-50/50 overflow-hidden">
      
      {/* LEFT SIDEBAR: Contact Lists Filters */}
      <aside className="w-64 border-r border-gray-150 bg-white flex flex-col h-full shrink-0">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <span className="font-bold text-gray-800 tracking-tight text-sm uppercase">Contact Lists</span>
          <button
            type="button"
            onClick={() => setIsCreatingList(true)}
            className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors font-bold text-lg"
          >
            +
          </button>
        </div>

        {/* Add list form inline */}
        {isCreatingList && (
          <form onSubmit={handleCreateList} className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center gap-2">
            <input
              type="text"
              required
              placeholder="List name..."
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none focus:border-blue-500"
            />
            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg">Save</button>
            <button type="button" onClick={() => setIsCreatingList(false)} className="text-gray-400 text-lg">&times;</button>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <button
            type="button"
            onClick={() => { setSelectedListId('all'); setPage(1); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all ${selectedListId === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            <span>All Contacts</span>
            <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500">{metaStats.total_contacts}</span>
          </button>

          {/* Contact Lists lists */}
          <div className="py-2 space-y-1 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase px-3 tracking-wider mb-1">Custom Lists</p>
            {lists.map((list) => (
              <div key={list.id} className="group flex items-center justify-between rounded-xl hover:bg-gray-50 pr-2">
                <button
                  type="button"
                  onClick={() => { setSelectedListId(String(list.id)); setPage(1); }}
                  className={`flex-1 text-left px-3 py-2 text-sm font-semibold rounded-l-xl truncate ${selectedListId === String(list.id) ? 'text-blue-600 font-bold' : 'text-gray-600'}`}
                >
                  {list.name}
                </button>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="bg-gray-100 px-2 py-0.5 rounded-full text-xs font-bold text-gray-500">{list.contact_count}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteList(list.id, list.name)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs font-bold p-1 rounded hover:bg-red-50 transition-all"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="py-2 space-y-1 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase px-3 tracking-wider mb-1">Filters</p>
            <button
              type="button"
              onClick={() => { setSelectedListId('opted_out'); setPage(1); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all ${selectedListId === 'opted_out' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span>Opted Out (DND)</span>
              <span className="bg-red-100/55 px-2 py-0.5 rounded-full text-xs font-bold text-red-700">{metaStats.opted_out_count}</span>
            </button>
            <button
              type="button"
              onClick={() => { setSelectedListId('invalid'); setPage(1); }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all ${selectedListId === 'invalid' ? 'bg-orange-50 text-orange-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <span>Invalid Numbers</span>
              <span className="bg-orange-100/55 px-2 py-0.5 rounded-full text-xs font-bold text-orange-700">{metaStats.invalid_count}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden p-6">
        
        {/* Header Stats Row */}
        <section className="grid grid-cols-3 gap-5 mb-6 shrink-0">
          <div className="p-5 bg-white border border-gray-150 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg">👥</div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Total Contacts</span>
              <span className="text-xl font-extrabold text-gray-800">{metaStats.total_contacts}</span>
            </div>
          </div>
          <div className="p-5 bg-white border border-gray-150 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-lg">📴</div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Opted Out (DND)</span>
              <span className="text-xl font-extrabold text-gray-800">{metaStats.opted_out_count}</span>
            </div>
          </div>
          <div className="p-5 bg-white border border-gray-150 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center text-lg">⚠️</div>
            <div>
              <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Invalid Numbers</span>
              <span className="text-xl font-extrabold text-gray-800">{metaStats.invalid_count}</span>
            </div>
          </div>
        </section>

        {/* Toolbar & Filters */}
        <section className="bg-white border border-gray-150 rounded-2xl p-4 mb-4 shadow-sm shrink-0 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <input
                type="text"
                placeholder="Search name or phone... (Press Enter)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm bg-white"
              />

              <select
                value={selectedTag}
                onChange={(e) => { setSelectedTag(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white text-gray-700"
              >
                <option value="">-- Filter by Tag --</option>
                {tags.map((t, idx) => (
                  <option key={idx} value={t.tag}>
                    {t.tag} ({t.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-green-100"
              >
                Import CSV
              </button>
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-100"
              >
                Add Contact
              </button>
            </div>
          </div>

          {/* Bulk Actions panel (collapsible, displays when items selected) */}
          {selectedContactIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-blue-50/50 border border-blue-100 rounded-xl transition-all animate-fade-in text-sm">
              <span className="font-semibold text-blue-700">{selectedContactIds.length} contact(s) selected</span>
              
              <div className="flex items-center gap-3">
                
                {/* Bulk Tag button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowBulkTagMenu(!showBulkTagMenu)}
                    className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 font-semibold rounded-lg text-xs hover:bg-blue-50 transition-all"
                  >
                    Tag Selected
                  </button>
                  {showBulkTagMenu && (
                    <div className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg p-2.5 z-40 flex gap-2">
                      <input
                        type="text"
                        placeholder="Tag name"
                        value={bulkTagInput}
                        onChange={(e) => setBulkTagInput(e.target.value)}
                        className="flex-1 px-2.5 py-1 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleBulkTagAdd}
                        className="bg-blue-600 text-white text-[10px] font-bold px-2.5 rounded-lg"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Batch verify numbers */}
                {instances.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      value={checkNumInstanceId}
                      onChange={(e) => setCheckNumInstanceId(e.target.value)}
                      className="px-2 py-1.5 border border-blue-200 text-blue-700 rounded-lg text-xs bg-white"
                    >
                      <option value="">-- Verify JID Instance --</option>
                      {instances.map((ins) => (
                        <option key={ins.id} value={ins.id}>{ins.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleCheckNumbers}
                      disabled={isCheckingNumbers || !checkNumInstanceId}
                      className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 font-semibold rounded-lg text-xs hover:bg-blue-50 disabled:opacity-50"
                    >
                      {isCheckingNumbers ? 'Verifying...' : 'Verify Validity'}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleBulkOptOut}
                  className="px-3 py-1.5 bg-white border border-red-200 text-red-600 font-semibold rounded-lg text-xs hover:bg-red-50 transition-all"
                >
                  Opt Out Selected
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-all"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Datatable */}
        <section className="flex-1 bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <span className="animate-spin text-xl text-blue-500">⏳</span>
              </div>
            ) : contacts.length > 0 ? (
              <table className="min-w-full text-left text-sm bg-white divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold text-xs uppercase tracking-wider">
                    <th className="w-12 px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedContactIds.length === contacts.length && contacts.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5"
                      />
                    </th>
                    <th className="px-6 py-4">Contact Details</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Tags</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Messaged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors group"
                      onClick={() => {
                        setSelectedContactId(contact.id)
                        setIsDetailOpen(true)
                      }}
                    >
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={() => handleSelectContact(contact.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-800">{contact.name}</div>
                        <div className="text-xs text-gray-400 font-medium">{contact.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium truncate max-w-[150px]">{contact.email || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags && contact.tags.slice(0, 3).map((tag, i) => {
                            const styles = getTagStyles(tag)
                            return (
                              <span key={i} style={styles} className="px-2 py-0.5 text-[10px] font-bold rounded-full border">
                                {tag}
                              </span>
                            )
                          })}
                          {contact.tags && contact.tags.length > 3 && (
                            <span className="text-[10px] text-gray-400 font-semibold px-1 py-0.5">
                              +{contact.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {contact.is_opted_out ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-full">DND</span>
                        ) : contact.is_invalid ? (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-700 rounded-full">Invalid</span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs font-semibold">
                        {contact.last_messaged_at ? new Date(contact.last_messaged_at).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
                <span className="text-3xl mb-2">📇</span>
                <p className="text-sm font-bold text-gray-700 mb-1">No contacts found</p>
                <p className="text-xs text-gray-400">Add a contact or import CSV to populate this list.</p>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
              <span className="text-xs text-gray-500 font-semibold">
                Showing page {page} of {totalPages} ({totalContacts} total contacts)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Sheets / Modals */}
      <ContactDetailSheet
        contactId={selectedContactId}
        isOpen={isDetailOpen}
        onClose={() => { setSelectedContactId(null); setIsDetailOpen(false); }}
        onUpdated={() => { fetchContacts(); fetchListsAndTags(); }}
      />

      <AddContactModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => { fetchContacts(); fetchListsAndTags(); }}
      />

      <ImportContactsModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => { fetchContacts(); fetchListsAndTags(); }}
      />
    </div>
  )
}
