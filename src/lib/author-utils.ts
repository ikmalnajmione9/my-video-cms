export function getEmailLocalPart(email?: string | null) {
  const normalizedEmail = (email || '').trim()
  if (!normalizedEmail) return ''

  const [localPart] = normalizedEmail.split('@')
  return (localPart || normalizedEmail).trim()
}