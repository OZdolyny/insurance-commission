// Policies from Ukrainian insurers are often delivered as a PDF wrapped in a qualified
// electronic signature (PKCS#7 / CMS SignedData, file still named *.pdf).
// unwrapPdf() returns the plain PDF bytes, whether the file is wrapped or not.
// The signature itself is not verified.

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] // "%PDF-"

export function isPdf(bytes) {
  return PDF_MAGIC.every((b, i) => bytes[i] === b)
}

export function unwrapPdf(bytes) {
  if (isPdf(bytes)) return bytes

  if (bytes[0] === 0x30) {
    try {
      const content = signedDataContent(bytes)
      if (content && isPdf(content)) return content
    } catch {
      // Not valid DER; fall back to scanning below
    }
  }

  // Fallback: the PDF is usually stored in one piece inside the envelope
  const start = indexOf(bytes, PDF_MAGIC)
  const eof = lastIndexOf(bytes, [0x25, 0x25, 0x45, 0x4f, 0x46]) // "%%EOF"
  if (start >= 0 && eof > start) return bytes.subarray(start, eof + 5)

  throw new Error('This file is not a PDF and does not contain one.')
}

// ContentInfo { contentType, [0] SignedData { version, digestAlgorithms, encapContentInfo { eContentType, [0] eContent } ... } }
function signedDataContent(bytes) {
  const contentInfo = readTlv(bytes, 0)
  const [, explicit] = children(bytes, contentInfo)
  const signedData = children(bytes, explicit)[0]
  const encapContentInfo = children(bytes, signedData)[2]
  const eContentWrapper = children(bytes, encapContentInfo)[1]
  if (!eContentWrapper) return null // detached signature: no content inside
  const octetString = children(bytes, eContentWrapper)[0]
  return octetStringValue(bytes, octetString)
}

// OCTET STRING may be primitive or (BER) constructed from chunks
function octetStringValue(bytes, node) {
  if (!node.constructed) return bytes.subarray(node.start, node.end)
  const parts = children(bytes, node).map((child) => octetStringValue(bytes, child))
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

// Read one tag-length-value at `offset`. Supports definite and indefinite lengths.
export function readTlv(bytes, offset) {
  const tag = bytes[offset]
  if (tag === undefined) throw new Error('Unexpected end of data')
  const constructed = (tag & 0x20) !== 0
  let pos = offset + 1
  let length = bytes[pos++]
  let indefinite = false

  if (length === 0x80) {
    indefinite = true
  } else if (length > 0x80) {
    const count = length & 0x7f
    if (count > 4) throw new Error('Length too long')
    length = 0
    for (let i = 0; i < count; i++) length = length * 256 + bytes[pos++]
  }

  const start = pos
  if (!indefinite) {
    const end = start + length
    if (end > bytes.length) throw new Error('Length beyond end of data')
    return { tag, constructed, start, end, next: end }
  }

  // Indefinite length: children until the 00 00 end-of-contents marker
  let cursor = start
  while (!(bytes[cursor] === 0 && bytes[cursor + 1] === 0)) {
    cursor = readTlv(bytes, cursor).next
  }
  return { tag, constructed, start, end: cursor, next: cursor + 2 }
}

function children(bytes, node) {
  const result = []
  let cursor = node.start
  while (cursor < node.end) {
    const child = readTlv(bytes, cursor)
    result.push(child)
    cursor = child.next
  }
  return result
}

function indexOf(bytes, pattern, from = 0) {
  outer: for (let i = from; i <= bytes.length - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) if (bytes[i + j] !== pattern[j]) continue outer
    return i
  }
  return -1
}

function lastIndexOf(bytes, pattern) {
  outer: for (let i = bytes.length - pattern.length; i >= 0; i--) {
    for (let j = 0; j < pattern.length; j++) if (bytes[i + j] !== pattern[j]) continue outer
    return i
  }
  return -1
}
