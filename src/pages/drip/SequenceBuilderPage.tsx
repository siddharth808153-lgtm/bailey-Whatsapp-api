import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { DRIP, INSTANCES } from '../../api/endpoints.js'
import { DripSequence, DripStep, WhatsappInstance } from '../../types/index.js'
import { StepEditorModal } from '../../components/drip/StepEditorModal.js'

export const SequenceBuilderPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  // Sequence state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instanceId, setInstanceId] = useState('')
  const [status, setStatus] = useState<'active' | 'paused'>('active')

  // Steps state
  const [steps, setSteps] = useState<DripStep[]>([])
  
  // Available instances
  const [instances, setInstances] = useState<WhatsappInstance[]>([])

  // Modal editor states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<DripStep | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    fetchInstances()
    if (isEdit) {
      fetchSequenceDetails()
    }
  }, [id])

  const fetchInstances = async () => {
    try {
      const res = await axios.get(INSTANCES.LIST)
      // Only connected instances allowed
      const list = (res.data.data || []).filter((ins: WhatsappInstance) => ins.status === 'connected')
      setInstances(list)
      if (list.length > 0 && !isEdit) {
        setInstanceId(list[0].id.toString())
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSequenceDetails = async () => {
    setLoading(true)
    try {
      const res = await axios.get(DRIP.SEQUENCE_DETAIL(Number(id)))
      const seq: DripSequence = res.data.data
      setName(seq.name)
      setDescription(seq.description || '')
      setInstanceId(seq.instance_id.toString())
      setStatus(seq.status === 'archived' ? 'paused' : seq.status)
      setSteps(seq.drip_steps || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return alert('Please enter sequence name.')
    if (!instanceId) return alert('Please select WhatsApp connection instance.')

    setSavingSettings(true)
    try {
      if (isEdit) {
        await axios.put(DRIP.SEQUENCE_UPDATE(Number(id)), { name, description, status })
        alert('Sequence settings updated successfully.')
      } else {
        const res = await axios.post(DRIP.SEQUENCE_CREATE, {
          name,
          description,
          instance_id: Number(instanceId),
          status
        })
        const newSeq = res.data.data
        navigate(`/drip/${newSeq.id}/edit`)
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save sequence.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleAddStepClick = () => {
    setEditingStep(null)
    setIsModalOpen(true)
  }

  const handleEditStepClick = (step: DripStep) => {
    setEditingStep(step)
    setIsModalOpen(true)
  }

  const handleSaveStep = async (stepData: Partial<DripStep>) => {
    if (!isEdit) {
      alert('Please save the sequence settings first.')
      return
    }

    try {
      if (editingStep) {
        // Edit step API call
        await axios.put(DRIP.STEP_UPDATE(Number(id), editingStep.id), stepData)
      } else {
        // Create step API call
        await axios.post(DRIP.STEP_CREATE(Number(id)), stepData)
      }
      setIsModalOpen(false)
      fetchSequenceDetails()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save step.')
    }
  }

  const handleDeleteStep = async (stepId: number) => {
    if (!confirm('Are you sure you want to delete this step?')) return
    try {
      await axios.delete(DRIP.STEP_DELETE(Number(id), stepId))
      fetchSequenceDetails()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete step.')
    }
  }

  const handleMoveStep = async (index: number, direction: 'up' | 'down') => {
    if (!isEdit) return
    const newSteps = [...steps]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    
    if (targetIdx < 0 || targetIdx >= newSteps.length) return

    // Swap elements
    const temp = newSteps[index]
    newSteps[index] = newSteps[targetIdx]
    newSteps[targetIdx] = temp

    // Format payload for reorder API
    const payload = newSteps.map((step, idx) => ({
      id: step.id,
      step_number: idx + 1
    }))

    try {
      await axios.post(DRIP.STEPS_REORDER(Number(id)), { steps: payload })
      fetchSequenceDetails()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reorder steps')
    }
  }

  // Calculate cumulative wait days & hours for timeline days computation
  const getStepDayAndHourOffset = (index: number) => {
    let days = 0
    let hours = 0
    for (let i = 0; i <= index; i++) {
      days += steps[i].wait_days
      hours += steps[i].wait_hours
    }
    // Convert overflow hours to days
    if (hours >= 24) {
      days += Math.floor(hours / 24)
      hours = hours % 24
    }
    return { days, hours }
  }

  return (
    <div className="h-full overflow-hidden bg-gray-50/50 flex flex-col">
      
      {/* Top Header */}
      <div className="bg-white border-b border-gray-150 py-4 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/drip')}
            className="text-gray-400 hover:text-gray-700 font-bold p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-tight">
              {isEdit ? `Edit Campaign: ${name}` : 'New Drip Campaign'}
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
              {isEdit ? 'Configure steps and sequences' : 'Setup campaign settings'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        
        {/* Left Settings Panel */}
        <div className="w-full lg:w-[360px] bg-white border-r border-gray-150 p-6 overflow-y-auto shrink-0 flex flex-col justify-between">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <h2 className="text-sm font-black text-gray-950 uppercase tracking-wider">Sequence Configuration</h2>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Sequence Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. 7-Day Welcome Sequence"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description (Optional)</label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe sequence audience or goals..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp Connection</label>
              <select
                value={instanceId}
                onChange={e => setInstanceId(e.target.value)}
                disabled={isEdit}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 transition-colors disabled:opacity-60"
              >
                {instances.length === 0 ? (
                  <option value="">No connected instances found</option>
                ) : (
                  instances.map(ins => (
                    <option key={ins.id} value={ins.id}>
                      {ins.name} ({ins.phone_number || 'No number'})
                    </option>
                  ))
                )}
              </select>
              {!isEdit && (
                <p className="text-[10px] text-gray-400 mt-1 font-semibold uppercase tracking-wide">Select connected WhatsApp number to send messages.</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Campaign Status</label>
              <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-200/50 gap-1">
                {(['active', 'paused'] as const).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStatus(item)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all capitalize ${
                      status === item ? 'bg-white text-gray-950 shadow-sm border border-gray-200/40' : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 transition-all"
            >
              {savingSettings ? 'Saving...' : isEdit ? 'Update Settings' : 'Create & Continue'}
            </button>
          </form>
          
          <div className="mt-8 border-t border-gray-100 pt-4 text-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">WASp Campaign Engine</span>
          </div>
        </div>

        {/* Right Steps Panel */}
        <div className="flex-1 overflow-y-auto p-8">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-black text-gray-950 tracking-tight">Sequence Timeline</h2>
              <p className="text-xs text-gray-400">Configure message steps to send consecutively.</p>
            </div>
            {isEdit && (
              <button
                onClick={handleAddStepClick}
                className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                <span>➕</span> Add Step
              </button>
            )}
          </div>

          {/* Steps Timeline Builder */}
          {!isEdit ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm max-w-lg mx-auto">
              <span className="text-4xl">🤖</span>
              <h3 className="text-sm font-bold text-gray-800 mt-4">Save sequence settings to add steps</h3>
              <p className="text-xs text-gray-400 mt-1">Specify name, description, and WhatsApp instance connection parameters in the settings panel to activate the steps builder timeline.</p>
            </div>
          ) : loading ? (
            <div className="text-center py-20 text-gray-400 font-semibold">Loading steps...</div>
          ) : steps.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center shadow-sm max-w-lg mx-auto">
              <span className="text-3xl">🗓️</span>
              <h3 className="text-sm font-bold text-gray-800 mt-4">Your campaign has no steps</h3>
              <p className="text-xs text-gray-400 mt-1">Click the "Add Step" button at the top right of this panel to add message configurations to the timeline.</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-200">
              {steps.map((step, idx) => {
                const timelineOffset = getStepDayAndHourOffset(idx)
                
                return (
                  <div key={step.id} className="relative pl-12 flex items-start gap-4">
                    
                    {/* Timeline dot */}
                    <div className="absolute left-3 top-2 w-7 h-7 rounded-full bg-blue-600 border-4 border-white flex items-center justify-center text-[10px] font-black text-white shadow-md">
                      {step.step_number}
                    </div>

                    {/* Step Card Content */}
                    <div className="flex-1 bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between gap-4">
                      
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-gray-950 truncate">{step.name || `Step ${step.step_number}`}</h4>
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full capitalize">
                            {step.message_type}
                          </span>
                        </div>

                        {/* Timing ETA details */}
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                          <span>⏱️ Wait: {step.wait_days}d {step.wait_hours}h</span>
                          {step.send_time && <span>⏰ Send time: {step.send_time}</span>}
                          <span className="text-gray-500 font-extrabold bg-gray-100 px-2 py-0.5 rounded">
                            Day {timelineOffset.days} + {timelineOffset.hours}h
                          </span>
                        </div>

                        {/* Message body preview */}
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                          {step.message_body || 'No message text.'}
                        </p>
                      </div>

                      {/* Step Actions */}
                      <div className="flex flex-col items-end gap-3 shrink-0">
                        
                        {/* Sort operations */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveStep(idx, 'up')}
                            disabled={idx === 0}
                            title="Move Up"
                            className="p-1 text-xs bg-gray-50 rounded-lg hover:bg-gray-150 disabled:opacity-40 transition-colors"
                          >
                            ⬆️
                          </button>
                          <button
                            onClick={() => handleMoveStep(idx, 'down')}
                            disabled={idx === steps.length - 1}
                            title="Move Down"
                            className="p-1 text-xs bg-gray-50 rounded-lg hover:bg-gray-150 disabled:opacity-40 transition-colors"
                          >
                            ⬇️
                          </button>
                        </div>

                        {/* Edit or Delete */}
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => handleEditStepClick(step)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-xl transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStep(step.id)}
                            className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-xl transition-all"
                          >
                            Delete
                          </button>
                        </div>

                      </div>

                    </div>

                  </div>
                )
              })}
            </div>
          )}

        </div>

      </div>

      <StepEditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveStep}
        step={editingStep}
      />
    </div>
  )
}
