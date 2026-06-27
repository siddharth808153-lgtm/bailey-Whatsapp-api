import React, { useState, useEffect } from 'react'
import { CAMPAIGNS, INSTANCES } from '../../api/endpoints.js'
import { Campaign, WhatsappInstance } from '../../types/index.js'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate()

  // Campaigns list data
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [instanceId, setInstanceId] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [metaStats, setMetaStats] = useState({
    total_campaigns: 0,
    running_count: 0,
    completed_count: 0,
    scheduled_count: 0,
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [activeActionsId, setActiveActionsId] = useState<number | null>(null)

  useEffect(() => {
    fetchInstances()
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [page, statusFilter, instanceId, dateFrom, dateTo])

  const fetchInstances = async () => {
    try {
      const res = await axios.get(INSTANCES.LIST)
      if (res.data.success) {
        setInstances(res.data.data)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchCampaigns = async () => {
    setIsLoading(true)
    try {
      const params: Record<string, any> = { page }

      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (instanceId) {
        params.instance_id = instanceId
      }
      if (dateFrom) {
        params.date_from = dateFrom
      }
      if (dateTo) {
        params.date_to = dateTo
      }
      if (search.trim()) {
        params.search = search
      }

      const res = await axios.get(CAMPAIGNS.LIST, { params })
      if (res.data.success) {
        setCampaigns(res.data.data)
        setTotalPages(res.data.meta.last_page)
        setTotalItems(res.data.meta.total)
        setMetaStats({
          total_campaigns: res.data.meta.total_campaigns ?? 0,
          running_count: res.data.meta.running_count ?? 0,
          completed_count: res.data.meta.completed_count ?? 0,
          scheduled_count: res.data.meta.scheduled_count ?? 0,
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1)
      fetchCampaigns()
    }
  }

  const handlePause = async (id: number) => {
    try {
      const res = await axios.post(CAMPAIGNS.PAUSE(id))
      if (res.data.success) {
        fetchCampaigns()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleResume = async (id: number) => {
    try {
      const res = await axios.post(CAMPAIGNS.RESUME(id))
      if (res.data.success) {
        fetchCampaigns()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this campaign? Pending messages will be skipped.')) return
    try {
      const res = await axios.post(CAMPAIGNS.CANCEL(id))
      if (res.data.success) {
        fetchCampaigns()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDuplicate = async (id: number) => {
    try {
      const res = await axios.post(CAMPAIGNS.DUPLICATE(id))
      if (res.data.success) {
        alert('Campaign duplicated to Drafts.')
        fetchCampaigns()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this campaign? This will permanently wipe campaign logs.')) return
    try {
      const res = await axios.delete(CAMPAIGNS.DELETE(id))
      if (res.data.success) {
        fetchCampaigns()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const getStatusBadge = (status: string) => {
    const base = 'px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase '
    switch (status) {
      case 'draft':
        return <span className={`${base} bg-gray-100 text-gray-700`}>Draft</span>
      case 'scheduled':
        return <span className={`${base} bg-blue-150 text-blue-700`}>Scheduled</span>
      case 'running':
        return (
          <span className={`${base} bg-green-150 text-green-700 flex items-center gap-1 w-max animate-pulse`}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-ping" />
            Running
          </span>
        )
      case 'paused':
        return <span className={`${base} bg-yellow-150 text-yellow-700`}>Paused</span>
      case 'completed':
        return <span className={`${base} bg-indigo-150 text-indigo-700`}>Completed</span>
      case 'failed':
        return <span className={`${base} bg-red-150 text-red-700`}>Failed</span>
      case 'cancelled':
        return <span className={`${base} bg-gray-150 text-gray-500`}>Cancelled</span>
      default:
        return <span className={`${base} bg-gray-100 text-gray-600`}>{status}</span>
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
    <div className="h-screen bg-gray-50/50 overflow-y-auto p-6 flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans tracking-tight">Campaign Campaigns</h2>
          <p className="text-xs text-gray-400">Schedule and run bulk messages delivery sessions.</p>
        </div>
        <Link
          to="/campaigns/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-100"
        >
          Create Campaign
        </Link>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-4 gap-5 mb-6 shrink-0">
        <div className="p-4 bg-white border border-gray-150 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-base">📢</div>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Campaigns</span>
            <span className="text-lg font-extrabold text-gray-800">{metaStats.total_campaigns}</span>
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-base animate-pulse">⚡</div>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Running Now</span>
            <span className="text-lg font-extrabold text-gray-800">{metaStats.running_count}</span>
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-base">✓</div>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed</span>
            <span className="text-lg font-extrabold text-gray-800">{metaStats.completed_count}</span>
          </div>
        </div>
        <div className="p-4 bg-white border border-gray-150 rounded-2xl flex items-center gap-3.5 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center text-base">⏳</div>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Scheduled</span>
            <span className="text-lg font-extrabold text-gray-800">{metaStats.scheduled_count}</span>
          </div>
        </div>
      </section>

      {/* Filter Options */}
      <section className="bg-white border border-gray-150 rounded-2xl p-4 mb-4 shadow-sm shrink-0 space-y-4">
        
        {/* Status Tabs */}
        <div className="flex flex-wrap border-b border-gray-100 pb-2.5 gap-1.5 text-xs font-bold text-gray-500">
          {['all', 'draft', 'scheduled', 'running', 'paused', 'completed', 'failed', 'cancelled'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => { setStatusFilter(st); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg capitalize transition-all ${statusFilter === st ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <input
              type="text"
              placeholder="Search campaign name... (Press Enter)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="px-3.5 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-sm bg-white min-w-[200px]"
            />

            <select
              value={instanceId}
              onChange={(e) => { setInstanceId(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm bg-white text-gray-700"
            >
              <option value="">-- All Instances --</option>
              {instances.map((ins) => (
                <option key={ins.id} value={ins.id}>{ins.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-sm text-gray-500 font-semibold bg-gray-50 p-1.5 rounded-xl border border-gray-100">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="bg-transparent border-none outline-none text-xs"
              />
              <span>to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="bg-transparent border-none outline-none text-xs"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Campaigns Table */}
      <section className="flex-1 bg-white border border-gray-150 rounded-2xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <span className="animate-spin text-xl text-blue-500">⏳</span>
            </div>
          ) : campaigns.length > 0 ? (
            <table className="min-w-full text-left text-sm bg-white divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-500 font-bold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Campaign Name</th>
                  <th className="px-6 py-4">Instance</th>
                  <th className="px-6 py-4">Recipients List</th>
                  <th className="px-6 py-4">Delivery Progress</th>
                  <th className="px-6 py-4">Counts</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timeframe</th>
                  <th className="px-6 py-4 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((camp) => {
                  const total = camp.total_contacts || 1
                  const processed = camp.sent_count + camp.failed_count
                  const pct = Math.min(100, Math.round((processed / total) * 100))

                  return (
                    <tr
                      key={camp.id}
                      onClick={() => navigate(`/campaigns/${camp.id}`)}
                      className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getTypeIcon(camp.message_type)}</span>
                          <span className="font-bold text-gray-800">{camp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-600 rounded">
                          {camp.whatsapp_instance?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 font-semibold">
                          {camp.contact_list?.name || 'Custom List'}
                        </span>
                      </td>
                      <td className="px-6 py-4 min-w-[150px]">
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-150">
                          <div
                            style={{ width: `${pct}%` }}
                            className={`h-full rounded-full transition-all ${camp.status === 'running' ? 'bg-green-500 animate-pulse' : camp.status === 'completed' ? 'bg-indigo-600' : 'bg-gray-400'}`}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold mt-1 block">{pct}% complete</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold font-mono">
                        <span className="text-green-600">✅ {camp.sent_count}</span>
                        <span className="text-red-500 ml-2.5">❌ {camp.failed_count}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(camp.status)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 font-semibold">
                        {camp.scheduled_at 
                          ? `Scheduled: ${new Date(camp.scheduled_at).toLocaleDateString()}` 
                          : camp.started_at 
                          ? `Started: ${new Date(camp.started_at).toLocaleDateString()}` 
                          : 'Not started'
                        }
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveActionsId(activeActionsId === camp.id ? null : camp.id)}
                            className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded hover:bg-gray-100 text-base"
                          >
                            ⋮
                          </button>
                          
                          {activeActionsId === camp.id && (
                            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-40 text-xs font-semibold text-gray-700">
                              <Link
                                to={`/campaigns/${camp.id}`}
                                className="block px-4 py-2 hover:bg-gray-50"
                                onClick={() => setActiveActionsId(null)}
                              >
                                View Live Progress
                              </Link>
                              <Link
                                to={`/campaigns/${camp.id}/report`}
                                className="block px-4 py-2 hover:bg-gray-50"
                                onClick={() => setActiveActionsId(null)}
                              >
                                View Metrics Report
                              </Link>
                              
                              {camp.status === 'running' && (
                                <button
                                  type="button"
                                  onClick={() => { handlePause(camp.id); setActiveActionsId(null); }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-yellow-600"
                                >
                                  Pause Sending
                                </button>
                              )}
                              {camp.status === 'paused' && (
                                <button
                                  type="button"
                                  onClick={() => { handleResume(camp.id); setActiveActionsId(null); }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-green-600"
                                >
                                  Resume Sending
                                </button>
                              )}
                              {['running', 'paused', 'scheduled'].includes(camp.status) && (
                                <button
                                  type="button"
                                  onClick={() => { handleCancel(camp.id); setActiveActionsId(null); }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-500"
                                >
                                  Cancel Campaign
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => { handleDuplicate(camp.id); setActiveActionsId(null); }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50"
                              >
                                Duplicate Setup
                              </button>

                              {!['running', 'paused', 'scheduled'].includes(camp.status) && (
                                <button
                                  type="button"
                                  onClick={() => { handleDelete(camp.id); setActiveActionsId(null); }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 border-t border-gray-100"
                                >
                                  Delete Permanently
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-gray-50/30">
              <span className="text-4xl mb-2.5">📢</span>
              <p className="text-sm font-bold text-gray-700 mb-1">No campaigns found</p>
              <p className="text-xs text-gray-400">Launch a campaign to broadcast bulk messages.</p>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
            <span className="text-xs text-gray-500 font-semibold">
              Showing page {page} of {totalPages} ({totalItems} total campaigns)
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
    </div>
  )
}
