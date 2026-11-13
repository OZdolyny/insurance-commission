import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, Loader2, Pencil, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Dialog } from './ui/Dialog'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { Textarea } from './ui/Textarea'
import { Select } from './ui/Select'
import { useToast } from './ui/Toast'
import { extractPolicyRows } from '../lib/policyPdf/extractText'
import { looksLikePolicy, parsePolicy, vehicleComment } from '../lib/policyPdf/parsePolicy'
import { findClient, findCompany, findDuplicatePolicy, findPolicyType } from '../lib/policyPdf/matching'
import { buildPolicyData, findRate } from '../lib/policyForm'
import { calculateCommission, formatRate } from '../lib/commission'
import { friendlyError } from '../lib/errors'
import { formatAmount, formatPhoneNumber, maskDateInput } from '../lib/utils'
import { attachPolicyFile, formatFileSize } from '../lib/policyFiles'

const CLIENT_FIELDS = [
  { name: 'last_name', label: 'Last Name *', required: true },
  { name: 'first_name', label: 'First Name *', required: true },
  { name: 'father_name', label: 'Father Name' },
  { name: 'phone_number', label: 'Phone Number', type: 'tel' },
  { name: 'email', label: 'Email', type: 'email' },
]

function clientFromParsed(parsed) {
  return {
    first_name: parsed.client.firstName,
    last_name: parsed.client.lastName,
    father_name: parsed.client.fatherName,
    phone_number: parsed.client.phone,
    email: parsed.client.email,
    comment: '', // not in the policy; the user can add one
  }
}

const fullName = (c) => [c.last_name, c.first_name, c.father_name].filter(Boolean).join(' ')

