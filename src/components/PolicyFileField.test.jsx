// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { PolicyFileField } from './PolicyFileField'

vi.mock('../lib/supabase', () => ({ supabase: {} }))

afterEach(cleanup)

function Harness({ existing, onPreview }) {
  const [value, setValue] = useState({ pendingFile: null, removeExisting: false })
  return (
    <>
      <PolicyFileField existing={existing} value={value} onChange={setValue} onPreview={onPreview} />
      <output data-testid="state">{JSON.stringify({ pending: value.pendingFile?.name || null, remove: value.removeExisting })}</output>
    </>
  )
}

const state = () => JSON.parse(screen.getByTestId('state').textContent)
const choose = (file) => fireEvent.change(screen.getByLabelText('Choose policy file'), { target: { files: [file] } })

describe('PolicyFileField', () => {
  it('attaches a PDF to a policy without a file', async () => {
    render(<Harness existing={null} />)
    expect(screen.getByText('Attach PDF')).toBeTruthy()

    choose(new File(['%PDF-1.4\n%%EOF'], 'Policy.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(state().pending).toBe('Policy.pdf'))
    expect(screen.getByText('Uploaded when you save', { exact: false })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(state().pending).toBeNull()
  })

  it('rejects a file that is not a PDF', async () => {
    render(<Harness existing={null} />)
    choose(new File(['not a pdf'], 'photo.pdf'))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(state().pending).toBeNull()
  })

  it('previews, replaces and deletes a stored file, with undo', async () => {
    const onPreview = vi.fn()
    render(<Harness existing={{ file_name: 'EP-1.pdf', file_size: 160 * 1024 }} onPreview={onPreview} />)
    expect(screen.getByText('EP-1.pdf')).toBeTruthy()
    expect(screen.getByText('160 KB · Stored')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(onPreview).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(state().remove).toBe(true)
    expect(screen.getByText(/will be deleted when you save/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(state().remove).toBe(false)

    choose(new File(['%PDF-1.4\n%%EOF'], 'New.pdf'))
    await waitFor(() => expect(state().pending).toBe('New.pdf'))
    expect(screen.getByText(/Replaces the current file/)).toBeTruthy()
  })
})
