import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CONTACT_LISTS, CONTACTS } from '../../api/endpoints.js'
import { Contact, ContactList } from '../../types/index.js'
import { ContactDetailSheet } from '../../components/contacts/ContactDetailSheet.js'
import { ImportContactsModal } from '../../components/contacts/ImportContactsModal.js'
import { getTagStyles } from '../../components/contacts/TagManager.js'
import axios from 'axios'

export const ContactListDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [list, setList] = useState<ContactList | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalContacts, setTotalContacts] = useState(0)
  
  const [isLoading, setIsLoading] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])

  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)

  useEffect(() => {
    fetchListDetail()
  }, [id, page])

  const fetchListDetail = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const res = await axios.get(CONTACT_LISTS.DETAIL(parseInt(id)), {
        params: {
          page,
          search: search.trim() || undefined,
        },
      })
      if (res.data.success) {
        setList(res.data.data)
        setContacts(res.data.data.contacts)
        setTotalPages(res.data.meta.last_page)
        setTotalContacts(res.data.meta.total)
      }
    } catch (err) {
      console.error(err)
      navigate('/contacts/lists')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1)
      fetchListDetail()
    }
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedContactIds(contacts.map((c) => c.id))
    } else {
      setSelectedContactIds([])
    }
  }

  const handleSelectContact = (contactId: number) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId) ? prev.filter((item) => item !== contactId) : [...prev, contactId]
    )
  }

  const handleRemoveContact = async (contactId: number) => {
    if (!id) return
    if (!confirm('Are you sure you want to remove this contact from this list? The contact will remain in your database.')) return

    try {
      const res = await axios.post(CONTACT_LISTS.REMOVE_CONTACTS(parseInt(id)), {
        contact_ids: [contactId],
      })
      if (res.data.success) {
        fetchListDetail()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleBulkRemove = async () => {
    if (!id) return
    if (!confirm(`Are you sure you want to remove the ${selectedContactIds.length} selected contacts from this list?`)) return

    try {
      const res = await axios.post(CONTACT_LISTS.REMOVE_CONTACTS(parseInt(id)), {
        contact_ids: selectedContactIds,
      })
      if (res.data.success) {
        setSelectedContactIds([])
        fetchListDetail()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleExport = () => {
    if (!id) return
    let exportUrl = `${axios.defaults.baseURL || ''}/api/contacts/export?list_id=${id}`
    if (search.trim()) {
      exportUrl += `&search=${search}`
    }
    window.open(exportUrl, '_blank')
  }

  return (
    <div className="h-screen bg-gray-50/50 flex flex-col p-6 overflow-hidden">
      
      {/* Header */}
      {list && (
        <div className="flex items-start justify-between mb-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 mb-1.5">
              <Link to="/contacts/lists">← Back to Contact Lists</Link>
            </div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {list.name}
              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                {list.contact_count} contacts
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">{list.description || 'No description provided.'}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all bg-white"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-100"
            >
              Import Direct
            </button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white border border-gray-150 rounded-2xl p-4 mb-4 shadow-sm shrink-0 flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search within this list... (Press Enter)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm bg-white"
        />

        {selectedContactIds.length > 0 && (
          <button
            type="button"
            onClick={handleBulkRemove}
            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-xl text-xs transition-all"
          >
            Remove {selectedContactIds.length} Selected from List
          </button>
        )}
      </div>

      {/* Datatable */}
      <div className="flex-1 bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm flex flex-col">
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
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50/50 cursor-pointer transition-colors"
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
                    <td className="px-6 py-4 text-gray-600 font-medium">{contact.email || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags && contact.tags.slice(0, 2).map((tag, i) => {
                          const styles = getTagStyles(tag)
                          return (
                            <span key={i} style={styles} className="px-2 py-0.5 text-[10px] font-bold rounded-full border">
                              {tag}
                            </span>
                          )
                        })}
                        {contact.tags && contact.tags.length > 2 && (
                          <span className="text-[10px] text-gray-400 font-semibold px-1">
                            +{contact.tags.length - 2} more
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
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(contact.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-700 p-1"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50/30">
              <span className="text-3xl mb-2">📂</span>
              <p className="text-sm font-bold text-gray-700 mb-1">List is empty</p>
              <p className="text-xs text-gray-400">Import CSV directly or assign contacts to this list.</p>
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
      </div>

      {selectedContactId && (
        <ContactDetailSheet
          contactId={selectedContactId}
          isOpen={isDetailOpen}
          onClose={() => { setSelectedContactId(null); setIsDetailOpen(false); }}
          onUpdated={fetchListDetail}
        />
      )}

      {id && (
        <ImportContactsModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          onSuccess={fetchListDetail}
        />
      )}
    </div>
  )
}