// Upload result review: shows what was read from a policy PDF, lets the user fix it,
// add or update the client, and save the policy.
export function PolicyImportDialog({ file, onClose, onSaved, clients, companies, policyTypes, policyRates, policies, reloadClients }) {
  const toast = useToast()
  const [status, setStatus] = useState('reading') // reading | error | review
  const [errorMessage, setErrorMessage] = useState('')
  const [parsed, setParsed] = useState(null)

  const [client, setClient] = useState(null) // the existing client the policy will belong to
  const [matchReason, setMatchReason] = useState('')
  const [clientMode, setClientMode] = useState('view') // view | edit | new
  const [clientForm, setClientForm] = useState(null)
  const [savingClient, setSavingClient] = useState(false)
  // Comment of an existing client, editable without opening the full client form; saved with the policy
  const [clientComment, setClientComment] = useState('')

  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  // Keep the uploaded PDF with the saved policy (Supabase Storage)
  const [storeFile, setStoreFile] = useState(true)

  // Read the file whenever a new one is chosen
  useEffect(() => {
    if (!file) return
    let cancelled = false
    setStatus('reading')

    ;(async () => {
      try {
        const result = parsePolicy(await extractPolicyRows(file))
        if (cancelled) return
        if (!looksLikePolicy(result)) {
          throw new Error('No policy details were found in this file. Only Ukrainian motor liability ("Автоцивілка") policies are supported for now.')
        }

        const match = findClient(clients, result.client)
        setParsed(result)
        setClient(match?.client || null)
        setClientComment(match?.client?.comment || '')
        setMatchReason(match?.reason || '')
        setClientMode(match ? 'view' : 'new')
        setClientForm(clientFromParsed(result))
        setForm({
          policy_number: result.policyNumber,
          insurance_company_code: findCompany(companies, result.insurer.name)?.code || '',
          insurance_policy_type: findPolicyType(policyTypes, result)?.type || '',
          amount: result.premium,
          paid_amount: result.premium,
          start_date: result.startDate,
          end_date: result.endDate,
          policy_date: result.policyDate,
          no_commission: false,
          brand: result.vehicle.brand,
          model: result.vehicle.model,
          plate: result.vehicle.plate,
          note: '',
        })
        setStatus('review')
      } catch (error) {
        if (cancelled) return
        console.error('Policy import failed:', error)
        setErrorMessage(
          error?.name === 'PasswordException'
            ? 'This PDF is password-protected.'
            : error?.message?.startsWith('No policy') || error?.message?.includes('not a PDF')
              ? error.message
              : 'This file could not be read as a PDF policy.'
        )
        setStatus('error')
      }
    })()

    return () => {
      cancelled = true
    }
    // Only a new file should restart the import; later list refreshes must not reset the user's edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  if (!file) return null

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))
  const setClientField = (name, value) =>
    setClientForm((current) => ({ ...current, [name]: name === 'phone_number' ? formatPhoneNumber(value) : value }))

  // ---- Client ----

  const startEditingClient = () => {
    const fromPolicy = clientFromParsed(parsed)
    // Existing values first; empty ones are filled from the policy.
    // The comment keeps whatever was already typed in the comment box.
    setClientForm({
      ...Object.fromEntries(Object.keys(fromPolicy).map((key) => [key, client[key] || fromPolicy[key] || ''])),
      comment: clientComment,
    })
    setClientMode('edit')
  }

  const saveClient = async () => {
    if (!clientForm.first_name.trim() || !clientForm.last_name.trim()) {
      toast.error('First and last name are required.')
      return
    }
    const values = Object.fromEntries(Object.entries(clientForm).map(([k, v]) => [k, String(v || '').trim() || null]))

    setSavingClient(true)
    try {
      const { data, error } = clientMode === 'edit'
        ? await supabase.from('clients').update(values).eq('id', client.id).select().single()
        : await supabase.from('clients').insert([values]).select().single()
      if (error) throw error

      toast.success(clientMode === 'edit' ? 'Client updated.' : 'Client added.')
      setClient(data)
      setClientComment(data.comment || '')
      setMatchReason(clientMode === 'edit' ? matchReason : 'added')
      setClientMode('view')
      reloadClients()
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setSavingClient(false)
    }
  }

  const chooseClient = (value) => {
    if (value === 'new') {
      setClient(null)
      setClientForm(clientFromParsed(parsed))
      setClientMode('new')
      return
    }
    const chosen = clients.find((c) => String(c.id) === value) || null
    setClient(chosen)
    setClientComment(chosen?.comment || '')
    setMatchReason('chosen')
    setClientMode('view')
  }

  // Values in the policy that differ from the saved client, shown as a hint while editing
  const policyDifferences = client && parsed
    ? CLIENT_FIELDS
        .map(({ name, label }) => ({ name, label: label.replace(' *', ''), value: clientFromParsed(parsed)[name] }))
        .filter(({ name, value }) => value && String(client[name] || '').toLowerCase() !== String(value).toLowerCase())
    : []

  // ---- Policy ----

  const comment = form
    ? [vehicleComment(form), form.note.trim()].filter(Boolean).join('\n')
    : ''
  const selectedRate = form ? findRate(policyRates, form.insurance_company_code, form.insurance_policy_type) : null
  const duplicate = form ? findDuplicatePolicy(policies, form.policy_number) : null
  const commission = form
    ? calculateCommission({ amount: form.amount, paidAmount: form.paid_amount, rate: selectedRate?.commission_rate, noCommission: form.no_commission })
    : 0
  const companyMatched = parsed && form?.insurance_company_code && findCompany(companies, parsed.insurer.name)?.code === form.insurance_company_code

  const savePolicy = async () => {
    if (duplicate) {
      toast.error('This policy number is already saved.')
      return
    }
    if (!client || clientMode !== 'view') {
      toast.error(clientMode === 'new' ? 'Add the client first.' : 'Save or cancel the client changes first.')
      return
    }

    const { error: validationError, data } = buildPolicyData(
      { ...form, client_id: String(client.id), comment },
      { selectedRate, isNew: true }
    )
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    try {
      // Save a changed client comment first, so it is not lost if the policy save fails
      const newComment = clientComment.trim()
      if (newComment !== (client.comment || '').trim()) {
        const { error: clientError } = await supabase
          .from('clients')
          .update({ comment: newComment || null })
          .eq('id', client.id)
        if (clientError) throw clientError
        setClient((current) => ({ ...current, comment: newComment || null }))
        reloadClients()
      }

      const { data: saved, error } = await supabase.from('client_policies').insert([data]).select('id, file_path').single()
      if (error) throw error

      const label = data.policy_number ? `Policy ${data.policy_number}` : 'Policy'
      if (storeFile) {
        try {
          await attachPolicyFile(saved, file)
          toast.success(`${label} saved with its PDF.`)
        } catch (fileError) {
          toast.error(`${label} was saved, but the PDF could not be stored: ${friendlyError(fileError)}. You can attach it later in Edit.`)
        }
      } else {
        toast.success(`${label} saved.`)
      }
      onSaved()
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setSaving(false)
    }
  }

  // ---- Render ----

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      closeOnBackdrop={status !== 'review'}
      title="Import Policy from PDF"
      description={file.name}
    >
      {status === 'reading' && (
        <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Reading the policy…
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      )}

      {status === 'review' && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Check the details read from the file and correct anything that is wrong before saving.
          </p>

          {/* Client */}
          <section className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Client</h3>
              <Select
                aria-label="Client"
                value={clientMode === 'new' ? 'new' : client ? String(client.id) : 'new'}
                onChange={(e) => chooseClient(e.target.value)}
                className="h-9 w-full sm:w-64"
                disabled={clientMode === 'edit'}
              >
                <option value="new">New client</option>
                {[...clients]
                  .sort((a, b) => fullName(a).localeCompare(fullName(b)))
                  .map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}
              </Select>
            </div>

            {clientMode === 'view' && client && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      {matchReason === 'added' ? 'Client added' : 'Existing client'}
                    </Badge>
                    {matchReason && !['added', 'chosen'].includes(matchReason) && (
                      <span className="text-xs text-muted-foreground">matched by {matchReason}</span>
                    )}
                  </div>
                  <div className="font-medium">{fullName(client)}</div>
                  <div className="text-sm text-muted-foreground">
                    {[client.phone_number, client.email].filter(Boolean).join(' · ') || 'No contact details'}
                  </div>
                  {policyDifferences.length > 0 && (
                    <div className="text-xs text-warning">
                      The policy has different {policyDifferences.map((d) => d.label.toLowerCase()).join(', ')}.
                    </div>
                  )}
                </div>
                <Button variant="secondary" size="sm" onClick={startEditingClient}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            )}

            {clientMode === 'view' && client && (
              <div className="space-y-1.5">
                <Label htmlFor="import-client-comment">Client comment</Label>
                <Textarea
                  id="import-client-comment"
                  rows={2}
                  value={clientComment}
                  onChange={(e) => setClientComment(e.target.value)}
                  placeholder="Notes about this client"
                />
                {clientComment.trim() !== (client.comment || '').trim() && (
                  <p className="text-xs text-muted-foreground">The changed comment is saved together with the policy.</p>
                )}
              </div>
            )}

            {(clientMode === 'new' || clientMode === 'edit') && clientForm && (
              <div className="space-y-3">
                {clientMode === 'new' && (
                  <Badge variant="warning">New client: not saved yet</Badge>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {CLIENT_FIELDS.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                      <Label htmlFor={`import-${field.name}`}>{field.label}</Label>
                      <Input
                        id={`import-${field.name}`}
                        type={field.type || 'text'}
                        value={clientForm[field.name] || ''}
                        onChange={(e) => setClientField(field.name, e.target.value)}
                      />
                      {clientMode === 'edit' && policyDifferences.find((d) => d.name === field.name) && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => setClientField(field.name, policyDifferences.find((d) => d.name === field.name).value)}
                        >
                          Use value from policy: {policyDifferences.find((d) => d.name === field.name).value}
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="import-comment">Client comment</Label>
                    <Textarea
                      id="import-comment"
                      rows={2}
                      value={clientForm.comment || ''}
                      onChange={(e) => setClientField('comment', e.target.value)}
                      placeholder="Notes about this client"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveClient} disabled={savingClient}>
                    {clientMode === 'new' ? <UserPlus className="h-4 w-4" /> : null}
                    {savingClient ? 'Saving…' : clientMode === 'new' ? 'Add client' : 'Save client'}
                  </Button>
                  {clientMode === 'edit' && (
                    <Button size="sm" variant="secondary" onClick={() => setClientMode('view')}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Policy */}
          <section className="space-y-3 rounded-lg border border-border p-4">
            <h3 className="font-semibold">Insurance Policy</h3>

            {duplicate && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                Policy {duplicate.policy_number} is already saved
                {duplicate.clients ? ` for ${duplicate.clients.first_name} ${duplicate.clients.last_name}` : ''}.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="import-policy-number">Policy Number</Label>
                <Input id="import-policy-number" value={form.policy_number} onChange={(e) => setField('policy_number', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="import-company">Insurance Company *</Label>
                <Select id="import-company" value={form.insurance_company_code} onChange={(e) => setField('insurance_company_code', e.target.value)}>
                  <option value="">Select a company</option>
                  {companies.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                </Select>
                {parsed.insurer.name && !companyMatched && (
                  <p className="text-xs text-muted-foreground">Insurer in the file: {parsed.insurer.name}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="import-type">Policy Type *</Label>
                <Select id="import-type" value={form.insurance_policy_type} onChange={(e) => setField('insurance_policy_type', e.target.value)}>
                  <option value="">Select a policy type</option>
                  {policyTypes.map((t) => <option key={t.type} value={t.type}>{t.type} - {t.name}</option>)}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="import-amount">Policy Amount *</Label>
                  <Input id="import-amount" type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setField('amount', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="import-paid">Paid Amount *</Label>
                  <Input id="import-paid" type="number" step="0.01" min="0" value={form.paid_amount} onChange={(e) => setField('paid_amount', e.target.value)} />
                </div>
              </div>

              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="import-policy-date">Policy Date</Label>
                  <Input id="import-policy-date" inputMode="numeric" placeholder="dd/mm/yyyy" value={form.policy_date} onChange={(e) => setField('policy_date', maskDateInput(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="import-start">Start Date *</Label>
                  <Input id="import-start" inputMode="numeric" placeholder="dd/mm/yyyy" value={form.start_date} onChange={(e) => setField('start_date', maskDateInput(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="import-end">End Date</Label>
                  <Input id="import-end" inputMode="numeric" placeholder="dd/mm/yyyy" value={form.end_date} onChange={(e) => setField('end_date', maskDateInput(e.target.value))} />
                </div>
              </div>
            </div>

            {/* Car -> comment */}
            <div className="space-y-3 rounded-lg bg-muted p-3">
              <div className="text-sm font-medium">Car (saved in the comment)</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="import-brand">Brand</Label>
                  <Input id="import-brand" value={form.brand} onChange={(e) => setField('brand', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="import-model">Model</Label>
                  <Input id="import-model" value={form.model} onChange={(e) => setField('model', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="import-plate">License Plate</Label>
                  <Input id="import-plate" className="uppercase" value={form.plate} onChange={(e) => setField('plate', e.target.value.toUpperCase())} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="import-note">Extra note (optional)</Label>
                <Textarea
                  id="import-note"
                  rows={2}
                  value={form.note}
                  onChange={(e) => setField('note', e.target.value)}
                />
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Comment: </span>
                <span className="whitespace-pre-line">{comment || '—'}</span>
              </div>
            </div>

            {/* Commission */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.no_commission}
                  onChange={(e) => setField('no_commission', e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                No commission for this policy
              </label>
              {form.no_commission ? (
                <span className="text-muted-foreground">Commission: 0.00</span>
              ) : selectedRate ? (
                <span>
                  Commission ({formatRate(selectedRate.commission_rate)}):{' '}
                  <span className="font-medium text-success">{formatAmount(commission)}</span>
                </span>
              ) : form.insurance_company_code && form.insurance_policy_type ? (
                <span className="text-destructive">No commission rate for this company and type</span>
              ) : null}
            </div>
          </section>

          <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
            <input
              type="checkbox"
              checked={storeFile}
              onChange={(e) => setStoreFile(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              <span className="font-medium">Store this PDF with the policy</span>
              <span className="block text-muted-foreground">
                {file.name} · {formatFileSize(file.size)}. You can open or download it from the Policies page.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={savePolicy} disabled={saving || !!duplicate || !client || clientMode !== 'view'}>
              <FileText className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Policy'}
            </Button>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            {(!client || clientMode !== 'view') && (
              <span className="self-center text-xs text-muted-foreground">
                {clientMode === 'edit' ? 'Save or cancel the client changes first.' : 'Add the client first.'}
              </span>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}
