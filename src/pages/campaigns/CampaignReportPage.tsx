import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CAMPAIGNS } from '../../api/endpoints.js'
import { CampaignReport, CampaignMessage } from '../../types/index.js'
import axios from 'axios'

export const CampaignReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  
  const [report, setReport] = useState<CampaignReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchReport()
  }, [id])

  const fetchReport = async () => {
    if (!id) return
    setIsLoading(true)
    try {
      const res = await axios.get(CAMPAIGNS.REPORT(parseInt(id)))
      if (res.data.success) {
        setReport(res.data.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    if (!report) return
    const csvContent = "data:text/csv;charset=utf-8,Contact Name,Phone,Status,Sent At,Error\n"
      + report.messages.map(m => `"${m.contact?.name || 'Contact'}","${m.phone}","${m.status}","${m.sent_at || ''}","${m.error_message || ''}"`).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `${report.campaign.name}_metrics_report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading && !report) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="animate-spin text-xl text-blue-500">⏳</span>
      </div>
    )
  }

  if (!report) return null

  const { campaign, summary, messages, hourly_breakdown } = report

  // Filter messages shown in report table
  const filteredMessages = messages.filter((m) => {
    if (filterStatus === 'all') return true
    return m.status === filterStatus
  })

  // Chart proportions
  const successCount = summary.sent - summary.failed
  const failedCount = summary.failed
  const skippedCount = summary.skipped
  const totalGraphCount = Math.max(1, successCount + failedCount + skippedCount)
  
  const successPct = Math.round((successCount / totalGraphCount) * 100)
  const failedPct = Math.round((failedCount / totalGraphCount) * 100)
  const skippedPct = Math.round((skippedCount / totalGraphCount) * 100)

  // Max sends in hourly breakdown for scale
  const maxHourSent = Math.max(...hourly_breakdown.map((h) => h.sent), 1)

  return (
    <div className="h-screen bg-gray-50/50 overflow-y-auto p-6 flex flex-col font-sans">
      
      {/* CSS overrides for print style */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside, header, nav, button, .no-print {
            display: none !important;
          }
          body, .flex, .h-screen {
            background-color: white !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            box-shadow: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}} />

      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 shrink-0 no-print">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700 mb-1.5">
            <Link to={`/campaigns/${campaign.id}`}>← Back to Live Session</Link>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Analytics Summary</h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-xl transition-all bg-white"
          >
            Export All CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-blue-100"
          >
            Print Report
          </button>
        </div>
      </div>

      {/* Print-only business header */}
      <div className="hidden print:block mb-8 border-b-2 border-gray-200 pb-4">
        <h1 className="text-2xl font-black text-gray-900">WASp Broadcaster Platform</h1>
        <p className="text-sm text-gray-500 font-semibold">Official Campaign Transmission Metrics</p>
      </div>

      <div className="print-full-width max-w-5xl mx-auto space-y-6">
        
        {/* Campaign title & metadata */}
        <section className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-wrap justify-between items-center gap-4 print-full-width">
          <div>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Campaign Title</span>
            <h3 className="text-lg font-bold text-gray-800">{campaign.name}</h3>
            <p className="text-xs text-gray-400 mt-1 font-semibold">Status: <span className="uppercase text-blue-600">{campaign.status}</span></p>
          </div>

          <div className="flex gap-8 text-xs font-semibold text-gray-600">
            <div>
              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Started</span>
              <span>{campaign.started_at ? new Date(campaign.started_at).toLocaleString() : 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Completed</span>
              <span>{campaign.completed_at ? new Date(campaign.completed_at).toLocaleString() : 'N/A'}</span>
            </div>
            <div>
              <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Duration</span>
              <span>{summary.duration_minutes} minutes</span>
            </div>
          </div>
        </section>

        {/* 4 Summary StatCards */}
        <section className="grid grid-cols-4 gap-5 print-full-width">
          <div className="p-4 bg-white border border-gray-150 rounded-2xl shadow-sm text-center">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Target</span>
            <span className="text-2xl font-extrabold text-gray-800">{summary.total}</span>
          </div>
          <div className="p-4 bg-white border border-gray-150 rounded-2xl shadow-sm text-center">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Delivered (Sent)</span>
            <span className="text-2xl font-extrabold text-green-600">{summary.sent}</span>
          </div>
          <div className="p-4 bg-white border border-gray-150 rounded-2xl shadow-sm text-center">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Failed Sends</span>
            <span className="text-2xl font-extrabold text-red-500">{summary.failed}</span>
          </div>
          <div className="p-4 bg-white border border-gray-150 rounded-2xl shadow-sm text-center">
            <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery Rate</span>
            <span className="text-2xl font-extrabold text-blue-600">{summary.delivery_rate}%</span>
          </div>
        </section>

        {/* Graphical Section: Donut delivery shares & Hourly bar graph */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 print-full-width">
          
          {/* Donut chart summary details */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Delivery Shares Breakdown</h4>
            
            <div className="flex items-center justify-center py-4">
              {/* Custom SVG Donut Graph */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Gray background ring */}
                  <circle cx="50" cy="50" r="40" stroke="#f3f4f6" strokeWidth="12" fill="transparent" />
                  
                  {/* Success portion (green) */}
                  <circle
                    cx="50" cy="50" r="40"
                    stroke="#10b981" strokeWidth="12" fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * successPct) / 100}
                  />
                  
                  {/* Failed portion (red) */}
                  <circle
                    cx="50" cy="50" r="40"
                    stroke="#ef4444" strokeWidth="12" fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * failedPct) / 100}
                    style={{ transformOrigin: '50% 50%', transform: `rotate(${(successPct / 100) * 360}deg)` }}
                  />

                  {/* Skipped portion (gray) */}
                  <circle
                    cx="50" cy="50" r="40"
                    stroke="#9ca3af" strokeWidth="12" fill="transparent"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * skippedPct) / 100}
                    style={{ transformOrigin: '50% 50%', transform: `rotate(${((successPct + failedPct) / 100) * 360}deg)` }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-sm font-extrabold text-gray-800">{summary.delivery_rate}%</span>
                  <span className="text-[9px] text-gray-400 font-bold uppercase">Success</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-6 text-[10px] font-bold text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span>Success: {successPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-red-500" />
                <span>Failed: {failedPct}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-gray-400" />
                <span>Skipped: {skippedPct}%</span>
              </div>
            </div>
          </div>

          {/* Bar Chart: Hourly Breakdown */}
          <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">Hourly Send Breakdown</h4>
            
            {hourly_breakdown.length > 0 ? (
              <div className="flex items-end justify-between gap-2 h-36 pt-4 px-2">
                {hourly_breakdown.map((item, idx) => {
                  const successHeight = ((item.sent - item.failed) / maxHourSent) * 100
                  const failedHeight = (item.failed / maxHourSent) * 100

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-gray-50 rounded-md h-24 flex flex-col justify-end overflow-hidden border border-gray-100 relative group">
                        
                        {/* Failed stacked section (red) */}
                        <div
                          style={{ height: `${failedHeight}%` }}
                          className="w-full bg-red-500 transition-all"
                          title={`Failed: ${item.failed}`}
                        />
                        
                        {/* Success stacked section (green) */}
                        <div
                          style={{ height: `${successHeight}%` }}
                          className="w-full bg-emerald-500 transition-all"
                          title={`Success: ${item.sent - item.failed}`}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-gray-400">{item.hour}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">No hourly data tracked.</div>
            )}
          </div>
        </section>

        {/* Detailed logs table */}
        <section className="bg-white border border-gray-150 rounded-2xl shadow-sm overflow-hidden flex flex-col print-full-width">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between no-print">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transmissions logs</span>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white text-gray-600"
            >
              <option value="all">All Log Statuses</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs bg-white divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">Recipient Name</th>
                  <th className="px-5 py-3">WhatsApp Number</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sent Time</th>
                  <th className="px-5 py-3">Error Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMessages.map((msg) => {
                  let rowBg = 'bg-white'
                  if (msg.status === 'failed') rowBg = 'bg-red-50/20'
                  else if (msg.status === 'skipped') rowBg = 'bg-gray-50/60'

                  return (
                    <tr key={msg.id} className={`${rowBg}`}>
                      <td className="px-5 py-3 font-semibold text-gray-800">{msg.contact?.name || 'Contact'}</td>
                      <td className="px-5 py-3 font-mono text-gray-500">{msg.phone}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${msg.status === 'delivered' || msg.status === 'sent' ? 'bg-green-150 text-green-700' : msg.status === 'pending' ? 'bg-yellow-105 text-yellow-700' : 'bg-red-150 text-red-700'}`}>
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {msg.sent_at ? new Date(msg.sent_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-5 py-3 text-red-500 font-semibold" title={msg.error_message}>
                        {msg.error_message || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
