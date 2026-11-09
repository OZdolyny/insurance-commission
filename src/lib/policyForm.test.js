import { describe, expect, it } from 'vitest'
import { buildPolicyData } from './policyForm'

const form = {
  client_id: '5',
  insurance_company_code: 'BBS',
  insurance_policy_type: 'CPV',
  amount: '2416',
  paid_amount: '2416',
  start_date: '08/09/2026',
  end_date: '07/09/2027',
  policy_date: '07/09/2026',
  policy_number: ' EP-1 ',
  comment: 'ЗАЗ Ланос, BC1234AA',
  no_commission: false,
}
const rate = { commission_rate: '0.15' }

describe('buildPolicyData', () => {
  it('builds a new pending policy with the commission', () => {
    const { data, error } = buildPolicyData(form, { selectedRate: rate, isNew: true })
    expect(error).toBeUndefined()
    expect(data).toMatchObject({
      client_id: 5, amount: 2416, start_date: '2026-09-08', end_date: '2027-09-07', policy_date: '2026-09-07',
      policy_number: 'EP-1', commission_rate: 0.15, commission_amount: 362.4, payment_status: 'pending',
    })
  })

  it('does not touch the payment status when editing', () => {
    expect(buildPolicyData(form, { selectedRate: rate, isNew: false }).data).not.toHaveProperty('payment_status')
  })

  it('saves the renewal decision when editing only', () => {
    const edited = { ...form, renewal_status: 'renewed' }
    expect(buildPolicyData(edited, { selectedRate: rate, isNew: false }).data.renewal_status).toBe('renewed')
    expect(buildPolicyData({ ...form, renewal_status: '' }, { selectedRate: rate, isNew: false }).data.renewal_status).toBeNull()
    expect(buildPolicyData(edited, { selectedRate: rate, isNew: true }).data).not.toHaveProperty('renewal_status')
  })

  it('reports the first problem', () => {
    expect(buildPolicyData({ ...form, client_id: '' }, { selectedRate: rate }).error).toMatch(/client/)
    expect(buildPolicyData(form, { selectedRate: null }).error).toMatch(/No commission rate/)
    expect(buildPolicyData({ ...form, paid_amount: '3000' }, { selectedRate: rate }).error).toMatch(/Paid amount/)
    expect(buildPolicyData({ ...form, end_date: '01/01/2026' }, { selectedRate: rate }).error).toMatch(/before the start/)
    expect(buildPolicyData({ ...form, policy_date: '31/02/2026' }, { selectedRate: rate }).error).toMatch(/Policy date/)
  })

  it('allows a missing rate when "no commission" is ticked', () => {
    const { data } = buildPolicyData({ ...form, no_commission: true }, { selectedRate: null, isNew: true })
    expect(data).toMatchObject({ commission_rate: 0, commission_amount: 0, no_commission: true })
  })
})

describe('buildPolicyData policy date', () => {
  it('leaves the policy date empty when not given', () => {
    const { data } = buildPolicyData({ ...form, policy_date: '' }, { selectedRate: rate, isNew: true })
    expect(data.policy_date).toBeNull()
  })
})
