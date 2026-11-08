import { describe, expect, it } from 'vitest'
import { unwrapPdf } from './unwrap'
import { groupIntoRows } from './extractText'
import { parsePolicy, looksLikePolicy, vehicleComment } from './parsePolicy'
import { findClient, findCompany, findDuplicatePolicy, findPolicyType } from './matching'
import { latinizeLookalikes, normalizePlate, titleCase } from './normalize'
import { POLICY_ROWS } from './__fixtures__/policyRows'


describe('parsePolicy', () => {
  const parsed = parsePolicy(POLICY_ROWS)

  it('reads the policy number, dates and premium', () => {
    expect(parsed.policyNumber).toBe('EP-200000001')
    expect(parsed.startDate).toBe('08/09/2026')
    expect(parsed.endDate).toBe('07/09/2027')
    expect(parsed.premium).toBe('3221')
    expect(parsed.isMotorLiability).toBe(true)
    expect(looksLikePolicy(parsed)).toBe(true)
  })

  it('reads the policy holder, fixing capitals and skipping the insurer hotline', () => {
    expect(parsed.client).toEqual({
      lastName: 'Коваленко',
      firstName: 'Олена',
      fatherName: 'Петрівна',
      phone: '(050) 111 22 33',
      email: 'olena.k@example.com',
      birthDate: '01/02/1990',
    })
  })

  it('reads the insurer and the car', () => {
    expect(parsed.insurer).toEqual({ name: 'ББС ІНШУРАНС', edrpou: '20344871' })
    expect(parsed.vehicle).toMatchObject({ brand: 'ЗАЗ', model: 'Ланос', plate: 'BC1234AA', year: '2008' })
    expect(vehicleComment(parsed.vehicle)).toBe('ЗАЗ Ланос, BC1234AA')
  })

  it('leaves fields empty when the file is not a policy', () => {
    const other = parsePolicy(['Рахунок-фактура № 15', 'Сума | 100,00 грн.'])
    expect(other.policyNumber).toBe('')
    expect(looksLikePolicy(other)).toBe(false)
  })
})

describe('normalize', () => {
  it('turns look-alike Cyrillic letters into Latin only in Latin-looking text', () => {
    expect(latinizeLookalikes('І30')).toBe('I30')
    expect(latinizeLookalikes('ЗАЗ')).toBe('ЗАЗ')
    expect(normalizePlate('вс 12-34 аа')).toBe('BC1234AA')
  })

  it('title-cases names, including double-barrelled ones', () => {
    expect(titleCase('КОВАЛЕНКО')).toBe('Коваленко')
    expect(titleCase('іванова-петренко')).toBe('Іванова-Петренко')
  })

  it('formats an empty car', () => {
    expect(vehicleComment({ brand: '', model: '', plate: '' })).toBe('')
  })
})

describe('matching', () => {
  const clients = [
    { id: 1, first_name: 'Олена', last_name: 'Коваленко', father_name: 'Петрівна', phone_number: '(050) 111 22 33' },
    { id: 2, first_name: 'Олена', last_name: 'Коваленко', father_name: 'Іванівна', phone_number: null },
    { id: 3, first_name: 'Ігор', last_name: 'Шевчук', father_name: null, phone_number: '(067) 000 00 01' },
  ]

  it('matches by name, preferring the one whose phone also matches', () => {
    const match = findClient(clients, { lastName: 'Коваленко', firstName: 'Олена', fatherName: 'Петрівна', phone: '+380501112233' })
    expect(match).toEqual({ client: clients[0], reason: 'name and phone' })
  })

  it('does not match a namesake with a different father name', () => {
    expect(findClient(clients.slice(1), { lastName: 'Коваленко', firstName: 'Олена', fatherName: 'Петрівна', phone: '' })).toBeNull()
  })

  it('matches by last name and phone when the first name is spelled differently', () => {
    expect(findClient(clients, { lastName: 'ШЕВЧУК', firstName: 'Игорь', fatherName: '', phone: '(067) 000 00 01' })?.client.id).toBe(3)
  })

  it('returns null for a new client', () => {
    expect(findClient(clients, { lastName: 'Новак', firstName: 'Анна', fatherName: '', phone: '' })).toBeNull()
  })

  it('finds the company by transliterated name and the motor liability type', () => {
    const companies = [{ code: 'ARS', name: 'Arsenal Insurance' }, { code: 'BBS', name: 'BBS Insurance' }]
    expect(findCompany(companies, 'ББС ІНШУРАНС')?.code).toBe('BBS')
    expect(findCompany(companies, 'УНІКА')).toBeNull()
    const types = [{ type: 'KAS', name: 'КАСКО' }, { type: 'CPV', name: 'Цивілка' }]
    expect(findPolicyType(types, { isMotorLiability: true })?.type).toBe('CPV')
    expect(findPolicyType(types, { isMotorLiability: false })).toBeNull()
  })

  it('detects a policy number that is already saved', () => {
    const policies = [{ id: 9, policy_number: 'EP-200000001' }]
    expect(findDuplicatePolicy(policies, 'ep 200000001')?.id).toBe(9)
    expect(findDuplicatePolicy(policies, 'EP-200000002')).toBeNull()
  })
})

// Minimal DER builder for the tests: tag + definite length + content
function tlv(tag, ...parts) {
  const content = parts.flatMap((p) => [...p])
  const n = content.length
  const length = n < 0x80 ? [n] : n < 0x100 ? [0x81, n] : [0x82, n >> 8, n & 0xff]
  return new Uint8Array([tag, ...length, ...content])
}

describe('unwrapPdf', () => {
  const pdf = new TextEncoder().encode('%PDF-1.4\nhello\n%%EOF')
  const oid = (bytes) => tlv(0x06, new Uint8Array(bytes))
  const signed = (eContent) => tlv(0x30,
    oid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x02]), // signedData
    tlv(0xa0, tlv(0x30,
      tlv(0x02, new Uint8Array([1])), // version
      tlv(0x31), // digestAlgorithms
      tlv(0x30, oid([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x07, 0x01]), tlv(0xa0, eContent)),
      tlv(0x31) // signerInfos
    ))
  )

  it('returns a plain PDF unchanged', () => {
    expect(unwrapPdf(pdf)).toBe(pdf)
  })

  it('extracts the PDF from a signature envelope', () => {
    expect([...unwrapPdf(signed(tlv(0x04, pdf)))]).toEqual([...pdf])
  })

  it('joins a PDF stored in chunks', () => {
    const chunked = tlv(0x24, tlv(0x04, pdf.subarray(0, 7)), tlv(0x04, pdf.subarray(7)))
    expect([...unwrapPdf(signed(chunked))]).toEqual([...pdf])
  })

  it('rejects files without a PDF', () => {
    expect(() => unwrapPdf(new TextEncoder().encode('not a pdf'))).toThrow(/not a PDF/)
  })
})

describe('groupIntoRows', () => {
  it('joins items on the same line left to right', () => {
    const item = (str, x, y) => ({ str, transform: [1, 0, 0, 1, x, y] })
    expect(groupIntoRows([item('CHERY', 300, 500), item('9.2. Марка', 50, 501), item('9.3. Модель', 50, 480), item(' ', 0, 0)]))
      .toEqual(['9.2. Марка | CHERY', '9.3. Модель'])
  })
})
