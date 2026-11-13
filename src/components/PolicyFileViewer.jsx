import { useEffect, useState } from 'react'
import { AlertCircle, Download, ExternalLink, Loader2 } from 'lucide-react'
import { Dialog } from './ui/Dialog'
import { Button } from './ui/Button'
import { useToast } from './ui/Toast'
import { downloadPolicyFile, formatFileSize, previewablePdf, saveBlob } from '../lib/policyFiles'
import { formatDate } from '../lib/utils'
import { friendlyError } from '../lib/errors'

// Preview of a policy's stored PDF, with Download (original file) and Open in new tab
export function PolicyFileViewer({ policy, onClose }) {
  const toast = useToast()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let previewUrl = null

    ;(async () => {
      try {
        const original = await downloadPolicyFile(policy.file_path)
        const preview = await previewablePdf(original).catch(() => null)
        if (cancelled) return
        previewUrl = preview ? URL.createObjectURL(preview) : null
        setState({ status: 'ready', original, previewUrl })
      } catch (error) {
        if (!cancelled) setState({ status: 'error', message: friendlyError(error) })
      }
    })()

    return () => {
      cancelled = true
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [policy.file_path])

  const download = () => {
    if (state.original) saveBlob(state.original, policy.file_name)
    else toast.error('The file is not loaded yet.')
  }

  const clientName = `${policy.clients?.first_name || ''} ${policy.clients?.last_name || ''}`.trim()
  const details = [
    policy.file_name,
    policy.file_size ? formatFileSize(policy.file_size) : null,
    policy.file_uploaded_at ? `uploaded ${formatDate(policy.file_uploaded_at)}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Policy file${policy.policy_number ? ` · ${policy.policy_number}` : ''}`}
      description={[clientName, details].filter(Boolean).join(' — ')}
    >
      {state.status === 'loading' && (
        <div className="flex h-[60vh] items-center justify-center gap-3 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading the file…
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          The file could not be loaded: {state.message}
        </div>
      )}

      {state.status === 'ready' && (
        state.previewUrl ? (
          <iframe
            title={`Policy ${policy.policy_number || ''} preview`}
            src={state.previewUrl}
            className="h-[65vh] w-full rounded-lg border border-border bg-muted"
          />
        ) : (
          <p className="text-sm text-muted-foreground">This file cannot be previewed here. Download it to open it.</p>
        )
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={download} disabled={state.status !== 'ready'}>
          <Download className="h-4 w-4" />
          Download
        </Button>
        {state.previewUrl && (
          <Button variant="outline" onClick={() => window.open(state.previewUrl, '_blank', 'noopener')}>
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </Button>
        )}
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Dialog>
  )
}
