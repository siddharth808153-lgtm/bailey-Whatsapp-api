import React, { useState, useEffect } from 'react'
import axios from 'ajax' // Wait, we use axios! Let's import axios from 'axios'
import axiosInstance from 'axios' // Let's use axios
import { MEDIA } from '../../api/endpoints.js'
import { MediaFile } from '../../types/index.js'

export const FileManagerPage: React.FC = () => {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [storageLimit, setStorageLimit] = useState(31457280) // 30 MB
  const [storageUsed, setStorageUsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchFiles = async () => {
    try {
      const res = await axiosInstance.get(MEDIA.LIST)
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
    fetchFiles()
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    if (storageUsed + file.size > storageLimit) {
      setErrorMsg('Storage limit of 30 MB exceeded.')
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axiosInstance.post(MEDIA.UPLOAD, formData, {
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this file? This will free up storage quota.')) return

    try {
      await axiosInstance.delete(MEDIA.DELETE(id))
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

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">File Manager</h1>
            <p className="text-sm text-gray-500 mt-1">Upload and select media files. Storage limit is restricted to 30 MB per user account.</p>
          </div>
          
          <label className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span>📤</span> {uploading ? 'Uploading...' : 'Upload File'}
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Quota overview and dropzone */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Progress Card */}
          <div className="bg-white border border-gray-150 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Used Storage Space</p>
              <h3 className="text-2xl font-black text-gray-950 mt-1">{formatSize(storageUsed)}</h3>
              <p className="text-xs text-gray-500 mt-0.5">out of {formatSize(storageLimit)} limit (30 MB)</p>
            </div>

            <div className="mt-6">
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    usedPercentage > 90 ? 'bg-red-500' : usedPercentage > 75 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${usedPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase mt-2">
                <span>{usedPercentage}% Full</span>
                <span>{formatSize(storageLimit - storageUsed)} Left</span>
              </div>
            </div>
          </div>

          {/* Quick upload dropzone */}
          <div className="md:col-span-2 bg-white border border-dashed border-gray-300 hover:border-blue-500 p-6 rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer relative group transition-colors">
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleUpload}
              disabled={uploading}
            />
            <span className="text-4xl">📤</span>
            <h4 className="text-sm font-bold text-gray-900 mt-3 group-hover:text-blue-600 transition-colors">Drag and drop file here or click to select</h4>
            <p className="text-[11px] text-gray-400 mt-1">Supports images, videos, audio, or document attachments (Max 10 MB per file)</p>
          </div>

        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-bold text-center rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Files Panel */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">All Media Files</h3>
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500 transition-colors w-full md:max-w-xs"
            />
          </div>

          {loading ? (
            <div className="text-center py-20 text-gray-400 font-semibold text-xs">Loading media storage...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-20 text-gray-400 space-y-2">
              <span className="text-4xl block">📁</span>
              <p className="text-sm font-bold">No files uploaded yet</p>
              <p className="text-xs">Any uploaded media will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {filteredFiles.map(file => {
                const isImage = file.mime_type.startsWith('image/')
                const isVideo = file.mime_type.startsWith('video/')
                return (
                  <div key={file.id} className="border border-gray-150 hover:border-blue-500 rounded-2xl p-3 flex flex-col justify-between relative group shadow-sm bg-white transition-all">
                    
                    <div>
                      {/* Preview */}
                      <div className="w-full h-24 bg-gray-50 rounded-xl overflow-hidden mb-2.5 flex items-center justify-center border border-gray-100">
                        {isImage ? (
                          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        ) : isVideo ? (
                          <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">📹 Video</span>
                          </div>
                        ) : (
                          <span className="text-2xl">📄</span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-gray-900 truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatSize(file.size)}</p>
                    </div>

                    <div className="mt-4 pt-2.5 border-t border-gray-50 flex items-center justify-between">
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-blue-600 hover:underline font-bold"
                      >
                        Open 🔗
                      </a>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete file"
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

      </div>
    </div>
  )
}
export default FileManagerPage
