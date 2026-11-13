import { describe, expect, it } from 'vitest'
import { readAuthRedirect } from './supabase'
import { authErrorMessage } from './auth'
import { checkNewPassword } from '../components/AuthScreens'

describe('readAuthRedirect', () => {
  it('recognises invitation and password reset links', () => {
    expect(readAuthRedirect('#access_token=abc&refresh_token=def&type=invite')).toEqual({ type: 'invite' })
    expect(readAuthRedirect('#access_token=abc&type=recovery')).toEqual({ type: 'recovery' })
  })

  it('reads expired or invalid links', () => {
    expect(readAuthRedirect('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'))
      .toEqual({ type: 'error', code: 'otp_expired', message: 'Email link is invalid or has expired' })
  })

  it('ignores normal page addresses', () => {
    expect(readAuthRedirect('#/policies?client=12')).toBeNull()
    expect(readAuthRedirect('')).toBeNull()
  })
})

describe('authErrorMessage', () => {
  it('never reveals whether the email exists', () => {
    expect(authErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('Wrong email or password.')
  })

  it('explains common problems', () => {
    expect(authErrorMessage({ code: 'otp_expired' })).toMatch(/expired/)
    expect(authErrorMessage({ code: 'over_request_rate_limit' })).toMatch(/Too many attempts/)
    expect(authErrorMessage({ message: 'TypeError: Failed to fetch' })).toMatch(/Cannot reach the server/)
  })
})

describe('checkNewPassword', () => {
  it('requires 8+ characters, letters and numbers, and a matching repeat', () => {
    expect(checkNewPassword('short1', 'short1')).toMatch(/at least 8/)
    expect(checkNewPassword('onlyletters', 'onlyletters')).toMatch(/letters and numbers/)
    expect(checkNewPassword('12345678', '12345678')).toMatch(/letters and numbers/)
    expect(checkNewPassword('goodpass123', 'goodpass124')).toMatch(/do not match/)
    expect(checkNewPassword('пароль2026', 'пароль2026')).toBeNull()
    expect(checkNewPassword('goodpass123', 'goodpass123')).toBeNull()
  })
})
