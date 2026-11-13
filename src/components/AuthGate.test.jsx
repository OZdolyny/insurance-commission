// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

// Fake Supabase: auth state is controlled per test; every table query returns no rows
const state = vi.hoisted(() => ({ session: null, role: null, redirect: null, signInError: null, listeners: [], calls: [] }))

vi.mock('../lib/supabase', () => {
  const emit = (event, session) => state.listeners.forEach((fn) => fn(event, session))
  const query = (table) => {
    const result = () => Promise.resolve({ data: table === 'app_users' ? (state.role ? { role: state.role } : null) : [], count: 0, error: null })
    const builder = {
      select: () => builder, eq: () => builder, order: () => builder, in: () => builder,
      maybeSingle: result,
      then: (resolve, reject) => result().then(resolve, reject),
    }
    return builder
  }
  return {
    supabaseConfigError: null,
    get authRedirect() { return state.redirect },
    supabase: {
      from: query,
      auth: {
        getSession: () => Promise.resolve({ data: { session: state.session } }),
        onAuthStateChange: (fn) => {
          state.listeners.push(fn)
          return { data: { subscription: { unsubscribe: () => {} } } }
        },
        signInWithPassword: async (credentials) => {
          state.calls.push(['signIn', credentials])
          if (state.signInError) return { error: state.signInError }
          state.session = { user: { id: 'u1', email: credentials.email } }
          emit('SIGNED_IN', state.session)
          return { error: null }
        },
        signOut: async () => {
          state.calls.push(['signOut'])
          state.session = null
          emit('SIGNED_OUT', null)
          return { error: null }
        },
        resetPasswordForEmail: async (email) => {
          state.calls.push(['reset', email])
          return { error: null }
        },
        updateUser: async (attrs) => {
          state.calls.push(['updateUser', attrs])
          emit('USER_UPDATED', state.session)
          return { error: null }
        },
      },
    },
  }
})

const { default: App } = await import('../App')

beforeEach(() => {
  Object.assign(state, { session: null, role: null, redirect: null, signInError: null, listeners: [], calls: [] })
  window.location.hash = ''
})
afterEach(cleanup)

const signedInUser = { user: { id: 'u1', email: 'owner@example.com' } }

describe('App sign-in gate', () => {
  it('shows the login screen when signed out, and the app after signing in', async () => {
    state.role = 'super_admin'
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
    expect(screen.queryByText('Upload PDF')).toBeNull() // nothing of the app is shown

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: ' owner@example.com ' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Super admin')).toBeTruthy()
    expect(screen.getAllByText('owner@example.com').length).toBeGreaterThan(0)
    expect(state.calls[0]).toEqual(['signIn', { email: 'owner@example.com', password: 'secret123' }])
  })

  it('shows a neutral message for a wrong password and clears the password field', async () => {
    state.signInError = { code: 'invalid_credentials', message: 'Invalid login credentials' }
    render(<App />)
    await screen.findByRole('heading', { name: 'Sign in' })

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'owner@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Wrong email or password.')).toBeTruthy()
    expect(screen.getByLabelText('Password').value).toBe('')
  })

  it('sends a reset link without revealing whether the account exists', async () => {
    render(<App />)
    await screen.findByRole('heading', { name: 'Sign in' })
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }))

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'someone@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByText(/If an account exists for this email/)).toBeTruthy()
    expect(state.calls).toContainEqual(['reset', 'someone@example.com'])
  })

  it('asks for a new password after an invitation link, then opens the app', async () => {
    state.session = signedInUser
    state.role = 'super_admin'
    state.redirect = { type: 'invite' }
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Choose your password' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.change(screen.getByLabelText('Repeat password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByText(/at least 8/)).toBeTruthy()
    expect(state.calls).toEqual([])

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'newpass2026' } })
    fireEvent.change(screen.getByLabelText('Repeat password'), { target: { value: 'newpass2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))

    expect(await screen.findByText('Super admin')).toBeTruthy()
    expect(state.calls).toEqual([['updateUser', { password: 'newpass2026' }]])
  })

  it('blocks a signed-in account that has no role in app_users', async () => {
    state.session = signedInUser
    state.role = null
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'No access' })).toBeTruthy()
    expect(screen.queryByText('Upload PDF')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
  })

  it('signs out from the sidebar', async () => {
    state.session = signedInUser
    state.role = 'super_admin'
    render(<App />)
    await screen.findByText('Super admin')

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Sign in' })).toBeTruthy())
    expect(state.calls).toContainEqual(['signOut'])
  })
})
