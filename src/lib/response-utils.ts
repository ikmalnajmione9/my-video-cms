export async function readResponseBody<T = any>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') || ''
  const raw = await response.text()

  if (!raw) return null

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw) as T
    } catch {
      return { error: raw } as T
    }
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return { error: raw } as T
  }
}