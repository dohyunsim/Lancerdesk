// Lancerdesk Dashboard — Backend API client

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const API_KEY =
  process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || ''

function getHeaders(token?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const url = `${API_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(token),
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`API ${response.status}: ${text}`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  user_id: string
  title: string
  category: string
  status: string
  budget: number | null
  client_name: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  project_id: string | null
  soomgo_url: string
  category: string
  messages: Array<{ role: string; content: string; timestamp: string }>
  created_at: string
  updated_at: string
}

export interface AnalyticsSummary {
  total_projects: number
  active_projects: number
  total_conversations: number
  total_ai_responses: number
  category_breakdown: Record<string, number>
}

export interface MonthlyData {
  month: number
  conversations: number
  projects: number
}

// ─── Projects API ─────────────────────────────────────────────────────────────

export const projectsApi = {
  list: (userId?: string, token?: string): Promise<Project[]> => {
    const qs = userId ? `?user_id=${userId}` : ''
    return request<Project[]>(`/projects${qs}`, {}, token)
  },
  get: (id: string, token?: string): Promise<Project> =>
    request<Project>(`/projects/${id}`, {}, token),
  create: (
    data: Omit<Project, 'id' | 'created_at' | 'updated_at'>,
    token?: string
  ): Promise<Project> =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }, token),
  update: (id: string, data: Partial<Project>, token?: string): Promise<Project> =>
    request<Project>(
      `/projects/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      token
    ),
  delete: (id: string, token?: string): Promise<void> =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }, token),
}

// ─── Conversations API ────────────────────────────────────────────────────────

export const conversationsApi = {
  list: (userId?: string, token?: string): Promise<Conversation[]> => {
    const qs = userId ? `?user_id=${userId}` : ''
    return request<Conversation[]>(`/conversations${qs}`, {}, token)
  },
  get: (id: string, token?: string): Promise<Conversation> =>
    request<Conversation>(`/conversations/${id}`, {}, token),
  delete: (id: string, token?: string): Promise<void> =>
    request<void>(`/conversations/${id}`, { method: 'DELETE' }, token),
}

// ─── Analytics API ────────────────────────────────────────────────────────────

export const analyticsApi = {
  summary: (userId?: string, token?: string): Promise<AnalyticsSummary> => {
    const qs = userId ? `?user_id=${userId}` : ''
    return request<AnalyticsSummary>(`/analytics/summary${qs}`, {}, token)
  },
  monthly: (year: number, userId?: string, token?: string): Promise<MonthlyData[]> => {
    const params = new URLSearchParams({ year: String(year) })
    if (userId) params.set('user_id', userId)
    return request<MonthlyData[]>(`/analytics/monthly?${params.toString()}`, {}, token)
  },
}
