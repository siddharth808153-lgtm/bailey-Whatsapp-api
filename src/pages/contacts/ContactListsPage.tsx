import React, { useState, useEffect } from 'react'
import { CONTACT_LISTS } from '../../api/endpoints.js'
import { ContactList } from '../../types/index.js'
import { ImportContactsModal } from '../../components/contacts/ImportContactsModal.js'
import { Link } from 'react-router-dom'
import axios from 'axios'

export const ContactListsPage: React.FC = () => {
  const [lists, setLists] = useState<ContactList[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListDesc, setNewListDesc] = useState('')
  
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isEditingId, setIsEditingId] = useState<number | null>(null)

  useEffect(() => {
    fetchLists()
  }, [])

  const fetchLists = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(CONTACT_LISTS.LIST)
      if (res.data.success) {
        setLists(res.data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return

    try {
      const res = await axios.post(CONTACT_LISTS.CREATE, {
        name: newListName,
        description: newListDesc,
      })
      if (res.data.success) {
        setNewListName('')
        setNewListDesc('')
        setIsAddOpen(false)
        fetchLists()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleStartEdit = (list: ContactList) => {
    setIsEditingId(list.id)
    setNewListName(list.name)
    setNewListDesc(list.description || '')
  }

  const handleSaveEdit = async (e: React.FormEvent, id: number) => {
    e.preventDefault()
    try {
      const res = await axios.put(CONTACT_LISTS.UPDATE(id), {
        name: newListName,
        description: newListDesc,
      })
      if (res.data.success) {
        setIsEditingId(null)
        setNewListName('')
        setNewListDesc('')
        fetchLists()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteList = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete the list "${name}"? Contacts belonging to the list will not be deleted.`)) return
    try {
      const res = await axios.delete(CONTACT_LISTS.DELETE(id))
      if (res.data.success) {
        fetchLists()
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete list.')
    }
  }

  return (
    <div className="h-screen bg-gray-50/50 overflow-y-auto p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contact Lists</h2>
          <p className="text-xs text-gray-400">Organize contacts into custom lists for target campaigns.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-100"
        >
          New List
        </button>
      </div>

      {/* Add New List Card */}
      {isAddOpen && (
        <form onSubmit={handleCreateList} className="bg-white border border-gray-150 rounded-2xl p-5 mb-6 shadow-sm space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-gray-800">Create Contact List</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">List Name</label>
              <input
                type="text"
                required
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Newsletter Subscriptions"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description (Optional)</label>
              <textarea
                value={newListDesc}
                onChange={(e) => setNewListDesc(e.target.value)}
                placeholder="Add list description..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
            >
              Create List
            </button>
          </div>
        </form>
      )}

      {/* Lists Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <span className="animate-spin text-xl text-blue-500">⏳</span>
        </div>
      ) : lists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <div key={list.id} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-48">
              
              {isEditingId === list.id ? (
                <form onSubmit={(e) => handleSaveEdit(e, list.id)} className="space-y-3 h-full flex flex-col justify-between">
                  <div className="space-y-2">
                    <input
                      type="text"
                      required
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      value={newListDesc}
                      onChange={(e) => setNewListDesc(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingId(null)}
                      className="px-2 py-1 border border-gray-200 text-gray-500 rounded text-[10px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-blue-600 text-white rounded text-[10px] font-bold"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <Link to={`/contacts/lists/${list.id}`} className="font-bold text-gray-800 hover:text-blue-600 transition-colors text-sm truncate">
                        {list.name}
                      </Link>
                      <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-extrabold text-blue-600 shrink-0">
                        {list.contact_count} contacts
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 h-8">{list.description || 'No description provided.'}</p>
                    <span className="block text-[10px] text-gray-400 mt-2 font-semibold">Created: {new Date(list.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedListId(list.id)
                        setIsImportOpen(true)
                      }}
                      className="px-2.5 py-1 bg-green-50 border border-green-100 text-green-700 font-bold rounded-lg text-[10px] hover:bg-green-100"
                    >
                      Quick Import
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(list)}
                        className="text-xs font-bold text-gray-500 hover:text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteList(list.id, list.name)}
                        className="text-xs font-bold text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-2xl text-center shadow-sm">
          <span className="text-4xl mb-2">📂</span>
          <p className="text-sm font-bold text-gray-700 mb-1">No lists created yet</p>
          <p className="text-xs text-gray-400 mb-4">Lists allow segmenting audiences for campaigns.</p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
          >
            Create First List
          </button>
        </div>
      )}

      {selectedListId && (
        <ImportContactsModal
          isOpen={isImportOpen}
          onClose={() => {
            setSelectedListId(null)
            setIsImportOpen(false)
          }}
          onSuccess={fetchLists}
        />
      )}
    </div>
  )
}
