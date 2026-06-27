import React, { useState, useEffect } from 'react'
import { TAGS, CONTACTS } from '../../api/endpoints.js'
import { Tag } from '../../types/index.js'
import { getTagStyles } from '../../components/contacts/TagManager.js'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export const TagsPage: React.FC = () => {
  const navigate = useNavigate()
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Dialog states
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [isRenameOpen, setIsRenameOpen] = useState(false)
  const [isMergeOpen, setIsMergeOpen] = useState(false)
  
  const [newName, setNewName] = useState('')
  const [mergeTargetName, setMergeTargetName] = useState('')

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    setIsLoading(true)
    try {
      const res = await axios.get(TAGS.LIST)
      if (res.data.success) {
        setTags(res.data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTag || !newName.trim()) return
    setIsProcessing(true)

    try {
      // 1. Fetch all contacts with the active tag (we request page size 10000 to fetch them all)
      const listRes = await axios.get(CONTACTS.LIST, {
        params: { tag: activeTag, per_page: 10000 },
      })
      
      if (listRes.data.success) {
        const contactIds = listRes.data.data.map((c: any) => c.id)

        if (contactIds.length > 0) {
          // 2. Add new tag to these contacts
          await axios.post(TAGS.BULK_TAG, {
            contact_ids: contactIds,
            tags: [newName.trim().toLowerCase()],
            action: 'add',
          })
          
          // 3. Remove old tag from these contacts
          await axios.post(TAGS.BULK_TAG, {
            contact_ids: contactIds,
            tags: [activeTag],
            action: 'remove',
          })
        }
      }

      setIsRenameOpen(false)
      setActiveTag(null)
      setNewName('')
      fetchTags()
    } catch (err) {
      console.error('Rename tag failed', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTag || !mergeTargetName.trim()) return
    setIsProcessing(true)

    try {
      // 1. Fetch all contacts with the active tag
      const listRes = await axios.get(CONTACTS.LIST, {
        params: { tag: activeTag, per_page: 10000 },
      })
      
      if (listRes.data.success) {
        const contactIds = listRes.data.data.map((c: any) => c.id)

        if (contactIds.length > 0) {
          // 2. Add the target merge tag
          await axios.post(TAGS.BULK_TAG, {
            contact_ids: contactIds,
            tags: [mergeTargetName.trim().toLowerCase()],
            action: 'add',
          })
          
          // 3. Remove original tag
          await axios.post(TAGS.BULK_TAG, {
            contact_ids: contactIds,
            tags: [activeTag],
            action: 'remove',
          })
        }
      }

      setIsMergeOpen(false)
      setActiveTag(null)
      setMergeTargetName('')
      fetchTags()
    } catch (err) {
      console.error('Merge tags failed', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDelete = async (tag: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${tag}" from all contacts?`)) return
    setIsProcessing(true)

    try {
      // 1. Fetch all contacts with tag
      const listRes = await axios.get(CONTACTS.LIST, {
        params: { tag, per_page: 10000 },
      })

      if (listRes.data.success) {
        const contactIds = listRes.data.data.map((c: any) => c.id)

        if (contactIds.length > 0) {
          // 2. Bulk remove tag from all
          await axios.post(TAGS.BULK_TAG, {
            contact_ids: contactIds,
            tags: [tag],
            action: 'remove',
          })
        }
      }
      fetchTags()
    } catch (err) {
      console.error('Delete tag failed', err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTagClick = (tag: string) => {
    // Navigate to Contacts Page with filter
    navigate(`/contacts?tag=${encodeURIComponent(tag)}`)
  }

  return (
    <div className="h-screen bg-gray-50/50 overflow-y-auto p-6">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tag Manager</h2>
        <p className="text-xs text-gray-400">View and manage contact classification tags globally.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <span className="animate-spin text-xl text-blue-500">⏳</span>
        </div>
      ) : tags.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tags.map((item, idx) => {
            const styles = getTagStyles(item.tag)
            return (
              <div key={idx} className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-36">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span
                      onClick={() => handleTagClick(item.tag)}
                      style={styles}
                      className="px-3 py-1 text-xs font-bold rounded-full border cursor-pointer hover:opacity-80 transition-all select-none"
                    >
                      {item.tag}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      {item.count} contacts
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTag(item.tag)
                      setNewName(item.tag)
                      setIsRenameOpen(true)
                    }}
                    className="text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTag(item.tag)
                      setMergeTargetName('')
                      setIsMergeOpen(true)
                    }}
                    className="text-xs font-bold text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.tag)}
                    disabled={isProcessing}
                    className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white border border-gray-150 rounded-2xl text-center shadow-sm">
          <span className="text-4xl mb-2">🏷</span>
          <p className="text-sm font-bold text-gray-700 mb-1">No tags found</p>
          <p className="text-xs text-gray-400">Apply tags to contacts to manage them here.</p>
        </div>
      )}

      {/* RENAME MODAL */}
      {isRenameOpen && activeTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleRename} className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Rename Tag: "{activeTag}"</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">New Tag Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRenameOpen(false)
                  setActiveTag(null)
                }}
                className="px-3.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {isProcessing ? 'Updating...' : 'Rename'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MERGE MODAL */}
      {isMergeOpen && activeTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <form onSubmit={handleMerge} className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-gray-800">Merge Tag: "{activeTag}" into...</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Target Tag Name</label>
              <select
                value={mergeTargetName}
                required
                onChange={(e) => setMergeTargetName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white text-gray-700"
              >
                <option value="">-- Select Target Tag --</option>
                {tags.filter((t) => t.tag !== activeTag).map((t, idx) => (
                  <option key={idx} value={t.tag}>{t.tag}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsMergeOpen(false)
                  setActiveTag(null)
                }}
                className="px-3.5 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || !mergeTargetName}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                {isProcessing ? 'Merging...' : 'Merge Tags'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
