import { unwrapPdf } from './unwrap'

// Read a policy file and return its text as rows, top to bottom.
// Text pieces on the same line are joined with " | " (table cells), e.g. "9.2. Марка | CHERY".
export async function extractPolicyRows(file) {
  const bytes = unwrapPdf(new Uint8Array(await file.arrayBuffer()))

  // pdf.js is large, so it is only loaded when someone actually uploads a file.
  // The legacy build supports older phones and browsers.
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const doc = await pdfjs.getDocument({ data: bytes, verbosity: 0 }).promise
  try {
    const rows = []
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      const { items } = await page.getTextContent()
      rows.push(...groupIntoRows(items))
    }
    return rows
  } finally {
    doc.destroy()
  }
}

// Group pdf.js text items into lines by their vertical position, then order each line left to right
export function groupIntoRows(items, tolerance = 2.5) {
  const lines = []
  for (const item of items) {
    const text = item.str?.trim()
    if (!text) continue
    const x = item.transform[4]
    const y = item.transform[5]
    let line = lines.find((l) => Math.abs(l.y - y) < tolerance)
    if (!line) {
      line = { y, parts: [] }
      lines.push(line)
    }
    line.parts.push({ x, text })
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => line.parts.sort((a, b) => a.x - b.x).map((p) => p.text).join(' | '))
}
