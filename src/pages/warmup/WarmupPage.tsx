import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { WARMUP, INSTANCES } from '../../api/endpoints.js'
import { WarmupStatus, WhatsappInstance } from '../../types/index.js'

export const WarmupPage: React.FC = () => {
  const navigate = useNavigate()
  const [warmups, setWarmups] = useState<WarmupStatus[]>([])
  const [allInstances, setAllInstances] = useState<WhatsappInstance[]>([])
  const [loading, setLoading] = useState(true)

  // Start modal states
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [selectedInstanceId, setSelectedInstanceId] = useState<number | null>(null)
  const [partnerMode, setPartnerMode] = useState<'auto' | 'custom'>('auto')
  const [customPartnerId, setCustomPartnerId] = useState('')
  const [starting, setStarting] = useState(false)

  // Detailed status modal states for history and day schedule check
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [statusDetail, setStatusDetail] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // History modal states
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [historyList, setHistoryList] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const fetchWarmups = async () => {
    try {
      const res = await axios.get(WARMUP.LIST)
      setWarmups(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllInstances = async () => {
    try {
      const res = await axios.get(INSTANCES.LIST)
      setAllInstances(res.data.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchWarmups()
    fetchAllInstances()

    // Auto-refresh every 30 seconds for in-progress warmups
    const timer = setInterval(() => {
      fetchWarmups()
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  const handleOpenStartModal = (instId: number) => {
    setSelectedInstanceId(instId)
    setPartnerMode('auto')
    setCustomPartnerId('')
    setIsStartModalOpen(true)
  }

  const handleStartWarmup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInstanceId) return

    setStarting(true)
    try {
      await axios.post(WARMUP.START, {
        instance_id: selectedInstanceId,
        partner_instance_id: partnerMode === 'custom' && customPartnerId ? Number(customPartnerId) : undefined
      })
      setIsStartModalOpen(false)
      fetchWarmups()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start warmup session.')
    } finally {
      setStarting(false)
    }
  }

  const handleStopWarmup = async (instId: number) => {
    if (!confirm('Are you sure you want to stop the warmup process for this instance? Today\'s progress will be saved but the automated exchange will pause.')) return
    try {
      await axios.post(WARMUP.STOP(instId))
      fetchWarmups()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to stop warmup.')
    }
  }

  const handleViewStatus = async (instId: number) => {
    setLoadingStatus(true)
    setIsStatusModalOpen(true)
    try {
      const res = await axios.get(WARMUP.STATUS(instId))
      setStatusDetail(res.data.data)
    } catch (err: any) {
      alert('Failed to fetch detailed warmup status')
      setIsStatusModalOpen(false)
    } finally {
      setLoadingStatus(false)
    }
  }

  const handleViewHistory = async (instId: number) => {
    setLoadingHistory(true)
    setIsHistoryModalOpen(true)
    try {
      const res = await axios.get(WARMUP.HISTORY(instId))
      // Handle pagination wrapper
      const list = res.data.data.data || res.data.data || []
      setHistoryList(list)
    } catch (err: any) {
      alert('Failed to fetch warmup history')
      setIsHistoryModalOpen(false)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Get other connected instances for partner selection
  const eligiblePartners = allInstances.filter(
    ins => ins.id !== selectedInstanceId && ins.status === 'connected'
  )

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Number Warmer</h1>
          <p className="text-sm text-gray-500 mt-1">Gradually warm up your WhatsApp connections to establish sender reputation and avoid bans.</p>
        </div>

        {/* How It Works Info Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl p-6 shadow-xl mb-8 flex flex-col md:flex-row gap-6 justify-between items-center border border-blue-700">
          <div className="space-y-2">
            <h2 className="text-lg font-black leading-tight flex items-center gap-2">
              <span>🔥</span> How WhatsApp Warming Works
            </h2>
            <p className="text-xs text-blue-100 max-w-2xl">
              Fresh WhatsApp numbers are highly sensitive to sudden message bursts. Number warmer exchanges peer-to-peer messages with platforms and user-selected partner numbers, slowly ramping up daily targets over a 7-day schedule with natural conversation delays.
            </p>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="text-center bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">Duration</span>
              <span className="text-sm font-black mt-0.5 block">7 Days</span>
            </div>
            <div className="text-center bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">Delay</span>
              <span className="text-sm font-black mt-0.5 block">30s - 120s</span>
            </div>
          </div>
        </div>

        {/* Warmup instances grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-semibold">Loading warmup status...</div>
        ) : warmups.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm">
            <span className="text-4xl">📱</span>
            <h3 className="text-lg font-bold text-gray-900 mt-4">No WhatsApp instances found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Create and link WhatsApp instances under the Connections page before starting the warmer.</p>
            <button
              onClick={() => navigate('/instances')}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              Go to Connections
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warmups.map(inst => {
              
              // 1. Not Connected
              if (inst.status !== 'connected') {
                return (
                  <div key={inst.id} className="bg-gray-100/60 border border-gray-250 rounded-3xl p-6 shadow-sm flex flex-col justify-between opacity-70">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-gray-900 text-sm truncate">{inst.name}</h3>
                        <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full tracking-wider bg-gray-200 text-gray-600">
                          Offline
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold tracking-wider mt-1">{inst.phone_number || 'Unlinked'}</p>
                      
                      <div className="mt-8 bg-gray-50 rounded-2xl p-4 text-center border border-gray-200/50">
                        <span className="text-xs font-bold text-gray-500 block">⚠️ Number disconnected</span>
                        <p className="text-[10px] text-gray-400 mt-0.5">Connect this instance first to start warmup.</p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/instances')}
                      className="mt-6 w-full py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                    >
                      Connect Now
                    </button>
                  </div>
                )
              }

              // 2. Warmed (Complete)
              if (inst.is_warmed) {
                return (
                  <div key={inst.id} className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-gray-900 text-sm truncate">{inst.name}</h3>
                        <span className="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded-full tracking-wider bg-green-100 text-green-700">
                          ✅ Warmed
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold tracking-wider mt-1">{inst.phone_number}</p>
                      
                      <div className="mt-6 bg-green-50/50 border border-green-100 rounded-2xl p-4">
                        <span className="text-xs font-extrabold text-green-800 block">Ready for campaigns</span>
                        <p className="text-[10px] text-green-600 mt-0.5 leading-relaxed">
                          This instance completed the 7-day warmup schedule and has stable sender reputation.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => handleViewStatus(inst.id)}
                        className="flex-1 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold transition-all"
                      >
                        View Status
                      </button>
                      <button
                        onClick={() => handleViewHistory(inst.id)}
                        className="flex-1 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold transition-all"
                      >
                        Logs
                      </button>
                    </div>
                  </div>
                )
              }

              // 3. Warming (In Progress)
              if (inst.warmup_started_at) {
                return (
                  <div key={inst.id} className="bg-white border border-blue-200 rounded-3xl p-6 shadow-md flex flex-col justify-between hover:shadow-lg transition-all relative">
                    <div className="absolute top-3 right-3 animate-ping w-2 h-2 rounded-full bg-blue-600"></div>
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-gray-900 text-sm truncate">{inst.name}</h3>
                        <span className="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded-full tracking-wider bg-blue-100 text-blue-700">
                          🔥 Warming
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold tracking-wider mt-1">{inst.phone_number}</p>

                      {/* Progress Metrics */}
                      <div className="mt-5 space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold text-gray-700">
                          <span>Day {inst.warmup_day} of 7</span>
                          <span>{inst.warmup_progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${inst.warmup_progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                          <span>Today's Progress</span>
                          <span className="text-gray-900 font-black">{inst.today_sent} / {inst.today_target} msg</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => handleViewStatus(inst.id)}
                        className="flex-1 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-bold transition-all"
                      >
                        Breakdown
                      </button>
                      <button
                        onClick={() => handleStopWarmup(inst.id)}
                        className="flex-1 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold transition-all"
                      >
                        Stop Warmup
                      </button>
                    </div>
                  </div>
                )
              }

              // 4. Not Warmed (Ready to start)
              return (
                <div key={inst.id} className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-gray-900 text-sm truncate">{inst.name}</h3>
                      <span className="px-2.5 py-1 text-[9px] font-extrabold uppercase rounded-full tracking-wider bg-amber-100 text-amber-700">
                        ⚠️ Not Warmed
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-semibold tracking-wider mt-1">{inst.phone_number}</p>
                    
                    <div className="mt-6 bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-xs font-bold text-amber-800">
                      <span>Suspension Risk: High</span>
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5 leading-relaxed">
                        Avoid running large bulk campaigns on this number before warming to minimize ban risk.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenStartModal(inst.id)}
                    className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all"
                  >
                    Start Warming
                  </button>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Start Warming Confirmation Modal */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 md:p-8 space-y-6">
              
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-gray-950 tracking-tight">Warmup Configuration</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Define warmup scheduler settings.</p>
                </div>
                <button
                  onClick={() => setIsStartModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleStartWarmup} className="space-y-6">
                
                {/* 7-Day Targets Table */}
                <div className="bg-gray-50 border border-gray-150 rounded-2xl p-4 space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center mb-2">7-Day Daily Ramping Target</p>
                  <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-gray-600">
                    <div>
                      <span className="block text-gray-400">D1</span>
                      <span className="block text-gray-900 mt-0.5">20</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">D2</span>
                      <span className="block text-gray-900 mt-0.5">35</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">D3</span>
                      <span className="block text-gray-900 mt-0.5">55</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">D4</span>
                      <span className="block text-gray-900 mt-0.5">80</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">D5</span>
                      <span className="block text-gray-900 mt-0.5">110</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">D6</span>
                      <span className="block text-gray-900 mt-0.5">150</span>
                    </div>
                    <div>
                      <span className="block text-gray-400">D7</span>
                      <span className="block text-gray-900 mt-0.5">200</span>
                    </div>
                  </div>
                </div>

                {/* Partner selector options */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Exchange Partner Mode</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={partnerMode === 'auto'}
                        onChange={() => setPartnerMode('auto')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Auto (Use Platform Numbers)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={partnerMode === 'custom'}
                        onChange={() => setPartnerMode('custom')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span>Use My Other Connected Number</span>
                    </label>
                  </div>
                </div>

                {partnerMode === 'custom' && (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Partner Connection</label>
                    <select
                      value={customPartnerId}
                      onChange={e => setCustomPartnerId(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500"
                    >
                      <option value="">-- Select Partner Instance --</option>
                      {eligiblePartners.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.phone_number || 'No number'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsStartModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={starting}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/25"
                  >
                    {starting ? 'Initializing...' : 'Confirm & Start'}
                  </button>
                </div>

              </form>

            </div>
          </div>
        </div>
      )}

      {/* Detailed Status Breakdown Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-950 tracking-tight">Warmup Status breakdown</h3>
                <button onClick={() => setIsStatusModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {loadingStatus ? (
                <div className="text-center py-12 text-gray-400">Loading breakdown metrics...</div>
              ) : statusDetail ? (
                <div className="space-y-6">
                  {/* Totals */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-50 p-3 rounded-2xl">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Current Day</span>
                      <span className="text-lg font-black text-gray-900 mt-1 block">{statusDetail.current_day}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Today Sent</span>
                      <span className="text-lg font-black text-blue-600 mt-1 block">{statusDetail.today_sent} / {statusDetail.today_target}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Sent</span>
                      <span className="text-lg font-black text-emerald-600 mt-1 block">{statusDetail.total_sent}</span>
                    </div>
                  </div>

                  {/* 7-Day progress checklist */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Warmup Progress Checklist</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {statusDetail.schedule?.map((day: any) => (
                        <div key={day.day} className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                          day.active ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-100'
                        }`}>
                          <span className="text-gray-700">Day {day.day} ({day.target} target)</span>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">{day.sent} sent</span>
                            {day.completed ? (
                              <span className="text-green-600">✅ Done</span>
                            ) : day.active ? (
                              <span className="text-blue-500 animate-pulse">🔄 Active</span>
                            ) : (
                              <span className="text-gray-400">⏳ Pending</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">No data found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warmup Logs History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-gray-950 tracking-tight">Warmup History Logs</h3>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              {loadingHistory ? (
                <div className="text-center py-12 text-gray-400">Loading history logs...</div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No previous sessions logged.</div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                  {historyList.map(session => (
                    <div key={session.id} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl flex justify-between items-center text-xs font-semibold text-gray-600">
                      <div>
                        <span className="text-gray-900 font-extrabold block">Warmup Day {session.day_number}</span>
                        <span className="text-[10px] text-gray-400">Partner: {session.partner_instance?.name || 'Platform Number'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-950 font-black block">{session.sent_count} / {session.target_messages} sent</span>
                        <span className={`text-[9px] font-extrabold uppercase rounded px-1.5 py-0.5 mt-0.5 inline-block ${
                          session.status === 'completed' ? 'bg-green-100 text-green-700' :
                          session.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
