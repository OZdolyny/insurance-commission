import { describe, expect, it } from 'vitest'
import {
  addDays, daysBetween, dueOffset, escapeHtml, findRenewal, formatDigest, internationalPhone,
  kyivHour, kyivToday, planReminders, remindersActive,
} from './renewals'

const TODAY = '2026-11-09'

const policy = (overrides = {}) => ({
  id: 1,
  client_id: 10,
  insurance_policy_type: 'CPV',
  insurance_company_code: 'BBS',
  insurance_policy_types: { name: 'Цивілка' },
  policy_number: 'EP-200000001',
  start_date: '2025-11-16',
  end_date: addDays(TODAY, 7),
  comment: 'ЗАЗ Ланос, BC1234AA',
  renewal_status: null,
  reminders_snoozed_until: null,
  clients: { first_name: 'Олена', last_name: 'Коваленко', phone_number: '(050) 111 22 33' },
  ...overrides,
})

describe('dates', () => {
  it('uses the Kyiv date, which changes before the UTC date', () => {
    expect(kyivToday(new Date('2026-11-08T21:30:00Z'))).toBe('2026-11-08') // 23:30 in Kyiv
    expect(kyivToday(new Date('2026-11-08T22:30:00Z'))).toBe('2026-11-09') // 00:30 in Kyiv
    expect(kyivToday(new Date('2026-07-01T21:30:00Z'))).toBe('2026-07-02') // summer time: 00:30
  })

  it('gives the Kyiv hour, so 07:00 UTC in summer and 08:00 UTC in winter are both 10:00', () => {
    expect(kyivHour(new Date('2026-07-15T07:30:00Z'))).toBe(10) // summer, UTC+3
    expect(kyivHour(new Date('2026-07-15T08:30:00Z'))).toBe(11)
    expect(kyivHour(new Date('2026-12-15T08:59:00Z'))).toBe(10) // winter, UTC+2
    expect(kyivHour(new Date('2026-12-15T07:30:00Z'))).toBe(9)
    expect(kyivHour(new Date('2026-12-15T22:00:00Z'))).toBe(0)
  })

  it('adds days across months and leap years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(daysBetween('2026-12-31', '2027-01-07')).toBe(7)
  })

  it('picks the closest reminder point that has been reached', () => {
    expect([31, 30, 29, 8, 7, 5, 2, 1, 0, -1, -3, -4].map(dueOffset))
      .toEqual([null, 30, 30, 30, 7, 7, 7, 1, 0, -1, -1, null])
  })
})

describe('renewal detection', () => {
  const old = policy({ id: 1, start_date: '2025-11-16', end_date: '2026-11-15' })

  it('treats a newer policy of the same type for the same car as a renewal', () => {
    const renewal = policy({ id: 2, start_date: '2026-11-16', end_date: '2027-11-15' })
    expect(findRenewal(old, [old, renewal])?.id).toBe(2)
    expect(remindersActive(old, [old, renewal], TODAY)).toBe(false)
  })

  it('ignores policies for another car, another type or that start too early', () => {
    const otherCar = policy({ id: 2, start_date: '2026-11-16', comment: 'Chery QQ, BC7777KT' })
    const otherType = policy({ id: 3, start_date: '2026-11-16', insurance_policy_type: 'KAS' })
    const tooEarly = policy({ id: 4, start_date: '2026-06-01' })
    expect(findRenewal(old, [old, otherCar, otherType, tooEarly])).toBeNull()
  })

  it('stops reminders for renewed, not-renewing and snoozed policies', () => {
    expect(remindersActive(policy({ renewal_status: 'renewed' }), [], TODAY)).toBe(false)
    expect(remindersActive(policy({ renewal_status: 'not_renewing' }), [], TODAY)).toBe(false)
    expect(remindersActive(policy({ reminders_snoozed_until: TODAY }), [], TODAY)).toBe(false)
    expect(remindersActive(policy({ reminders_snoozed_until: addDays(TODAY, -1) }), [], TODAY)).toBe(true)
  })
})

