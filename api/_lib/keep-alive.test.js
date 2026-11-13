import { afterEach, describe, expect, it, vi } from 'vitest'
import { pingDatabase } from '../keep-alive.js'

function fakeClient({ error = null } = {}) {
  const calls = []
  const createClient = (url, key, options) => {
    calls.push({ url, key, options })
    const query = { select: () => query, limit: () => Promise.resolve({ error }) }
    return { from: (table) => (calls.push({ table }), query) }
  }
  return { createClient, calls }
}

afterEach(() => vi.restoreAllMocks())

describe('keep-alive pingDatabase', () => {
  it('uses the server-only key when it is set', async () => {
    const { createClient, calls } = fakeClient()
    const result = await pingDatabase({
      env: { VITE_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service', VITE_SUPABASE_ANON_KEY: 'public' },
      createClient,
    })
    expect(result.status).toBe(200)
    expect(calls[0]).toMatchObject({ url: 'https://x.supabase.co', key: 'service' })
    expect(calls[1]).toEqual({ table: 'clients' })
  })

  it('falls back to the public key with a warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { createClient, calls } = fakeClient()
    const result = await pingDatabase({ env: { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'public' }, createClient })
    expect(result.status).toBe(200)
    expect(calls[0].key).toBe('public')
    expect(warn).toHaveBeenCalled()
  })

  it('reports a failed query without client data', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { createClient } = fakeClient({ error: { message: 'permission denied for table clients', code: '42501' } })
    const result = await pingDatabase({ env: { VITE_SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service' }, createClient })
    expect(result).toEqual({ status: 500, body: { error: 'Keep-alive query failed' } })
  })

  it('refuses to run without configuration', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await pingDatabase({ env: {}, createClient: fakeClient().createClient })
    expect(result).toEqual({ status: 500, body: { error: 'Server is not configured' } })
  })
})
