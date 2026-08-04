import { ApiError } from './client'
import type { ProblemDetails, Service } from './types'
import type {
  Appointment,
  DashboardSummary,
  LoginResponse,
  OpeningHour,
  StaffAdmin,
  UpdateAppointment,
} from './adminTypes'

const BASE = import.meta.env.VITE_API_URL

const TOKEN_KEY = 'bookline.token'

/**
 * The token lives in localStorage. Trade-off: any script on the page can read it,
 * so an XSS bug leaks it. The alternative - an httpOnly cookie - can't be read by
 * JavaScript but requires CSRF protection and cookie handling on a cross-origin API.
 * localStorage is the common SPA choice; noted here so it's a decision, not an accident.
 */
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class UnauthorizedError extends ApiError {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = tokenStore.get()

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  if (response.status === 401) {
    tokenStore.clear()
    throw new UnauthorizedError(401, { title: 'Your session has expired' })
  }

  if (!response.ok) {
    let problem: ProblemDetails = {}
    try {
      problem = await response.json()
    } catch {
      // not every error body is problem+json
    }
    throw new ApiError(response.status, problem)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<LoginResponse>('/api/auth/me'),

  appointments: (fromUtc: string, toUtc: string) =>
    request<Appointment[]>(
      `/api/appointments?from=${encodeURIComponent(fromUtc)}&to=${encodeURIComponent(toUtc)}`,
    ),

  updateAppointment: (id: number, patch: UpdateAppointment) =>
    request<Appointment>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  cancelAppointment: (id: number) =>
    request<void>(`/api/appointments/${id}`, { method: 'DELETE' }),

  dashboard: (fromUtc: string, toUtc: string) =>
    request<DashboardSummary>(
      `/api/dashboard/summary?from=${encodeURIComponent(fromUtc)}&to=${encodeURIComponent(toUtc)}`,
    ),

  services: () => request<Service[]>('/api/services'),

  saveService: (id: number | null, body: Omit<Service, 'id'> & { bufferMinutes: number }) =>
    id === null
      ? request<Service>('/api/services', { method: 'POST', body: JSON.stringify(body) })
      : request<Service>(`/api/services/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deleteService: (id: number) => request<void>(`/api/services/${id}`, { method: 'DELETE' }),

  staff: () => request<StaffAdmin[]>('/api/staff'),

  saveStaff: (id: number | null, body: Omit<StaffAdmin, 'id'>) =>
    id === null
      ? request<StaffAdmin>('/api/staff', { method: 'POST', body: JSON.stringify(body) })
      : request<StaffAdmin>(`/api/staff/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  deactivateStaff: (id: number) => request<void>(`/api/staff/${id}`, { method: 'DELETE' }),

  openingHours: () => request<OpeningHour[]>('/api/opening-hours'),

  saveOpeningHours: (rows: { dayOfWeek: number; openTime: string; closeTime: string }[]) =>
    request<OpeningHour[]>('/api/opening-hours', {
      method: 'PUT',
      body: JSON.stringify(rows),
    }),
}
