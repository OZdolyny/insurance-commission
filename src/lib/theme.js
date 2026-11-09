import { useCallback, useEffect, useState } from 'react'

// Theme preference: 'light' | 'dark' | 'system' (follow the device).
// index.html applies the stored theme before the first paint; this module keeps it in sync afterwards.

export const THEME_KEY = 'commissionpro-theme'
const THEME_COLORS = { light: '#f5f7fb', dark: '#0b1020' } // browser UI color, matches --background

export function readStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system' // storage blocked (private mode, settings)
  }
}

export function resolveTheme(preference, prefersDark) {
  return preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference
}

export function applyTheme(resolved) {
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
  // index.html has one tag per device setting; a manual choice must override both
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.setAttribute('content', THEME_COLORS[resolved]))
}

const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)')

export function useTheme() {
  const [preference, setPreferenceState] = useState(readStoredTheme)
  const [prefersDark, setPrefersDark] = useState(() => !!darkQuery()?.matches)

  // Follow the device setting while "system" is chosen
  useEffect(() => {
    const query = darkQuery()
    if (!query) return
    const onChange = (e) => setPrefersDark(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved = resolveTheme(preference, prefersDark)

  useEffect(() => {
    applyTheme(resolved)
  }, [resolved])

  const setPreference = useCallback((value) => {
    setPreferenceState(value)
    try {
      if (value === 'system') localStorage.removeItem(THEME_KEY)
      else localStorage.setItem(THEME_KEY, value)
    } catch {
      // Not saved; the choice still applies until the page is closed
    }
  }, [])

  return { preference, resolved, setPreference }
}
