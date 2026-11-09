import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import { Dialog } from './ui/Dialog'
import { useToast } from './ui/Toast'
import { PolicyImportDialog } from './PolicyImportDialog'

// Client fields needed to match the policy holder and to edit the client in the dialog
const CLIENT_COLUMNS = 'id, first_name, last_name, father_name, phone_number, email, comment'

// Opened from the sidebar's "Upload PDF" on any page: loads the lists the review dialog
// needs (clients, companies, types, rates, saved policy numbers), then shows the dialog.
export function PolicyImport({ file, onClose, onSaved }) {
  const toast = useToast()
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    setData(null)

    ;(async () => {
      try {
        const results = await Promise.all([
          supabase.from('clients').select(CLIENT_COLUMNS).order('first_name'),
          supabase.from('insurance_companies').select('code, name').order('name'),
          supabase.from('insurance_policy_types').select('type, name').order('name'),
          supabase.from('insurance_policy_rates').select('*'),
          supabase.from('client_policies').select('id, policy_number, clients (first_name, last_name)'),
        ])
        const failed = results.find((result) => result.error)
        if (failed) throw failed.error
        if (cancelled) return

        const [clients, companies, policyTypes, policyRates, policies] = results.map((r) => r.data || [])
        setData({ clients, companies, policyTypes, policyRates, policies })
      } catch (error) {
        if (cancelled) return
        toast.error(friendlyError(error))
        onClose()
      }
    })()

    return () => {
      cancelled = true
    }
    // Load once per uploaded file
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const reloadClients = async () => {
    const { data: clients, error } = await supabase.from('clients').select(CLIENT_COLUMNS).order('first_name')
    if (!error) setData((current) => ({ ...current, clients: clients || [] }))
  }

  if (!data) {
    return (
      <Dialog open onClose={onClose} size="lg" title="Import Policy from PDF" description={file.name}>
        <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Reading the policy…
        </div>
      </Dialog>
    )
  }

  return (
    <PolicyImportDialog
      file={file}
      onClose={onClose}
      onSaved={onSaved}
      reloadClients={reloadClients}
      {...data}
    />
  )
}