describe('planReminders', () => {
  it('plans the 7-day reminder', () => {
    const plan = planReminders({ policies: [policy()], today: TODAY })
    expect(plan).toMatchObject([{ daysLeft: 7, daysBefore: 7, notification: null }])
  })

  it('does not send the same reminder twice', () => {
    const sent = [{ id: 5, policy_id: 1, days_before: 7, status: 'sent', attempts: 1 }]
    expect(planReminders({ policies: [policy()], notifications: sent, today: TODAY })).toEqual([])
  })

  it('catches up after missed runs with the closest reminder only', () => {
    const p = policy({ end_date: addDays(TODAY, 5) }) // the 7-day point passed 2 days ago
    expect(planReminders({ policies: [p], today: TODAY })).toMatchObject([{ daysLeft: 5, daysBefore: 7 }])
  })

  it('retries a failed reminder until the attempt limit', () => {
    const failed = [{ id: 5, policy_id: 1, days_before: 7, status: 'failed', attempts: 2 }]
    expect(planReminders({ policies: [policy()], notifications: failed, today: TODAY })[0].notification.id).toBe(5)
    const exhausted = [{ ...failed[0], attempts: 5 }]
    expect(planReminders({ policies: [policy()], notifications: exhausted, today: TODAY })).toEqual([])
  })

  it('sends the next reminder point after an earlier one', () => {
    const p = policy({ end_date: addDays(TODAY, 1) })
    const sent = [{ policy_id: 1, days_before: 7, status: 'sent', attempts: 1 }]
    expect(planReminders({ policies: [p], notifications: sent, today: TODAY })).toMatchObject([{ daysBefore: 1 }])
  })

  it('sends an "ended" reminder, then nothing once it is too old', () => {
    expect(planReminders({ policies: [policy({ end_date: addDays(TODAY, -1) })], today: TODAY }))
      .toMatchObject([{ daysBefore: -1 }])
    expect(planReminders({ policies: [policy({ end_date: addDays(TODAY, -4) })], today: TODAY })).toEqual([])
  })

  it('skips renewed policies and sorts by urgency', () => {
    const policies = [
      policy({ id: 1, end_date: addDays(TODAY, 30) }),
      policy({ id: 2, end_date: addDays(TODAY, 1) }),
      policy({ id: 3, end_date: addDays(TODAY, 7), renewal_status: 'renewed' }),
    ]
    expect(planReminders({ policies, today: TODAY }).map((i) => i.policy.id)).toEqual([2, 1])
  })
})

describe('formatDigest', () => {
  it('builds one message grouped by urgency, with a tappable phone and an app link', () => {
    const items = planReminders({
      policies: [policy({ id: 1 }), policy({ id: 2, client_id: 11, end_date: addDays(TODAY, 1), comment: null })],
      today: TODAY,
    })
    const [message, ...rest] = formatDigest(items, { today: TODAY, appUrl: 'https://app.example.com/' })
    expect(rest).toEqual([])
    expect(message.items).toHaveLength(2)
    expect(message.text).toBe([
      '🔔 <b>Policy renewals</b> · 09.11.2026',
      '',
      '<b>🟠 Ends tomorrow</b>',
      '• <b>Коваленко Олена</b> · +380501112233',
      '  EP-200000001 · BBS · Цивілка',
      '  Ends 10.11.2026 (tomorrow) · <a href="https://app.example.com/#/policies?client=11">Open</a>',
      '',
      '<b>🟡 Ends within 7 days</b>',
      '• <b>Коваленко Олена</b> · +380501112233',
      '  EP-200000001 · BBS · Цивілка',
      '  ЗАЗ Ланос, BC1234AA',
      '  Ends 16.11.2026 (in 7 days) · <a href="https://app.example.com/#/policies?client=10">Open</a>',
    ].join('\n'))
  })

  it('escapes HTML in names and comments', () => {
    expect(escapeHtml('A&B <i>')).toBe('A&amp;B &lt;i&gt;')
    const [message] = formatDigest(
      [{ policy: policy({ comment: 'Car <new> & shiny' }), daysLeft: 7, daysBefore: 7 }],
      { today: TODAY }
    )
    expect(message.text).toContain('Car &lt;new&gt; &amp; shiny')
    expect(message.text).not.toContain('<new>')
  })

  it('splits long summaries and repeats the group heading', () => {
    const items = Array.from({ length: 40 }, (_, i) => ({
      policy: policy({ id: i + 1, comment: 'x'.repeat(80) }), daysLeft: 7, daysBefore: 7,
    }))
    const messages = formatDigest(items, { today: TODAY })
    expect(messages.length).toBeGreaterThan(1)
    expect(messages.every((m) => m.text.length <= 4096)).toBe(true)
    expect(messages.flatMap((m) => m.items)).toHaveLength(40)
    expect(messages[1].text).toMatch(/^🔔 <b>Policy renewals<\/b> · 09\.11\.2026 \(continued\)\n\n<b>🟡 Ends within 7 days<\/b>/)
  })

  it('formats phone numbers for Telegram', () => {
    expect(internationalPhone('(050) 111 22 33')).toBe('+380501112233')
    expect(internationalPhone('380501112233')).toBe('+380501112233')
    expect(internationalPhone('')).toBe('')
  })
})
