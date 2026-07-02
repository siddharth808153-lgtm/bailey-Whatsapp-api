import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { MEDIA } from '../../api/endpoints.js'
import { MediaFile } from '../../types/index.js'

interface MediaSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string, filename: string) => void
}

export const MediaSelectorModal: React.FC<MediaSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [storageLimit, setStorageLimit] = useState(31457280) // default 30MB
  const [storageUsed, setStorageUsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchFiles = async () => {
    setLoading(true)
    try {
      const res = await axios.get(MEDIA.LIST)
      if (res.data.success) {
        setFiles(res.data.data.files || [])
        setStorageLimit(res.data.data.storage_limit)
        setStorageUsed(res.data.data.storage_used)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchFiles()
      setErrorMsg(null)
      setSearchQuery('')
    }
  }, [isOpen])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Pre-check size
    if (storageUsed + file.size > storageLimit) {
      setErrorMsg('Storage limit of 30 MB exceeded.')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post(MEDIA.UPLOAD, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      if (res.data.success) {
        fetchFiles()
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to upload file.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation() // Avoid selecting
    if (!confirm('Are you sure you want to delete this file from storage?')) return

    try {
      await axios.delete(MEDIA.DELETE(id))
      fetchFiles()
    } catch (err) {
      console.error(err)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const usedPercentage = Math.min(100, Math.round((storageUsed / storageLimit) * 100))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-gray-150 flex flex-col h-[600px]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-950 tracking-tight">Select Media File</h3>
            <p className="text-xs text-gray-400 mt-0.5">Choose a file from your storage quota or upload a new one.</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors font-bold text-lg"
          >
            ✕
          </button>
        </div>

        {/* Quota Progress Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
              <span>Storage Quota</span>
              <span>{formatSize(storageUsed)} / {formatSize(storageLimit)} ({usedPercentage}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  usedPercentage > 90 ? 'bg-red-500' : usedPercentage > 75 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${usedPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <label className={`cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <span>📤</span> {uploading ? 'Uploading...' : 'Upload File'}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search files by name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center rounded-xl">
              {errorMsg}
            </div>
          )}

          {loading && files.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-semibold text-xs">Loading files...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-20 text-gray-400 space-y-2">
              <span className="text-3xl block">📁</span>
              <p className="text-xs font-bold">No files found</p>
              <p className="text-[10px]">Upload a file using the button above to begin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {filteredFiles.map(file => {
                const isImage = file.mime_type.startsWith('image/')
                const isVideo = file.mime_type.startsWith('video/')
                return (
                  <div
                    key={file.id}
                    onClick={() => onSelect(file.url, file.name)}
                    className="bg-white border border-gray-200 hover:border-blue-500 rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all shadow-sm group relative"
                  >
                    {/* Media Preview Frame */}
                    <div className="w-full h-24 bg-gray-50 rounded-xl overflow-hidden mb-2 flex items-center justify-center border border-gray-100">
                      {isImage ? (
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      ) : isVideo ? (
                        <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
                          <span className="text-white text-xs">📹 Video</span>
                        </div>
                      ) : (
                        <span className="text-xl">📄</span>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">{formatSize(file.size)}</p>
                    </div>

                    {/* Delete overlay button */}
                    <button
                      onClick={(e) => handleDelete(file.id, e)}
                      title="Delete file"
                      className="absolute top-2 right-2 p-1 bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg shadow-sm border border-gray-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      🗑️
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
