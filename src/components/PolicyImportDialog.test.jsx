// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from './ui/Toast'
import { PolicyImportDialog } from './PolicyImportDialog'
import { POLICY_ROWS } from '../lib/policyPdf/__fixtures__/policyRows'

// The PDF reading itself is covered by policyPdf.test.js; here the dialog gets the text rows directly
vi.mock('../lib/policyPdf/extractText', () => ({
  extractPolicyRows: vi.fn(async () => POLICY_ROWS),
}))

// Fake Supabase: records writes and returns the written row with a new id
const writes = []
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table) => {
      const call = { table }
      const result = () => {
        writes.push(call)
        const row = { id: 501, ...(call.values?.[0] || call.values) }
        return Promise.resolve({ data: row, error: null })
      }
      const builder = {
        insert: (values) => { call.method = 'insert'; call.values = values; return builder },
        update: (values) => { call.method = 'update'; call.values = values; return builder },
        eq: (column, value) => { call.where = { [column]: value }; return builder },
        select: () => builder,
        single: result,
        then: (resolve, reject) => result().then(resolve, reject),
      }
      return builder
    },
  },
}))

const companies = [{ code: 'ARS', name: 'Arsenal Insurance' }, { code: 'BBS', name: 'BBS Insurance' }]
const policyTypes = [{ type: 'KAS', name: 'КАСКО' }, { type: 'CPV', name: 'Цивілка' }]
const policyRates = [{ insurance_company_code: 'BBS', insurance_policy_type: 'CPV', commission_rate: '0.15' }]
const existingClient = {
  id: 7, first_name: 'Олена', last_name: 'Коваленко', father_name: 'Петрівна', phone_number: '(067) 999 99 99', email: null,
}

function renderDialog(props = {}) {
  const handlers = { onClose: vi.fn(), onSaved: vi.fn(), reloadClients: vi.fn() }
  render(
    <ToastProvider>
      <PolicyImportDialog
        file={new File(['%PDF-1.4'], 'policy.pdf', { type: 'application/pdf' })}
        clients={[]}
        companies={companies}
        policyTypes={policyTypes}
        policyRates={policyRates}
        policies={[]}
        {...handlers}
        {...props}
      />
    </ToastProvider>
  )
  return handlers
}

const saveButton = () => screen.getByRole('button', { name: /save policy/i })

beforeEach(() => {
  writes.length = 0
})
afterEach(cleanup)

