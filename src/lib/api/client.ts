/**
 * Tatami API client — calls the Go backend at NEXT_PUBLIC_BACKEND_URL.
 *
 * Auth: uses the Firebase ID token (the same JWT the frontend already has).
 * The Go backend verifies it via Firebase Admin SDK, so no extra login needed.
 *
 * Usage:
 *   import { api } from '@/lib/api/client'
 *   const stages = await api.get(`/v1/academies/${academyId}/billing/stages`)
 */

import { getAuth } from 'firebase/auth'

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8080'

async function getToken(): Promise<string | null> {
  const auth = getAuth()
  const user = auth.currentUser
  if (!user) return null
  return user.getIdToken()
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const problem = await res.json().catch(() => ({ detail: res.statusText }))
    throw new ApiError(res.status, problem?.detail ?? res.statusText, problem)
  }

  // 204 No Content — return empty object
  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(`[${status}] ${message}`)
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown, extraHeaders?: Record<string, string>) => request<T>('POST', path, body, extraHeaders),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),
}

// ---------------------------------------------------------------------------
// Typed helpers para os novos endpoints do backend Go
// ---------------------------------------------------------------------------

export interface BillingStageEntry {
  id: string
  academy_id: string
  student_id: string
  amount: string
  due_date: string
  status: string
  reference_month: string
  description: string
  student_name: string
  student_phone: string
  student_email: string
  student_photo: string
  days_overdue: number
  stage: 'D0' | 'D1' | 'D3' | 'D7' | 'D15' | 'D30+'
  last_contact_at: string | null
  contact_count: number
}

export interface BillingStagesResult {
  stages: Record<string, BillingStageEntry[]>
  totals: Record<string, string>
}

export interface RevenueProjection {
  month: string
  projected: string
  trend: 'up' | 'down' | 'stable'
}

export interface TimelineEvent {
  id: string
  academy_id: string
  student_id: string
  type: string
  occurred_at: string
  payload: Record<string, unknown>
  source_id: string | null
  source_context: string | null
  created_at: string
}

// Billing stages (tela /cobranca)
export const billingApi = {
  getStages: (academyId: string) =>
    api.get<BillingStagesResult>(`/v1/academies/${academyId}/billing/stages`),

  sendBulk: (
    academyId: string,
    recipients: Array<{
      financial_id: string
      channel: 'whatsapp' | 'email'
      phone?: string
      email?: string
      message: string
      subject?: string
    }>,
  ) =>
    api.post<{ results: Array<{ financial_id: string; channel: string; ok: boolean; error?: string }> }>(
      `/v1/academies/${academyId}/billing/messages/bulk`,
      { recipients },
    ),
}

// Revenue reports (/relatorios)
export const reportsApi = {
  getProjection: (academyId: string, months = 3) =>
    api.get<{ projections: RevenueProjection[] }>(
      `/v1/academies/${academyId}/reports/revenue/projection?months=${months}`,
    ),

  exportCsvUrl: (academyId: string, months = 12) =>
    `${BASE_URL}/v1/academies/${academyId}/reports/revenue/export.csv?months=${months}`,
}

// Timeline (/portal/linha-do-tempo)
export const timelineApi = {
  getStudentTimeline: (academyId: string, studentId: string) =>
    api.get<{ items: TimelineEvent[]; has_more: boolean }>(
      `/v1/academies/${academyId}/students/${studentId}/timeline`,
    ),

  getMyTimeline: (academyId: string) =>
    api.get<{ items: TimelineEvent[]; has_more: boolean }>(
      `/v1/me/student/timeline?academy_id=${academyId}`,
    ),
}

// TOTP / 2FA
export const totpApi = {
  setup: () => api.post<{ otpauth_uri: string }>('/v1/me/totp/setup'),

  verifySetup: (code: string) =>
    api.post<{ backup_codes: string[] }>('/v1/me/totp/verify-setup', { code }),

  validate: (code: string) =>
    api.post<{ valid: boolean }>('/v1/me/totp/validate', { code }),

  disable: (code: string) => api.delete('/v1/me/totp', { code }),
}

// Academy primary switch (/portal/academias)
export const academyApi = {
  setPrimary: (academyId: string) =>
    api.patch('/v1/me/academy-mapping/primary', { academy_id: academyId }),
}
