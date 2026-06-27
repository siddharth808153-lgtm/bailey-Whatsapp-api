import React, { useState, useEffect } from 'react'
import { CONTACTS, CONTACT_LISTS } from '../../api/endpoints.js'
import { ContactList, ImportResult, CsvPreview } from '../../types/index.js'
import axios from 'axios'

interface ImportContactsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ImportContactsModal: React.FC<ImportContactsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [hasHeader, setHasHeader] = useState(true)
  const [listId, setListId] = useState<string>('')
  
  const [lists, setLists] = useState<ContactList[]>([])
  const [preview, setPreview] = useState<CsvPreview | null>(null)
  const [columnMap, setColumnMap] = useState<Record<string, string>>({})
  
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchLists()
      resetState()
    }
  }, [isOpen])

  const fetchLists = async () => {
    try {
      const res = await axios.get(CONTACT_LISTS.LIST)
      if (res.data.success) {
        setLists(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load lists', err)
    }
  }

  const resetState = () => {
    setStep(1)
    setFile(null)
    setHasHeader(true)
    setListId('')
    setPreview(null)
    setColumnMap({})
    setErrorMsg('')
    setImportResult(null)
    setIsLoading(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.txt')) {
        setErrorMsg('Only CSV or text files are allowed.')
        return
      }
      setFile(selectedFile)
      setErrorMsg('')
      uploadForPreview(selectedFile)
    }
  }

  const uploadForPreview = async (selectedFile: File) => {
    setIsLoading(true)
    setErrorMsg('')

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await axios.post(CONTACTS.PREVIEW_CSV, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data.success) {
        setPreview(res.data.data)
        initializeColumnMap(res.data.data.headers)
        setStep(2)
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to parse CSV file. Please make sure the format is valid.')
      setFile(null)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeColumnMap = (headers: string[]) => {
    const initialMap: Record<string, string> = {}
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().trim()
      if (normalized.includes('name') || normalized === 'fn' || normalized === 'first name') {
        initialMap[index] = 'name'
      } else if (normalized.includes('phone') || normalized.includes('number') || normalized === 'tel' || normalized === 'mobile') {
        initialMap[index] = 'phone'
      } else if (normalized.includes('email') || normalized === 'mail') {
        initialMap[index] = 'email'
      } else if (normalized.includes('tag') || normalized.includes('label')) {
        initialMap[index] = 'tags'
      } else if (normalized.includes('custom1') || normalized.includes('company')) {
        initialMap[index] = 'custom1'
      } else {
        initialMap[index] = ''
      }
    })
    setColumnMap(initialMap)
  }

  const handleMapChange = (colIdx: number, field: string) => {
    setColumnMap((prev) => {
      const updated = { ...prev }
      // Remove any existing mapping to this field to avoid duplicates
      if (field) {
        Object.keys(updated).forEach((key) => {
          if (updated[key] === field) {
            updated[key] = ''
          }
        })
      }
      updated[colIdx] = field
      return updated
    })
  }

  const handleImport = async () => {
    setErrorMsg('')

    // Ensure phone is mapped
    const isPhoneMapped = Object.values(columnMap).includes('phone')
    if (!isPhoneMapped) {
      setErrorMsg('You must map one of the columns to the Phone field.')
      return
    }

    if (!file) return

    setIsLoading(true)
    setStep(3)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('has_header', String(hasHeader))
    if (listId) {
      formData.append('list_id', listId)
    }
    
    // Append column map key-value pairs
    Object.keys(columnMap).forEach((key) => {
      formData.append(`column_map[${key}]`, columnMap[key])
    })

    try {
      const res = await axios.post(CONTACTS.IMPORT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      if (res.data.success) {
        setImportResult(res.data.data)
        onSuccess()
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Import failed.')
      setStep(2) // Fall back to mapping step
    } finally {
      setIsLoading(false)
    }
  }

  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8,Name,Phone,Email,Custom1,Tags\nRahul Sharma,919876543210,rahul@test.com,VIP Customer,\"lead,retail\"\nVihaan Patel,919876543211,vihaan@test.com,,retail\n"
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "sample_contacts.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Import Contacts</h3>
            <p className="text-xs text-gray-400">Upload CSV file to import contacts in bulk.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <span className="text-xl font-bold">&times;</span>
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center border-b border-gray-100 px-6 py-3.5 bg-gray-50/30 gap-6 text-sm font-semibold">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className="w-5 h-5 flex items-center justify-center rounded-full border text-xs font-bold border-current">1</span>
            <span>Upload File</span>
          </div>
          <div className="w-8 h-[1px] bg-gray-200" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className="w-5 h-5 flex items-center justify-center rounded-full border text-xs font-bold border-current">2</span>
            <span>Map Columns</span>
          </div>
          <div className="w-8 h-[1px] bg-gray-200" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className="w-5 h-5 flex items-center justify-center rounded-full border text-xs font-bold border-current">3</span>
            <span>Import Status</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMsg && (
            <div className="mb-4 p-3.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: UPLOAD FILE */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <span className="text-4xl mb-3">📁</span>
                <p className="text-sm font-bold text-gray-700 mb-1">Drag and drop your CSV file here</p>
                <p className="text-xs text-gray-400 mb-4">CSV or TXT files up to 10MB (max 10,000 rows)</p>
                
                <label className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer transition-all">
                  Browse Files
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between p-4 border border-blue-100 bg-blue-50/50 rounded-xl text-sm text-blue-700">
                <span>Want to see how to structure your files?</span>
                <button
                  type="button"
                  onClick={downloadSampleCsv}
                  className="font-bold underline hover:text-blue-800 transition-colors"
                >
                  Download Sample CSV
                </button>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <span className="animate-spin text-xl">⏳</span>
                  <span>Uploading and scanning CSV headers...</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: MAP COLUMNS */}
          {step === 2 && preview && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-2">Column Mapping Setup</h4>
                <p className="text-xs text-gray-400 mb-4">Map the CSV columns to matching fields. One column MUST map to the Phone field.</p>
                
                <div className="space-y-3 max-h-56 overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                  {preview.headers.map((header, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 py-2 border-b border-gray-100 last:border-0 text-sm">
                      <span className="font-semibold text-gray-700 truncate max-w-[200px]">
                        Column {index + 1}: "{header}"
                      </span>
                      <select
                        value={columnMap[index] || ''}
                        onChange={(e) => handleMapChange(index, e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg outline-none text-xs text-gray-700 bg-white"
                      >
                        <option value="">-- Skip Column --</option>
                        <option value="name">Contact Name</option>
                        <option value="phone">Phone (WhatsApp JID)</option>
                        <option value="email">Email Address</option>
                        <option value="custom1">Custom Field 1 (Personalization)</option>
                        <option value="tags">Tags (Comma-separated)</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Has Header Row
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasHeader"
                      checked={hasHeader}
                      onChange={(e) => setHasHeader(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4.5 w-4.5"
                    />
                    <label htmlFor="hasHeader" className="text-sm text-gray-700 cursor-pointer">
                      First row is headers
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Import to Contact List (Optional)
                  </label>
                  <select
                    value={listId}
                    onChange={(e) => setListId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none text-sm text-gray-700 bg-white"
                  >
                    <option value="">-- No List (Import as General Contacts) --</option>
                    {lists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name} ({list.contact_count} contacts)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Preview table */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">CSV Rows Preview (Top 5 rows)</h4>
                <div className="overflow-x-auto border border-gray-100 rounded-xl max-h-36">
                  <table className="min-w-full text-left text-xs bg-white">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {preview.headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-gray-500 font-bold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {preview.preview_rows.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((val, valIdx) => (
                            <td key={valIdx} className="px-3 py-2 text-gray-700 truncate max-w-[120px]">{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS AND PROGRESS */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
              {isLoading ? (
                <>
                  <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-2" />
                  <h4 className="text-base font-bold text-gray-800">Processing Import...</h4>
                  <p className="text-sm text-gray-400">Adding contacts to database and matching list configurations. Please wait.</p>
                </>
              ) : importResult ? (
                <div className="w-full space-y-6">
                  <div className="w-12 h-12 rounded-full bg-green-50 text-green-500 flex items-center justify-center text-2xl mx-auto shadow-sm">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">Import Session Completed!</h4>
                    <p className="text-xs text-gray-400">Total lines evaluated: {importResult.total_rows}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-green-50/50 border border-green-100 rounded-xl text-center">
                      <span className="block text-2xl font-bold text-green-600">{importResult.imported}</span>
                      <span className="text-xs text-green-700">Imported</span>
                    </div>
                    <div className="p-3 bg-yellow-50/50 border border-yellow-100 rounded-xl text-center">
                      <span className="block text-2xl font-bold text-yellow-600">{importResult.skipped_duplicates}</span>
                      <span className="text-xs text-yellow-700">Duplicates Skipped</span>
                    </div>
                    <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl text-center">
                      <span className="block text-2xl font-bold text-red-600">{importResult.skipped_invalid}</span>
                      <span className="text-xs text-red-700">Invalids Skipped</span>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="text-left border border-gray-150 rounded-xl bg-gray-50 overflow-hidden">
                      <div className="px-4 py-2 border-b border-gray-150 text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Import Errors Log (Top {importResult.errors.length})
                      </div>
                      <ul className="divide-y divide-gray-150 max-h-32 overflow-y-auto px-4 py-2">
                        {importResult.errors.map((err, i) => (
                          <li key={i} className="py-1.5 text-xs text-red-600">
                            Line {err.row}: {err.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={isLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
              >
                Start Import
              </button>
            </>
          )}

          {step === 3 && importResult && (
            <>
              <button
                type="button"
                onClick={resetState}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Import Another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
              >
                Done
              </button>
            </>
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
