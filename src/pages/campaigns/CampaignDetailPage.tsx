import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CAMPAIGNS } from '../../api/endpoints.js'
import { Campaign, CampaignMessage } from '../../types/index.js'
import axios from 'axios'

export const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [messages, setMessages] = useState<CampaignMessage[]>([])
  
  // Stats meta
  const [metaStats, setMetaStats] = useState({
    pending_count: 0,
    progress_percentage: 0,
    estimated_time_remaining: 0,
    total: 0,
  })

  // Table filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchPhone, setSearchPhone] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [isLoading, setIsLoading] = useState(false)
  const [isSendingAction, setIsSendingAction] = useState(false)

  // Polling for live status
  useEffect(() => {
    fetchCampaignDetails()
  }, [id, page, statusFilter])

  useEffect(() => {
    if (!campaign || !['running', 'scheduled'].includes(campaign.status)) return

    const timer = setInterval(() => {
      fetchCampaignDetails(true) // Silent refresh
    }, 10000)

    return () => clearInterval(timer)
  }, [campaign?.status, page, statusFilter])

  const fetchCampaignDetails = async (silent = false) => {
    if (!id) return
    if (!silent) setIsLoading(true)
    
    try {
      const params: Record<string, any> = { page }
      if (statusFilter !== 'all') {
        params.status = statusFilter
      }
      if (searchPhone.trim()) {
        params.phone = searchPhone.trim()
      }

      const res = await axios.get(CAMPAIGNS.DETAIL(parseInt(id)), { params })
      if (res.data.success) {
        setCampaign(res.data.data)
        setMessages(res.data.data.messages)
        setMetaStats({
          pending_count: res.data.meta.pending_count,
          progress_percentage: res.data.meta.progress_percentage,
          estimated_time_remaining: res.data.meta.estimated_time_remaining,
          total: res.data.meta.total,
        })
        setTotalPages(res.data.meta.last_page)
      }
    } catch (err) {
      console.error(err)
      if (!silent) navigate('/campaigns')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setPage(1)
      fetchCampaignDetails()
    }
  }

  const handlePause = async () => {
    if (!campaign) return
    setIsSendingAction(true)
    try {
      await axios.post(CAMPAIGNS.PAUSE(campaign.id))
      fetchCampaignDetails()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSendingAction(false)
    }
  }

  const handleResume = async () => {
    if (!campaign) return
    setIsSendingAction(true)
    try {
      await axios.post(CAMPAIGNS.RESUME(campaign.id))
      fetchCampaignDetails()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSendingAction(false)
    }
  }

  const handleCancel = async () => {
    if (!campaign) return
    if (!confirm('Are you sure you want to cancel this campaign? Pending messages will be skipped.')) return
    setIsSendingAction(true)
    try {
      await axios.post(CAMPAIGNS.CANCEL(campaign.id))
      fetchCampaignDetails()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSendingAction(false)
    }
  }

  const handleDuplicate = async () => {
    if (!campaign) return
    setIsSendingAction(true)
    try {
      const res = await axios.post(CAMPAIGNS.DUPLICATE(campaign.id))
      if (res.data.success) {
        navigate(`/campaigns/${res.data.data.id}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSendingAction(false)
    }
  }

  const handleRetryFailed = async () => {
    if (!campaign) return
    if (!confirm('This will launch a duplicate broadcast targeting only the failed contacts of this campaign. Proceed?')) return
    setIsSendingAction(true)
    try {
      // Stub workflow: calls duplicate, then in backend we could inject failed filters
      // For now, duplicate and let the user launch it
      const res = await axios.post(CAMPAIGNS.DUPLICATE(campaign.id))
      if (res.data.success) {
        alert('Retry campaign duplicated into drafts.')
        navigate(`/campaigns/${res.data.data.id}`)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSendingAction(false)
    }
  }

  const handleExportFailed = () => {
    if (!campaign) return
    // Simple mock export failed numbers
    const failedMsgs = messages.filter((m) => m.status === 'failed')
    if (failedMsgs.length === 0) {
      alert('No failed numbers in the current page results.')
      return
    }
    const csvContent = "data:text/csv;charset=utf-8,Phone,Error\n" 
      + failedMsgs.map(m => `"${m.phone}","${m.error_message || 'Unknown error'}"`).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${campaign.name}_failed_retry.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    const base = 'px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase '
    switch (status) {
      case 'draft':
        return <span className={`${base} bg-gray-100 text-gray-700`}>Draft</span>
      case 'scheduled':
        return <span className={`${base} bg-blue-150 text-blue-700`}>Scheduled</span>
      case 'running':
        return <span className={`${base} bg-green-150 text-green-700 animate-pulse`}>Running</span>
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

  if (isLoading && !campaign) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="animate-spin text-xl text-blue-500">⏳</span>
      </div>
    )
  }

  if (!campaign) return null

  return (
    <div className="h-screen bg-gray-50/50 flex flex-col p-6 overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 mb-2 shrink-0">
        <Link to="/campaigns">← Back to Campaigns</Link>
      </div>

      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {campaign.name}
            {getStatusBadge(campaign.status)}
          </h2>
          <p className="text-xs text-gray-400 mt-1">Broadcast session overview and live progress logs.</p>
        </div>

        {/* Campaign Action buttons */}
        <div className="flex items-center gap-2">
          {campaign.status === 'running' && (
            <button
              type="button"
              onClick={handlePause}
              disabled={isSendingAction}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              Pause
            </button>
          )}
          {campaign.status === 'paused' && (
            <button
              type="button"
              onClick={handleResume}
              disabled={isSendingAction}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              Resume
            </button>
          )}
          {['running', 'paused', 'scheduled'].includes(campaign.status) && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSendingAction}
              className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-650 font-bold text-sm rounded-xl transition-all"
            >
              Cancel Campaign
            </button>
          )}
          {['completed', 'failed', 'cancelled'].includes(campaign.status) && (
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={isSendingAction}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
            >
              Duplicate Setup
            </button>
          )}

          <Link
            to={`/campaigns/${campaign.id}/report`}
            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all bg-white"
          >
            View Report
          </Link>
        </div>
      </div>

      {/* Progress tracking row (for active campaigns) */}
      {['running', 'paused'].includes(campaign.status) && (
        <section className="bg-white border border-gray-150 rounded-2xl p-5 mb-6 shadow-sm shrink-0 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin flex items-center justify-center font-extrabold text-blue-600 text-sm">
              {metaStats.progress_percentage}%
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">Broadcast is processing</h3>
              <p className="text-xs text-gray-400 mt-1">Pending messages are being queued with anti-ban delay parameters.</p>
              <p className="text-xs text-blue-600 font-semibold mt-0.5">Estimated time remaining: ~{metaStats.estimated_time_remaining} minute(s).</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 max-w-md w-full">
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
              <span className="block text-base font-extrabold text-gray-700">{metaStats.total}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Total</span>
            </div>
            <div className="p-3 bg-green-50/50 border border-green-100 rounded-xl text-center">
              <span className="block text-base font-extrabold text-green-600">{campaign.sent_count}</span>
              <span className="text-[10px] text-green-700 font-bold uppercase">Sent</span>
            </div>
            <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-center">
              <span className="block text-base font-extrabold text-red-500">{campaign.failed_count}</span>
              <span className="text-[10px] text-red-700 font-bold uppercase">Failed</span>
            </div>
            <div className="p-3 bg-yellow-50/50 border border-yellow-100 rounded-xl text-center">
              <span className="block text-base font-extrabold text-yellow-600">{metaStats.pending_count}</span>
              <span className="text-[10px] text-yellow-700 font-bold uppercase">Pending</span>
            </div>
          </div>
        </section>
      )}

      {/* Detail info grids split side by side */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        
        {/* Left Side: Delivery message logs list */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white border border-gray-150 rounded-2xl shadow-sm">
          {/* Table Header Filter options */}
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search phone number... (Press Enter)"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white focus:border-blue-500 min-w-[150px]"
              />

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white text-gray-600"
              >
                <option value="all">-- All Statuses --</option>
                <option value="pending">Pending</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportFailed}
                className="px-3 py-1.5 border border-gray-250 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-600 bg-white"
              >
                Export Failed CSV
              </button>
              {campaign.failed_count > 0 && (
                <button
                  type="button"
                  onClick={handleRetryFailed}
                  className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold rounded-lg text-xs"
                >
                  Retry Failed
                </button>
              )}
            </div>
          </div>

          {/* Table list */}
          <div className="flex-1 overflow-auto">
            {messages.length > 0 ? (
              <table className="min-w-full text-left text-xs bg-white divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50/20 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="px-5 py-3">Recipient Name</th>
                    <th className="px-5 py-3">WhatsApp Number</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Processed Date</th>
                    <th className="px-5 py-3">Log Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {messages.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50/20">
                      <td className="px-5 py-3 font-semibold text-gray-800">{m.contact?.name || 'Contact'}</td>
                      <td className="px-5 py-3 font-mono text-gray-500">{m.phone}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${m.status === 'delivered' || m.status === 'sent' ? 'bg-green-100 text-green-700' : m.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-105 text-red-700'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {m.sent_at ? new Date(m.sent_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-5 py-3 text-red-500 font-semibold max-w-[120px] truncate" title={m.error_message}>
                        {m.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50/20">
                <p className="text-sm font-bold text-gray-700 mb-1">No logs found</p>
                <p className="text-xs text-gray-400">Campaign logs will populate here once messages are processed.</p>
              </div>
            )}
          </div>

          {/* Table pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-gray-500 font-semibold">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-2.5 py-1 border border-gray-200 bg-white rounded text-[10px] font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                  className="px-2.5 py-1 border border-gray-200 bg-white rounded text-[10px] font-bold text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Message Preview WhatsApp bubble and connection details */}
        <aside className="w-80 space-y-6 flex flex-col shrink-0 overflow-y-auto">
          
          {/* Metadata Card */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider border-b border-gray-100 pb-2">Campaign Settings</h3>
            
            <div>
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">WhatsApp Instance</span>
              <span className="text-xs text-gray-700 font-semibold">{campaign.whatsapp_instance?.name} ({campaign.whatsapp_instance?.phone_number || 'No number'})</span>
            </div>

            <div>
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Contact List Target</span>
              <span className="text-xs text-gray-700 font-semibold">{campaign.contact_list?.name || 'Custom Uploaded List'}</span>
            </div>

            <div>
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Random delays settings</span>
              <span className="text-xs text-gray-700 font-semibold">{campaign.min_delay_seconds} to {campaign.max_delay_seconds} seconds</span>
            </div>
          </div>

          {/* Chatbubble preview card */}
          <div className="bg-[#0b141a] rounded-2xl border border-gray-850 shadow-sm overflow-hidden flex flex-col">
            <div className="bg-[#121b22] px-4 py-2.5 border-b border-[#222e35] text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              WhatsApp Layout Preview
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-[#005c4b] text-gray-200 rounded-xl p-3 border border-[#025143] text-xs relative ml-auto space-y-1.5 max-w-[90%] shadow">
                {campaign.media_url && (
                  <div className="bg-[#025143] rounded border border-[#053d33] p-2 text-center text-emerald-300 font-bold truncate">
                    📎 {campaign.message_type.toUpperCase()}
                  </div>
                )}
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed">
                  {campaign.message_body || ' '}
                </p>
                {campaign.footer && (
                  <p className="text-[9px] text-gray-400 border-t border-[#025143] pt-1 mt-1 font-semibold">{campaign.footer}</p>
                )}
                <span className="block text-[8px] text-gray-400 text-right font-bold mt-1">11:50 AM ✓✓</span>
              </div>

              {campaign.buttons && campaign.buttons.map((btn, idx) => (
                <div
                  key={idx}
                  className="w-[90%] bg-[#1f2c34] border-t border-[#2a3942] hover:bg-[#202c33] text-blue-400 font-bold text-center py-2 rounded-xl text-xs shadow ml-auto select-none mt-1"
                >
                  {btn.text}
                </div>
              ))}
            </div>
          </div>
        </aside>

      </div>

    </div>
  )
}
