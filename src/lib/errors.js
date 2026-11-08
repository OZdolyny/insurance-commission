// Turn Supabase/Postgres errors into messages a user can act on
export function friendlyError(error, { duplicate, inUse } = {}) {
  if (!error) return 'Something went wrong.'
  if (error.code === '23505') return duplicate || 'A record with these values already exists.'
  if (error.code === '23503') return inUse || 'This record is used elsewhere and cannot be deleted.'
  if (/failed to fetch|fetch failed|networkerror|load failed/i.test(error.message || '')) {
    return 'Cannot reach the server. Check your internet connection and try again.'
  }
  return error.message || 'Something went wrong.'
}
