import { beforeEach, describe, expect, it, vi } from 'vitest'

// Fake Supabase: storage and table updates are recorded; failures can be switched on per test
const fake = vi.hoisted(() => ({ calls: [], failUpload: false, failUpdate: false, failRemove: false }))

vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: (bucket) => ({
        upload: async (path, file, options) => {
          fake.calls.push(['upload', bucket, path, options.contentType])
          return { error: fake.failUpload ? { message: 'upload failed' } : null }
        },
        remove: async (paths) => {
          fake.calls.push(['remove', bucket, paths])
          return { error: fake.failRemove ? { message: 'remove failed' } : null }
        },
        download: async (path) => {
          fake.calls.push(['download', bucket, path])
          return { data: new Blob(['%PDF-1.4\n%%EOF']), error: null }
        },
      }),
    },
    from: (table) => ({
      update: (values) => ({
        eq: async (column, id) => {
          fake.calls.push(['update', table, values, id])
          return { error: fake.failUpdate ? { message: 'update failed' } : null }
        },
      }),
    }),
  },
}))

const { attachPolicyFile, checkPolicyFile, deleteStoredFile, formatFileSize, newPolicyFilePath, previewablePdf, removePolicyFile } =
  await import('./policyFiles')

const pdfFile = (name = 'policy.pdf') => new File(['%PDF-1.4\nhello\n%%EOF'], name, { type: 'application/pdf' })

beforeEach(() => {
  Object.assign(fake, { calls: [], failUpload: false, failUpdate: false, failRemove: false })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('checkPolicyFile', () => {
  it('accepts PDFs and rejects other files by their content', async () => {
    expect(await checkPolicyFile(pdfFile())).toBeNull()
    expect(await checkPolicyFile(new File(['hello'], 'fake.pdf'))).toMatch(/Only PDF files/)
    expect(await checkPolicyFile(new File([], 'empty.pdf'))).toMatch(/empty/)
  })

  it('rejects files over 10 MB', async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf')
    expect(await checkPolicyFile(big)).toMatch(/too large/)
  })
})

describe('paths and sizes', () => {
  it('builds a random path inside the policy folder', () => {
    expect(newPolicyFilePath(42, 'abc')).toBe('42/abc.pdf')
    expect(newPolicyFilePath(42)).toMatch(/^42\/[0-9a-f-]{36}\.pdf$/)
  })

  it('formats sizes', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(160 * 1024)).toBe('160 KB')
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})

describe('attachPolicyFile', () => {
  it('uploads, points the policy at the file, then removes the old file', async () => {
    const fields = await attachPolicyFile({ id: 7, file_path: '7/old.pdf' }, pdfFile('Policy EP-1.pdf'))
    const [upload, update, remove] = fake.calls
    expect(upload).toEqual(['upload', 'policy-files', expect.stringMatching(/^7\/.+\.pdf$/), 'application/pdf'])
    expect(update).toEqual(['update', 'client_policies', fields, 7])
    expect(fields).toMatchObject({ file_path: upload[2], file_name: 'Policy EP-1.pdf', file_size: pdfFile().size })
    expect(remove).toEqual(['remove', 'policy-files', ['7/old.pdf']])
  })

  it('removes the new upload again if the policy cannot be updated', async () => {
    fake.failUpdate = true
    await expect(attachPolicyFile({ id: 7, file_path: '7/old.pdf' }, pdfFile())).rejects.toMatchObject({ message: 'update failed' })
    const uploaded = fake.calls[0][2]
    expect(fake.calls.at(-1)).toEqual(['remove', 'policy-files', [uploaded]]) // the new file, not the old one
    expect(fake.calls.some(([op, , paths]) => op === 'remove' && paths[0] === '7/old.pdf')).toBe(false)
  })

  it('stops before touching the policy if the upload fails', async () => {
    fake.failUpload = true
    await expect(attachPolicyFile({ id: 7 }, pdfFile())).rejects.toMatchObject({ message: 'upload failed' })
    expect(fake.calls.map(([op]) => op)).toEqual(['upload'])
  })

  it('keeps the new file even if the old one cannot be removed', async () => {
    fake.failRemove = true
    const fields = await attachPolicyFile({ id: 7, file_path: '7/old.pdf' }, pdfFile())
    expect(fields.file_path).toMatch(/^7\//)
  })
})

describe('removePolicyFile and deleteStoredFile', () => {
  it('clears the policy first, then deletes the stored file', async () => {
    await removePolicyFile({ id: 7, file_path: '7/a.pdf' })
    expect(fake.calls).toEqual([
      ['update', 'client_policies', { file_path: null, file_name: null, file_size: null, file_uploaded_at: null }, 7],
      ['remove', 'policy-files', ['7/a.pdf']],
    ])
  })

  it('does nothing without a file', async () => {
    await removePolicyFile({ id: 7, file_path: null })
    await deleteStoredFile(null)
    expect(fake.calls).toEqual([])
  })
})

describe('previewablePdf', () => {
  it('returns a viewable PDF blob', async () => {
    const preview = await previewablePdf(new Blob(['%PDF-1.4\n%%EOF']))
    expect(preview.type).toBe('application/pdf')
  })
})
