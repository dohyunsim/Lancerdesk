import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function getServerUser() {
  const token = cookies().get('ld_token')?.value
  if (!token) return null
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