describe('PolicyImportDialog', () => {
  it('fills the form from the policy and saves it for an existing client', async () => {
    const { onSaved } = renderDialog({ clients: [existingClient] })

    expect(await screen.findByText('Existing client')).toBeTruthy()
    expect(screen.getByText('Коваленко Олена Петрівна', { selector: 'div' })).toBeTruthy()
    expect(screen.getByLabelText('Policy Number').value).toBe('EP-200000001')
    expect(screen.getByLabelText('Insurance Company *').value).toBe('BBS')
    expect(screen.getByLabelText('Policy Type *').value).toBe('CPV')
    expect(screen.getByLabelText('Policy Amount *').value).toBe('3221')
    expect(screen.getByLabelText('Start Date *').value).toBe('08/09/2026')
    expect(screen.getByText('ЗАЗ Ланос, BC1234AA')).toBeTruthy()

    fireEvent.click(saveButton())
    await waitFor(() => expect(onSaved).toHaveBeenCalled())

    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ table: 'client_policies', method: 'insert' })
    expect(writes[0].values[0]).toMatchObject({
      client_id: 7,
      policy_number: 'EP-200000001',
      insurance_company_code: 'BBS',
      insurance_policy_type: 'CPV',
      amount: 3221,
      paid_amount: 3221,
      start_date: '2026-09-08',
      end_date: '2027-09-07',
      comment: 'ЗАЗ Ланос, BC1234AA',
      commission_rate: 0.15,
      commission_amount: 483.15,
      payment_status: 'pending',
    })
  })

  it('lets the user correct the car details that go into the comment', async () => {
    renderDialog({ clients: [existingClient] })
    await screen.findByText('Existing client')

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'Sens' } })
    fireEvent.change(screen.getByLabelText('License Plate'), { target: { value: 'bc0001aa' } })
    fireEvent.change(screen.getByLabelText('Extra note (optional)'), { target: { value: 'Second driver: son' } })

    expect(screen.getByText(/ЗАЗ Sens, BC0001AA/).textContent).toBe('ЗАЗ Sens, BC0001AA\nSecond driver: son')
  })

  it('requires adding a new client before saving, then saves with the new client', async () => {
    const { onSaved, reloadClients } = renderDialog()

    expect(await screen.findByText('New client: not saved yet')).toBeTruthy()
    expect(screen.getByLabelText('Last Name *').value).toBe('Коваленко')
    expect(screen.getByLabelText('Phone Number').value).toBe('(050) 111 22 33')
    expect(saveButton().disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /add client/i }))
    expect(await screen.findByText('Client added')).toBeTruthy()
    expect(writes[0]).toMatchObject({ table: 'clients', method: 'insert' })
    expect(writes[0].values[0]).toMatchObject({ first_name: 'Олена', last_name: 'Коваленко', email: 'olena.k@example.com' })
    expect(reloadClients).toHaveBeenCalled()

    fireEvent.click(saveButton())
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(writes[1].values[0].client_id).toBe(501)
  })

  it('edits an existing client, offering the values from the policy', async () => {
    renderDialog({ clients: [existingClient] })
    await screen.findByText('Existing client')
    expect(screen.getByText(/The policy has different phone number, email/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByLabelText('Phone Number').value).toBe('(067) 999 99 99')
    expect(screen.getByLabelText('Email').value).toBe('olena.k@example.com') // empty field filled from the policy
    expect(saveButton().disabled).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /use value from policy: \(050\) 111 22 33/i }))
    fireEvent.click(screen.getByRole('button', { name: /save client/i }))

    expect(await screen.findByText('Existing client')).toBeTruthy()
    expect(writes[0]).toMatchObject({ table: 'clients', method: 'update', where: { id: 7 } })
    expect(writes[0].values).toMatchObject({ phone_number: '(050) 111 22 33', email: 'olena.k@example.com' })
    expect(saveButton().disabled).toBe(false)
  })

  it('shows the existing client comment and saves a change together with the policy', async () => {
    const { onSaved, reloadClients } = renderDialog({ clients: [{ ...existingClient, comment: 'Prefers calls' }] })
    await screen.findByText('Existing client')

    const box = screen.getByLabelText('Client comment')
    expect(box.value).toBe('Prefers calls')
    fireEvent.change(box, { target: { value: 'Prefers calls after 18:00' } })
    expect(screen.getByText(/saved together with the policy/)).toBeTruthy()

    fireEvent.click(saveButton())
    await waitFor(() => expect(onSaved).toHaveBeenCalled())

    expect(writes.map((w) => `${w.method} ${w.table}`)).toEqual(['update clients', 'insert client_policies'])
    expect(writes[0]).toMatchObject({ where: { id: 7 }, values: { comment: 'Prefers calls after 18:00' } })
    expect(writes[1].values[0].comment).toBe('ЗАЗ Ланос, BC1234AA') // the policy comment stays the car
    expect(reloadClients).toHaveBeenCalled()
  })

  it('saves a comment for a new client', async () => {
    renderDialog()
    await screen.findByText('New client: not saved yet')

    fireEvent.change(screen.getByLabelText('Client comment'), { target: { value: 'Recommended by Ігор' } })
    fireEvent.click(screen.getByRole('button', { name: /add client/i }))

    await screen.findByText('Client added')
    expect(writes[0].values[0]).toMatchObject({ last_name: 'Коваленко', comment: 'Recommended by Ігор' })
    // The saved comment now shows in the existing-client view
    expect(screen.getByLabelText('Client comment').value).toBe('Recommended by Ігор')
  })

  it('blocks saving a policy number that already exists', async () => {
    renderDialog({
      clients: [existingClient],
      policies: [{ id: 3, policy_number: 'EP-200000001', clients: { first_name: 'Олена', last_name: 'Коваленко' } }],
    })
    expect(await screen.findByText(/is already saved for Олена Коваленко/)).toBeTruthy()
    expect(saveButton().disabled).toBe(true)
  })

  it('shows an error for files that are not policies', async () => {
    const { extractPolicyRows } = await import('../lib/policyPdf/extractText')
    extractPolicyRows.mockResolvedValueOnce(['Рахунок-фактура № 15'])
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderDialog()
    expect(await screen.findByText(/No policy details were found/)).toBeTruthy()
  })
})
