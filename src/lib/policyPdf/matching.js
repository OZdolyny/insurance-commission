import { normalizeName, phoneKey, transliterate } from './normalize'

// Find the existing client for a parsed policy holder.
// A match needs the same first and last name (in either order), or the same last name and phone.
// Returns { client, reason } or null.
export function findClient(clients, parsedClient) {
  const last = normalizeName(parsedClient.lastName)
  const first = normalizeName(parsedClient.firstName)
  const father = normalizeName(parsedClient.fatherName)
  const phone = phoneKey(parsedClient.phone)
  if (!last && !phone) return null

  let best = null
  for (const client of clients) {
    const cLast = normalizeName(client.last_name)
    const cFirst = normalizeName(client.first_name)
    const cFather = normalizeName(client.father_name)
    const samePhone = !!phone && phoneKey(client.phone_number) === phone
    const sameName = !!last && !!first && (
      (cLast === last && cFirst === first) || (cLast === first && cFirst === last)
    )
    if (!sameName && !(samePhone && cLast === last)) continue

    // A different father name means a different person with the same name
    if (sameName && father && cFather && cFather !== father && !samePhone) continue

    const score = (sameName ? 2 : 0) + (samePhone ? 2 : 0) + (father && cFather === father ? 1 : 0)
    if (!best || score > best.score) {
      best = { client, score, reason: sameName && samePhone ? 'name and phone' : sameName ? 'name' : 'phone' }
    }
  }
  return best && { client: best.client, reason: best.reason }
}

// Match the insurer from the PDF ("ББС ІНШУРАНС") to a saved company ("BBS Insurance", code "BBS")
export function findCompany(companies, insurerName) {
  const words = transliterate(insurerName).split(/[^a-z0-9]+/).filter((w) => w.length >= 3)
  if (!words.length) return null
  return companies.find((company) => {
    const names = `${company.code} ${transliterate(company.name)}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
    return words.some((word) => names.includes(word))
  }) || null
}

// Motor third-party liability policies -> the type named like "Цивілка", "ОСЦПВ", "Автоцивілка", "OSAGO"
const MOTOR_LIABILITY = /цивіл|осцпв|осаго|osago|mtpl|liability|автоцив/i

export function findPolicyType(policyTypes, parsed) {
  if (!parsed.isMotorLiability) return null
  return policyTypes.find((t) => MOTOR_LIABILITY.test(`${t.type} ${t.name}`)) || null
}

export function findDuplicatePolicy(policies, policyNumber) {
  const key = String(policyNumber || '').replace(/[\s_-]/g, '').toUpperCase()
  if (!key) return null
  return policies.find((p) => String(p.policy_number || '').replace(/[\s_-]/g, '').toUpperCase() === key) || null
}
