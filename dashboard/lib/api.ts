// Lancerdesk Dashboard — Backend API client

const API_URL = '/api/proxy'

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
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
  client_name: string
  client_id: string
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
  list: (userId?: string): Promise<Project[]> => {
    const qs = userId ? `?user_id=${userId}` : ''
    return request<Project[]>(`/projects${qs}`)
  },
  get: (id: string): Promise<Project> =>
    request<Project>(`/projects/${id}`),
  create: (
    data: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'user_id'>
  ): Promise<Project> =>
    request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Project>): Promise<Project> =>
    request<Project>(
      `/projects/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),
  delete: (id: string): Promise<void> =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }),
}

// ─── Conversations API ────────────────────────────────────────────────────────

export const conversationsApi = {
  list: (userId?: string): Promise<Conversation[]> => {
    const qs = userId ? `?user_id=${userId}` : ''
    return request<Conversation[]>(`/conversations${qs}`)
  },
  get: (id: string): Promise<Conversation> =>
    request<Conversation>(`/conversations/${id}`),
  delete: (id: string): Promise<void> =>
    request<void>(`/conversations/${id}`, { method: 'DELETE' }),
}

// ─── Analytics API ────────────────────────────────────────────────────────────

export const analyticsApi = {
  summary: (userId?: string): Promise<AnalyticsSummary> => {
    const qs = userId ? `?user_id=${userId}` : ''
    return request<AnalyticsSummary>(`/analytics/summary${qs}`)
  },
  monthly: (year: number, userId?: string): Promise<MonthlyData[]> => {
    const params = new URLSearchParams({ year: String(year) })
    if (userId) params.set('user_id', userId)
    return request<MonthlyData[]>(`/analytics/monthly?${params.toString()}`)
  },
}
