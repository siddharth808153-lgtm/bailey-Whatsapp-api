import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { DRIP, CONTACTS, CONTACT_LISTS } from '../../api/endpoints.js'
import { DripSequence, DripEnrollment, Contact, ContactList } from '../../types/index.js'

export const EnrollmentsPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const sequenceId = Number(id)

  const [sequence, setSequence] = useState<DripSequence | null>(null)
  const [enrollments, setEnrollments] = useState<DripEnrollment[]>([])
  const [loading, setLoading] = useState(true)
  
  // Stats
  const [stats, setStats] = useState({ active: 0, paused: 0, completed: 0, unsubscribed: 0 })

  // Selection & Bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Modal control
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [enrollTab, setEnrollTab] = useState<'contacts' | 'list'>('contacts')
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [allLists, setAllLists] = useState<ContactList[]>([])
  
  // Selection inside Modal
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])
  const [selectedListId, setSelectedListId] = useState('')
  const [searchContact, setSearchContact] = useState('')

  const [enrolling, setEnrolling] = useState(false)

  const fetchSequence = async () => {
    try {
      const res = await axios.get(DRIP.SEQUENCE_DETAIL(sequenceId))
      setSequence(res.data.data)
      const st = res.data.data.enrollment_stats || { active: 0, paused: 0, completed: 0, unsubscribed: 0 }
      setStats(st)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchEnrollments = async () => {
    setLoading(true)
    try {
      const res = await axios.get(DRIP.ENROLLMENTS(sequenceId))
      // Handle pagination wrapper or straight list
      const list = res.data.data.data || res.data.data || []
      setEnrollments(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadEnrollmentModalData = async () => {
    try {
      const [contactsRes, listsRes] = await Promise.all([
        axios.get(CONTACTS.LIST, { params: { limit: 1000 } }),
        axios.get(CONTACT_LISTS.LIST)
      ])
      setAllContacts(contactsRes.data.data.data || contactsRes.data.data || [])
      setAllLists(listsRes.data.data || [])
    } catch (err) {
      console.error('Failed to load contacts/lists', err)
    }
  }

  useEffect(() => {
    fetchSequence()
    fetchEnrollments()
  }, [id])

  useEffect(() => {
    if (isEnrollModalOpen) {
      loadEnrollmentModalData()
      setSelectedContactIds([])
      setSelectedListId('')
      setSearchContact('')
    }
  }, [isEnrollModalOpen])

  const handlePause = async (eid: number) => {
    try {
      await axios.post(DRIP.ENROLLMENTS(sequenceId) + `/${eid}/pause`)
      fetchEnrollments()
      fetchSequence()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to pause enrollment')
    }
  }

  const handleResume = async (eid: number) => {
    try {
      await axios.post(DRIP.ENROLLMENTS(sequenceId) + `/${eid}/resume`)
      fetchEnrollments()
      fetchSequence()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to resume enrollment')
    }
  }

  const handleRemove = async (eid: number) => {
    if (!confirm('Are you sure you want to stop drip campaign messages for this contact?')) return
    try {
      await axios.delete(DRIP.ENROLLMENTS(sequenceId) + `/${eid}`)
      fetchEnrollments()
      fetchSequence()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove enrollment')
    }
  }

  const handleBulkAction = async (action: 'pause' | 'resume' | 'remove') => {
    if (selectedIds.length === 0) return
    if (action === 'remove' && !confirm(`Unsubscribe all ${selectedIds.length} selected contacts?`)) return

    try {
      await axios.post(DRIP.BULK_ACTION(sequenceId), {
        enrollment_ids: selectedIds,
        action
      })
      setSelectedIds([])
      fetchEnrollments()
      fetchSequence()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Bulk action failed')
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === enrollments.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(enrollments.map(e => e.id))
    }
  }

  const toggleSelectOne = (eid: number) => {
    setSelectedIds(prev =>
      prev.includes(eid) ? prev.filter(id => id !== eid) : [...prev, eid]
    )
  }

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnrolling(true)
    try {
      if (enrollTab === 'contacts') {
        if (selectedContactIds.length === 0) return alert('Select at least one contact.')
        await axios.post(DRIP.ENROLL(sequenceId), { contact_ids: selectedContactIds })
      } else {
        if (!selectedListId) return alert('Please select a contact list.')
        await axios.post(DRIP.ENROLL_LIST(sequenceId), { list_id: Number(selectedListId) })
      }
      setIsEnrollModalOpen(false)
      fetchEnrollments()
      fetchSequence()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to enroll')
    } finally {
      setEnrolling(false)
    }
  }

  const filteredContacts = allContacts.filter(c =>
    c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchContact.toLowerCase())
  )

  const toggleContactSelect = (cid: number) => {
    setSelectedContactIds(prev =>
      prev.includes(cid) ? prev.filter(id => id !== cid) : [...prev, cid]
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/drip')}
              className="text-gray-400 hover:text-gray-700 font-bold p-1 rounded-lg hover:bg-gray-150 transition-colors"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                {sequence?.name || 'Loading sequence...'} — Enrollments
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage active contacts currently traversing this drip sequence.</p>
            </div>
          </div>
          <button
            onClick={() => setIsEnrollModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
          >
            <span>➕</span> Enroll Contacts
          </button>
        </div>

        {/* Status Breakdown Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active</span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">{stats.active}</span>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Paused</span>
            <span className="text-2xl font-black text-amber-600 mt-1 block">{stats.paused}</span>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Completed</span>
            <span className="text-2xl font-black text-purple-600 mt-1 block">{stats.completed}</span>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Unsubscribed</span>
            <span className="text-2xl font-black text-gray-500 mt-1 block">{stats.unsubscribed}</span>
          </div>
        </div>

        {/* Bulk Action Controls */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
            <span className="text-xs font-bold text-blue-800">
              Selected {selectedIds.length} contacts for bulk action
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('pause')}
                className="bg-white hover:bg-amber-50 border border-gray-200 text-amber-600 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
              >
                Pause
              </button>
              <button
                onClick={() => handleBulkAction('resume')}
                className="bg-white hover:bg-green-50 border border-gray-200 text-green-600 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
              >
                Resume
              </button>
              <button
                onClick={() => handleBulkAction('remove')}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
              >
                Remove/Unsubscribe
              </button>
            </div>
          </div>
        )}

        {/* Enrollments Table */}
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-400 font-semibold">Loading enrollments...</div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-semibold">
              <span className="text-3xl block">👥</span>
              No contacts enrolled in this sequence.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-4 px-5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === enrollments.length}
                        onChange={toggleSelectAll}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact Info</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Current Step</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Enrolled On</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Next Message ETA</th>
                    <th className="py-4 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map(item => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelectOne(item.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-4 px-5">
                        <span className="font-extrabold text-gray-900 text-sm">{item.contact?.name || 'Unknown'}</span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">{item.contact?.phone}</span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-xs text-gray-700 font-bold">Step {item.current_step}</span>
                        {item.current_step_details && (
                          <span className="block text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]">
                            {item.current_step_details.name || 'Unnamed step'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full tracking-wider ${
                          item.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          item.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                          item.status === 'completed' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-xs font-semibold text-gray-500">
                        {new Date(item.enrolled_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-5 text-xs font-semibold text-gray-500">
                        {item.status === 'completed' ? (
                          <span className="text-purple-600">Completed</span>
                        ) : item.next_message_at ? (
                          new Date(item.next_message_at).toLocaleString()
                        ) : (
                          '--'
                        )}
                      </td>
                      <td className="py-4 px-5 text-right space-x-1 shrink-0">
                        {item.status === 'active' && (
                          <button
                            onClick={() => handlePause(item.id)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-600 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors"
                          >
                            Pause
                          </button>
                        )}
                        {item.status === 'paused' && (
                          <button
                            onClick={() => handleResume(item.id)}
                            className="bg-green-50 hover:bg-green-100 text-green-600 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors"
                          >
                            Resume
                          </button>
                        )}
                        {item.status !== 'completed' && item.status !== 'unsubscribed' && (
                          <button
                            onClick={() => handleRemove(item.id)}
                            className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-bold py-1 px-2.5 rounded-lg transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Enroll Modal Dialog */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 md:p-8 space-y-6">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-gray-950 tracking-tight">Enroll Contacts</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Subscribe list members or contacts into sequence.</p>
                </div>
                <button
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setEnrollTab('contacts')}
                  className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${
                    enrollTab === 'contacts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Select Contacts ({selectedContactIds.length})
                </button>
                <button
                  onClick={() => setEnrollTab('list')}
                  className={`flex-1 pb-3 text-sm font-bold text-center border-b-2 transition-colors ${
                    enrollTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Select Contact List
                </button>
              </div>

              <form onSubmit={handleEnrollSubmit} className="space-y-4">
                
                {enrollTab === 'contacts' ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Search contacts by name or phone..."
                      value={searchContact}
                      onChange={e => setSearchContact(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500"
                    />

                    {/* Contacts selection container */}
                    <div className="max-h-60 overflow-y-auto border border-gray-100 rounded-2xl p-2 space-y-1 bg-gray-50/50">
                      {filteredContacts.length === 0 ? (
                        <p className="text-center text-xs text-gray-400 py-6">No matching contacts found</p>
                      ) : (
                        filteredContacts.map(c => {
                          const isSelected = selectedContactIds.includes(c.id)
                          return (
                            <div
                              key={c.id}
                              onClick={() => toggleContactSelect(c.id)}
                              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/60 border border-blue-100' : 'hover:bg-gray-100'
                              }`}
                            >
                              <div>
                                <span className="text-xs font-bold text-gray-900 block">{c.name}</span>
                                <span className="text-[10px] text-gray-400">{c.phone}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                readOnly
                                className="rounded text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Target Contact List</label>
                    <select
                      value={selectedListId}
                      onChange={e => setSelectedListId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">-- Select Contact List --</option>
                      {allLists.map(list => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.contact_count || 0} contacts)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enrolling}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20"
                  >
                    {enrolling ? 'Subscribing...' : 'Enroll Now'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
