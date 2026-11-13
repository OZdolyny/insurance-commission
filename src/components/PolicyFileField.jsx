import { useRef, useState } from 'react'
import { Eye, FileText, Paperclip, RotateCcw, Trash2, Upload, X } from 'lucide-react'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'
import { checkPolicyFile, formatFileSize } from '../lib/policyFiles'

// "Policy file" field for the Add / Update Policy form.
// Changes are applied when the form is saved:
//   value: { pendingFile: File | null, removeExisting: boolean }
//   existing: { file_name, file_size } of the stored file, or null
export function PolicyFileField({ existing, value, onChange, onPreview }) {
  const inputRef = useRef(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const { pendingFile, removeExisting } = value

  const choose = async (file) => {
    if (!file) return
    const problem = await checkPolicyFile(file)
    setError(problem)
    if (!problem) onChange({ pendingFile: file, removeExisting: false })
  }

  const openPicker = () => inputRef.current?.click()

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept=".pdf,application/pdf"
      className="hidden"
      aria-label="Choose policy file"
      onChange={(e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        choose(file)
      }}
    />
  )

  const fileRow = (name, size, note, actions) => (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium" title={name}>{name}</div>
        <div className="text-xs text-muted-foreground">{[size ? formatFileSize(size) : null, note].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="flex flex-wrap gap-1">{actions}</div>
    </div>
  )

  let content
  if (pendingFile) {
    content = fileRow(pendingFile.name, pendingFile.size, existing ? 'Replaces the current file when you save' : 'Uploaded when you save', (
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ pendingFile: null, removeExisting: false })}>
        <X className="h-4 w-4" />
        Cancel
      </Button>
    ))
  } else if (existing && removeExisting) {
    content = (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
        <span className="text-destructive">“{existing.file_name}” will be deleted when you save.</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ pendingFile: null, removeExisting: false })}>
          <RotateCcw className="h-4 w-4" />
          Undo
        </Button>
      </div>
    )
  } else if (existing) {
    content = fileRow(existing.file_name, existing.file_size, 'Stored', (
      <>
        {onPreview && (
          <Button type="button" variant="ghost" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={openPicker}>
          <Upload className="h-4 w-4" />
          Replace
        </Button>
        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => onChange({ pendingFile: null, removeExisting: true })}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </>
    ))
  } else {
    content = (
      <button
        type="button"
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          choose(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-input px-4 py-5 text-sm text-muted-foreground transition-colors hover:border-ring hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragging && 'border-ring bg-muted/50'
        )}
      >
        <Paperclip className="h-5 w-5" />
        <span><span className="font-medium text-primary">Attach PDF</span> or drop it here</span>
        <span className="text-xs">PDF up to 10 MB, signed policy PDFs included</span>
      </button>
    )
  }

  return (
    <div className="space-y-2">
      {content}
      {picker}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
  )
}
