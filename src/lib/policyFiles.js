import { supabase } from './supabase'
import { unwrapPdf } from './policyPdf/unwrap'

// Policy files (PDF) in the private Supabase Storage bucket "policy-files".
// The original file is stored unchanged (including an insurer's signature envelope);
// previews unwrap it in the browser. See migration-policy-files.sql.

export const POLICY_FILES_BUCKET = 'policy-files'
export const MAX_POLICY_FILE_SIZE = 10 * 1024 * 1024 // 10 MB, same as the bucket limit

const bucket = () => supabase.storage.from(POLICY_FILES_BUCKET)

export function formatFileSize(bytes) {
  const size = Number(bytes) || 0
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

// Returns an error message, or null when the file can be stored.
// Checks the content, not just the name: a PDF, or a PDF inside a signature envelope.
export async function checkPolicyFile(file) {
  if (!file) return 'Choose a file.'
  if (file.size > MAX_POLICY_FILE_SIZE) return `The file is too large (${formatFileSize(file.size)}). The limit is 10 MB.`
  if (file.size === 0) return 'The file is empty.'
  let bytes
  try {
    bytes = await readFileBytes(file)
  } catch {
    return 'The file could not be read.'
  }
  try {
    unwrapPdf(bytes)
    return null
  } catch {
    return 'Only PDF files can be stored (including signed policy PDFs).'
  }
}

function readFileBytes(file) {
  if (typeof file.arrayBuffer === 'function') return file.arrayBuffer().then((buffer) => new Uint8Array(buffer))
  // Older browsers
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

// Random path per upload, so paths cannot be guessed and a replaced file never overwrites another
export function newPolicyFilePath(policyId, uuid = crypto.randomUUID()) {
  return `${policyId}/${uuid}.pdf`
}

// Store `file` for the policy, replacing its current file if it has one.
// Order: upload the new file -> point the policy at it -> remove the old file.
// If pointing the policy at it fails, the new upload is removed again, so no orphaned file is left.
export async function attachPolicyFile(policy, file) {
  const path = newPolicyFilePath(policy.id)
  const { error: uploadError } = await bucket().upload(path, file, { contentType: 'application/pdf', upsert: false })
  if (uploadError) throw uploadError

  const fields = {
    file_path: path,
    file_name: file.name || 'policy.pdf',
    file_size: file.size,
    file_uploaded_at: new Date().toISOString(),
  }
  const { error: updateError } = await supabase.from('client_policies').update(fields).eq('id', policy.id)
  if (updateError) {
    await bucket().remove([path])
    throw updateError
  }

  if (policy.file_path) {
    const { error } = await bucket().remove([policy.file_path])
    if (error) console.warn('Old policy file could not be removed:', error.message)
  }
  return fields
}

// Detach the file from the policy, then delete it from storage.
export async function removePolicyFile(policy) {
  if (!policy.file_path) return
  const { error } = await supabase
    .from('client_policies')
    .update({ file_path: null, file_name: null, file_size: null, file_uploaded_at: null })
    .eq('id', policy.id)
  if (error) throw error
  await deleteStoredFile(policy.file_path)
}

// Delete only the stored object (e.g. after the policy itself was deleted). Failures are logged, not thrown.
export async function deleteStoredFile(path) {
  if (!path) return
  const { error } = await bucket().remove([path])
  if (error) console.warn('Policy file could not be removed from storage:', error.message)
}

// The original file as stored
export async function downloadPolicyFile(path) {
  const { data, error } = await bucket().download(path)
  if (error) throw error
  return data
}

// A viewable PDF: signature envelopes are unwrapped so the browser's PDF viewer can show it
export async function previewablePdf(blob) {
  const pdf = unwrapPdf(new Uint8Array(await blob.arrayBuffer()))
  return new Blob([pdf], { type: 'application/pdf' })
}

export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'policy.pdf'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
