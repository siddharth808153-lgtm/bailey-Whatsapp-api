import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { INSTANCES } from '../../api/endpoints.js'
import { WhatsappInstance } from '../../types/index.js'

export const ConnectionsPage: React.FC = () => {
  const [instances, setInstances] = useState<WhatsappInstance[]>([])
  const [loading, setLoading] = useState(true)

  // QR Modal State
  const [qrModalInstance, setQrModalInstance] = useState<WhatsappInstance | null>(null)
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [qrStatus, setQrStatus] = useState<string>('')
  
  // Add Connection Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [adding, setAdding] = useState(false)

  const fetchInstances = async () => {
    try {
      const res = await axios.get(INSTANCES.LIST)
      setInstances(res.data.data || [])
    } catch (err) {
      console.error('Failed to fetch instances', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstances()
  }, [])

  // Poll for QR updates if QR modal is open
  useEffect(() => {
    if (!qrModalInstance) return

    let active = true
    const poll = async () => {
      try {
        const res = await axios.get(INSTANCES.DETAIL(qrModalInstance.id))
        const data = res.data.data
        if (!active) return

        setQrImage(data.qr_image)
        setQrStatus(data.status)

        // If it got connected, close modal and reload list
        if (data.status === 'connected') {
          setQrModalInstance(null)
          fetchInstances()
        }
      } catch (err) {
        console.error(err)
      }
    }

    poll() // Initial fetch
    const interval = setInterval(poll, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [qrModalInstance])

  // Poll connecting or qr_ready instances from list view
  useEffect(() => {
    const needPolling = instances.some(
      ins => ins.status === 'connecting' || ins.status === 'qr_ready'
    )
    if (!needPolling) return

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(INSTANCES.LIST)
        setInstances(res.data.data || [])
      } catch (err) {
        console.error(err)
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [instances])

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return alert('Please enter instance name.')

    setAdding(true)
    try {
      const res = await axios.post(INSTANCES.CREATE, {
        name,
        webhook_url: webhookUrl || undefined
      })
      setIsAddModalOpen(false)
      setName('')
      setWebhookUrl('')
      fetchInstances()

      // If created successfully, automatically open QR modal for pairing
      const newInst = res.data.data
      handleOpenQrModal(newInst)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create instance')
    } finally {
      setAdding(false)
    }
  }

  const handleOpenQrModal = async (inst: WhatsappInstance) => {
    setQrModalInstance(inst)
    setQrImage(null)
    setQrStatus(inst.status)
  }

  const handleConnect = async (id: number) => {
    try {
      await axios.post(INSTANCES.CONNECT(id))
      fetchInstances()
      // Open QR modal to show scan progress
      const inst = instances.find(i => i.id === id)
      if (inst) {
        handleOpenQrModal(inst)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to connect')
    }
  }

  const handleDisconnect = async (id: number) => {
    if (!confirm('Are you sure you want to temporarily disconnect this connection?')) return
    try {
      await axios.post(INSTANCES.DISCONNECT(id))
      fetchInstances()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to disconnect')
    }
  }

  const handleLogout = async (id: number) => {
    if (!confirm('Are you sure you want to log out? You will need to scan QR code again.')) return
    try {
      await axios.post(INSTANCES.LOGOUT(id))
      fetchInstances()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to log out')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Wipe this connection from database and delete session storage? This cannot be undone.')) return
    try {
      await axios.delete(INSTANCES.DELETE(id))
      fetchInstances()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete instance')
    }
  }

  const getStatusBadge = (status: WhatsappInstance['status']) => {
    const map = {
      connected: { label: 'Connected', style: 'bg-green-100 text-green-700' },
      qr_ready: { label: 'Scan QR', style: 'bg-blue-100 text-blue-700 animate-pulse' },
      connecting: { label: 'Connecting', style: 'bg-amber-100 text-amber-700 animate-pulse' },
      disconnected: { label: 'Disconnected', style: 'bg-gray-100 text-gray-600' },
      logged_out: { label: 'Logged Out', style: 'bg-gray-100 text-gray-500' },
      banned: { label: 'Banned', style: 'bg-red-100 text-red-700' },
    }
    const info = map[status] || { label: status, style: 'bg-gray-100 text-gray-700' }
    return <span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase rounded-full tracking-wider shrink-0 ${info.style}`}>{info.label}</span>
  }

  // Calculate Metrics
  const connectedCount = instances.filter(i => i.status === 'connected').length
  const totalCount = instances.length
  const messagesToday = instances.reduce((sum, i) => sum + (i.sent_today || 0), 0)
  const messagesMonth = instances.reduce((sum, i) => sum + (i.sent_this_month || 0), 0)

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">WhatsApp Connections</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and pair WhatsApp Baileys instances to activate automation features.</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
          >
            <span>📱</span> Link WhatsApp
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Connected Accounts</p>
            <h3 className="text-2xl font-black text-green-600 mt-1">{connectedCount} / {totalCount}</h3>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Status</p>
            <h3 className="text-2xl font-black text-gray-950 mt-1">Ready</h3>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sent Today</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{messagesToday}</h3>
          </div>
          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sent This Month</p>
            <h3 className="text-2xl font-black text-purple-600 mt-1">{messagesMonth}</h3>
          </div>
        </div>

        {/* Instances Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-semibold">Loading connections...</div>
        ) : instances.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm max-w-xl mx-auto">
            <span className="text-4xl">📱</span>
            <h3 className="text-lg font-bold text-gray-900 mt-4">Link Your WhatsApp Number</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Create a Baileys session and scan the QR code to connect your phone number and begin scheduling bulk broadcasts or drip steps.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-all inline-flex items-center gap-2"
            >
              Add Your First Connection
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instances.map(inst => {
              const usagePercent = inst.daily_limit > 0 ? minPercentage(inst.sent_today, inst.daily_limit) : 0
              return (
                <div key={inst.id} className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-extrabold text-gray-900 text-sm truncate">{inst.name}</h3>
                      {getStatusBadge(inst.status)}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-1">{inst.phone_number || 'Not connected yet'}</p>
                    
                    {/* Progress details */}
                    {inst.status === 'connected' && (
                      <div className="mt-5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-600 uppercase tracking-wider">
                          <span>Daily usage</span>
                          <span>{inst.sent_today} / {inst.daily_limit} msg</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${usagePercent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Webhook Url Details */}
                    {inst.webhook_url && (
                      <div className="mt-4 bg-gray-50 rounded-xl p-2.5 border border-gray-100/50">
                        <span className="text-[9px] text-gray-400 font-bold uppercase block">Webhook Callback URL</span>
                        <span className="text-[10px] font-semibold text-gray-600 truncate block mt-0.5">{inst.webhook_url}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between gap-3 flex-wrap">
                    
                    {/* Primary connecting operations */}
                    <div>
                      {inst.status === 'connected' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDisconnect(inst.id)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                          >
                            Disconnect
                          </button>
                          <button
                            onClick={() => handleLogout(inst.id)}
                            className="bg-red-50 hover:bg-red-105 text-red-600 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors"
                          >
                            Logout
                          </button>
                        </div>
                      )}

                      {(inst.status === 'disconnected' || inst.status === 'logged_out') && (
                        <button
                          onClick={() => handleConnect(inst.id)}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg shadow-sm transition-colors"
                        >
                          Connect
                        </button>
                      )}

                      {inst.status === 'qr_ready' && (
                        <button
                          onClick={() => handleOpenQrModal(inst)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-4 rounded-lg shadow-sm transition-colors"
                        >
                          Scan QR Code
                        </button>
                      )}

                      {inst.status === 'connecting' && (
                        <span className="text-xs text-amber-500 font-bold animate-pulse">Initializing socket...</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(inst.id)}
                      title="Delete instance"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      🗑️
                    </button>

                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* QR Code Scan Modal */}
      {qrModalInstance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 md:p-8 space-y-6 text-center">
              
              <div>
                <h3 className="text-lg font-black text-gray-950 tracking-tight">Scan QR Code</h3>
                <p className="text-xs text-gray-400 mt-1">Open WhatsApp on your phone, tap Linked Devices, and scan this QR code.</p>
              </div>

              {/* QR Image Frame */}
              <div className="flex items-center justify-center bg-gray-50 border border-gray-150 p-6 rounded-2xl max-w-[240px] mx-auto min-h-[240px]">
                {qrImage ? (
                  <img src={qrImage} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center space-y-2">
                    <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin mx-auto"></div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Generating code...</p>
                  </div>
                )}
              </div>

              {/* QR Status Banner */}
              <div className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Status: <span className="text-blue-600 animate-pulse">{qrStatus}</span>
              </div>

              <button
                onClick={() => setQrModalInstance(null)}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Add Connection Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100">
            <div className="p-6 md:p-8 space-y-5">
              
              <div>
                <h3 className="text-lg font-black text-gray-950 tracking-tight">Add Connection</h3>
                <p className="text-xs text-gray-400 mt-0.5">Initialize a Baileys session for a new WhatsApp number.</p>
              </div>

              <form onSubmit={handleCreateInstance} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Instance Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Sales WhatsApp"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Webhook URL (Optional)</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={e => setWebhookUrl(e.target.value)}
                    placeholder="https://yourdomain.com/callbacks/whatsapp"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adding}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/20"
                  >
                    {adding ? 'Initializing...' : 'Add Connection'}
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

function minPercentage(sent: number, limit: number): number {
  if (limit <= 0) return 0
  return Math.min(100, Math.round((sent / limit) * 100))
}
