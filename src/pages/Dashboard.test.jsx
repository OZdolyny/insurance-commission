// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ToastProvider } from '../components/ui/Toast'
import Dashboard from './Dashboard'
import { addDays, kyivToday } from '../lib/renewals'

const today = kyivToday()
const updates = []

const policies = [
  { id: 1, client_id: 10, start_date: addDays(today, -358), end_date: addDays(today, 7), insurance_company_code: 'BBS',
    insurance_policy_type: 'CPV', commission_amount: '100', payment_status: 'pending', renewal_status: null,
    comment: 'ЗАЗ Ланос, BC1234AA', clients: { first_name: 'Олена', last_name: 'Коваленко', phone_number: null } },
  // Already marked: hidden
  { id: 2, client_id: 11, start_date: addDays(today, -360), end_date: addDays(today, 5), insurance_company_code: 'BBS',
    insurance_policy_type: 'CPV', commission_amount: '100', payment_status: 'paid', renewal_status: 'renewed',
    comment: null, clients: { first_name: 'Ігор', last_name: 'Шевчук', phone_number: null } },
  // Renewed by a newer policy for the same car: hidden
  { id: 3, client_id: 12, start_date: addDays(today, -355), end_date: addDays(today, 10), insurance_company_code: 'BBS',
    insurance_policy_type: 'CPV', commission_amount: '100', payment_status: 'paid', renewal_status: null,
    comment: 'Chery QQ, BC7777KT', clients: { first_name: 'Анна', last_name: 'Новак', phone_number: null } },
  { id: 4, client_id: 12, start_date: addDays(today, 11), end_date: addDays(today, 375), insurance_company_code: 'BBS',
    insurance_policy_type: 'CPV', commission_amount: '100', payment_status: 'pending', renewal_status: null,
    comment: 'Chery QQ, BC7777KT', clients: { first_name: 'Анна', last_name: 'Новак', phone_number: null } },
]

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table) => {
      const call = { table }
      const builder = {
        select: () => builder,
        update: (values) => ((call.values = values), builder),
        eq: (column, value) => {
          call.where = { [column]: value }
          updates.push(call)
          return Promise.resolve({ error: null })
        },
        then: (resolve) => resolve(table === 'clients' ? { count: 3, error: null } : { data: policies, error: null }),
      }
      return builder
    },
  },
}))

afterEach(cleanup)

describe('Dashboard renewals', () => {
  it('lists only policies that still need a decision, and marks one as renewed', async () => {
    render(<ToastProvider><Dashboard navigate={vi.fn()} /></ToastProvider>)

    await screen.findByText('Upcoming Renewals')
    expect(screen.getByText(/Олена\s+Коваленко/)).toBeTruthy()
    expect(screen.queryByText(/Шевчук/)).toBeNull() // marked renewed
    expect(screen.queryByText(/Новак/)).toBeNull() // renewed by a newer policy

    fireEvent.click(screen.getByRole('button', { name: /as renewed/i }))
    await waitFor(() => expect(updates).toHaveLength(1))
    expect(updates[0]).toEqual({ table: 'client_policies', values: { renewal_status: 'renewed' }, where: { id: 1 } })
    await waitFor(() => expect(screen.getByText('No policies are due for renewal.')).toBeTruthy())
  })
})
