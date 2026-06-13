import { useRef, useState } from 'react'
import { FileText, UploadCloud, Trash2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { useResumes, useUploadResume, useDeleteResume } from '../hooks/useApi'
import {
  PageHeader, Card, Button, Badge, PageLoader, EmptyState
} from '../components/ui'
import { formatDate, formatFileSize } from '../utils/format'

export default function ResumeUploadPage() {
  const { data: resumes = [], isLoading } = useResumes()
  const { mutateAsync: upload, isPending: uploading } = useUploadResume()
  const { mutateAsync: deleteResume, isPending: deleting } = useDeleteResume()

  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const handleFile = async (file) => {
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 5MB.')
      return
    }

    const formData = new FormData()
    formData.append('resume', file)

    try {
      await upload(formData)
      toast.success('Resume uploaded successfully.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await deleteResume(id)
      toast.success('Resume removed.')
    } catch {
      toast.error('Could not delete resume.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Resume"
        description="Upload a PDF resume to associate with your profile."
      />

      {/* Upload area */}
      <Card className="mb-6">
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-brand-500 bg-brand-50'
              : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-brand-100 text-brand-600">
              <UploadCloud size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                {uploading ? 'Uploading…' : 'Drop your PDF here or click to browse'}
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF only · max 5MB</p>
            </div>
            {!uploading && (
              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                Select file
              </Button>
            )}
            {uploading && (
              <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full animate-pulse w-3/4" />
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Resume list */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Uploaded resumes ({resumes.length})
        </h2>

        {isLoading ? (
          <PageLoader />
        ) : resumes.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileText}
              title="No resumes uploaded"
              description="Upload a PDF resume using the area above."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {resumes.map((r) => (
              <Card key={r.id} className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-600 flex-shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.fileName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {formatFileSize(r.fileSize)} · Uploaded {formatDate(r.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    title="View resume"
                  >
                    <ExternalLink size={16} />
                  </a>
                  <button
                    onClick={() => handleDelete(r.id)}
                    disabled={deleting && deletingId === r.id}
                    className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete resume"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
