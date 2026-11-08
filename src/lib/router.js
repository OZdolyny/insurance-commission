import { useCallback, useEffect, useState } from 'react'

// Minimal hash router: URLs look like #/policies?client=12
// Hash routes work on static hosting without server rewrites, and survive refresh and back/forward.

export const PAGES = ['dashboard', 'clients', 'policies', 'commissions', 'companies', 'policy-types', 'policy-rates']

export function parseHash(hash) {
  const [path = '', query = ''] = String(hash || '').replace(/^#\/?/, '').split('?')
  const page = PAGES.includes(path) ? path : 'dashboard'
  return { page, params: Object.fromEntries(new URLSearchParams(query)) }
}

export function buildHash(page, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString()
  return `#/${page}${query ? `?${query}` : ''}`
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((page, params) => {
    window.location.hash = buildHash(page, params)
  }, [])

  return { ...route, navigate }
}
