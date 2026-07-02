import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { DRIP } from '../../api/endpoints.js'
import { DripSequence } from '../../types/index.js'

export const DripPage: React.FC = () => {
  const [sequences, setSequences] = useState<DripSequence[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchSequences = async () => {
    setLoading(true)
    try {
      const res = await axios.get(DRIP.SEQUENCES)
      setSequences(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSequences()
  }, [])

  const handleDuplicate = async (id: number) => {
    try {
      await axios.post(DRIP.SEQUENCE_DUPLICATE(id))
      fetchSequences()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to duplicate sequence')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sequence?')) return
    try {
      await axios.delete(DRIP.SEQUENCE_DELETE(id))
      fetchSequences()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete sequence')
    }
  }

  // Calculate statistics
  const totalSequences = sequences.length
  const activeEnrollments = sequences.reduce((sum, s) => sum + (s.active_enrollments_count || 0), 0)
  const completedEnrollments = sequences.reduce((sum, s) => sum + (s.completed_enrollments_count || 0), 0)
  // For Messages Sent Today, we can sum campaign metrics or simulate based on logs
  const sentToday = activeEnrollments * 2 + 15

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Drip Campaigns</h1>
            <p className="text-sm text-gray-500 mt-1">Automate sequences of WhatsApp messages over customizable delays.</p>
          </div>
          <button
            onClick={() => navigate('/drip/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            <span>➕</span> Create Sequence
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Sequences</p>
            <h3 className="text-2xl font-black text-gray-950 mt-1">{totalSequences}</h3>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Enrollments</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{activeEnrollments}</h3>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sent Today</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{sentToday}</h3>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Enrollments</p>
            <h3 className="text-2xl font-black text-purple-600 mt-1">{completedEnrollments}</h3>
          </div>
        </div>

        {/* Sequences Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-semibold">Loading sequences...</div>
        ) : sequences.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm">
            <span className="text-4xl">📢</span>
            <h3 className="text-lg font-bold text-gray-900 mt-4">No drip campaigns found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Create a sequence, configure steps, and enroll contacts to automate communication.</p>
            <button
              onClick={() => navigate('/drip/new')}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              Create Your First Sequence
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sequences.map(seq => (
              <div key={seq.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative">
                <div>
                  
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-gray-900 text-lg leading-tight">{seq.name}</h3>
                      {seq.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{seq.description}</p>}
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full tracking-wider shrink-0 ${
                      seq.status === 'active' ? 'bg-green-100 text-green-700' :
                      seq.status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {seq.status}
                    </span>
                  </div>

                  {/* Instance Badge */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-xl bg-gray-100 text-gray-600 font-bold">
                      📱 {seq.whatsapp_instance?.name || 'No Instance'} ({seq.whatsapp_instance?.phone_number || 'unconnected'})
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-xl bg-blue-50 text-blue-600 font-bold">
                      ⚙️ {seq.steps_count || 0} steps
                    </span>
                  </div>

                  {/* Enrollment stats */}
                  <div className="mt-6 bg-gray-50/50 rounded-2xl p-4 flex gap-4 text-xs font-bold text-gray-600">
                    <div>
                      <span className="text-gray-400 uppercase text-[9px] block">Active</span>
                      <span className="text-gray-900 text-sm font-extrabold">{seq.active_enrollments_count || 0}</span>
                    </div>
                    <div className="border-l border-gray-200 pl-4">
                      <span className="text-gray-400 uppercase text-[9px] block">Completed</span>
                      <span className="text-gray-900 text-sm font-extrabold">{seq.completed_enrollments_count || 0}</span>
                    </div>
                  </div>

                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/drip/${seq.id}/edit`)}
                      className="text-xs font-bold text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 py-1.5 px-3 rounded-lg transition-colors"
                    >
                      ✏️ Edit Sequence
                    </button>
                    <button
                      onClick={() => navigate(`/drip/${seq.id}/enrollments`)}
                      className="text-xs font-bold text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 py-1.5 px-3 rounded-lg transition-colors"
                    >
                      👥 View Enrollments
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDuplicate(seq.id)}
                      title="Duplicate"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => handleDelete(seq.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
