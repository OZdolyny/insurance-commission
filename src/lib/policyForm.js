import { parseDateInput } from './utils'
import { calculateCommission } from './commission'

// Validate policy form values and turn them into a client_policies row.
// Shared by the policy form and the PDF import dialog.
// Returns { error } or { data }.
export function buildPolicyData(form, { selectedRate, isNew }) {
  if (!form.client_id) return { error: 'Choose or add the client first.' }
  if (!form.insurance_company_code) return { error: 'Choose the insurance company.' }
  if (!form.insurance_policy_type) return { error: 'Choose the policy type.' }

  if (!selectedRate && !form.no_commission) {
    return { error: 'No commission rate exists for this company and policy type. Add a rate first or tick "No commission".' }
  }

  const amount = parseFloat(form.amount)
  const paidAmount = parseFloat(form.paid_amount)
  if (Number.isNaN(amount) || amount < 0) return { error: 'Enter the policy amount.' }
  if (Number.isNaN(paidAmount) || paidAmount < 0) return { error: 'Enter the paid amount.' }
  if (paidAmount > amount) return { error: 'Paid amount cannot be more than the policy amount.' }

  const startDate = parseDateInput(form.start_date)
  if (!startDate) return { error: 'Start date is not a valid date. Use dd/mm/yyyy.' }

  const endDate = form.end_date ? parseDateInput(form.end_date) : null
  if (form.end_date && !endDate) return { error: 'End date is not a valid date. Use dd/mm/yyyy, or leave it empty.' }
  if (endDate && endDate < startDate) return { error: 'End date cannot be before the start date.' }

  // Contract date: optional (older policies do not have it)
  const policyDate = form.policy_date ? parseDateInput(form.policy_date) : null
  if (form.policy_date && !policyDate) return { error: 'Policy date is not a valid date. Use dd/mm/yyyy, or leave it empty.' }

  const data = {
    client_id: parseInt(form.client_id),
    insurance_company_code: form.insurance_company_code,
    insurance_policy_type: form.insurance_policy_type,
    amount,
    paid_amount: paidAmount,
    start_date: startDate,
    end_date: endDate,
    policy_date: policyDate,
    policy_number: form.policy_number?.trim() || null,
    comment: form.comment?.trim() || null,
    commission_rate: form.no_commission ? 0 : parseFloat(selectedRate.commission_rate),
    commission_amount: calculateCommission({
      amount,
      paidAmount,
      rate: selectedRate?.commission_rate,
      noCommission: form.no_commission,
    }),
    no_commission: !!form.no_commission,
  }

  // Only new policies start as pending; editing must keep the existing payment status/date.
  if (isNew) data.payment_status = 'pending'

  return { data }
}

export function findRate(policyRates, companyCode, policyType) {
  return policyRates.find(
    (r) => r.insurance_company_code === companyCode && r.insurance_policy_type === policyType
  ) || null
}
