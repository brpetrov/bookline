import type {
  BookingConfirmation,
  BusinessProfile,
  CreateBookingRequest,
  DayAvailability,
  ProblemDetails,
  Service,
  Staff,
} from './types'

const BASE = import.meta.env.VITE_API_URL

export const SLUG = 'kestrel-and-co'

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails

  constructor(status: number, problem: ProblemDetails) {
    super(problem.title ?? `Request failed (${status})`)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}/api/public/${SLUG}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    let problem: ProblemDetails = {}
    try {
      problem = await response.json()
    } catch {
      // not every error body is problem+json
    }
    throw new ApiError(response.status, problem)
  }

  return response.json() as Promise<T>
}

export const api = {
  business: () => request<BusinessProfile>(''),

  services: () => request<Service[]>('/services'),

  staff: (serviceId?: number) =>
    request<Staff[]>(serviceId ? `/staff?serviceId=${serviceId}` : '/staff'),

  availability: (serviceId: number, from: string, to: string, staffId?: number) => {
    const query = new URLSearchParams({ serviceId: String(serviceId), from, to })
    if (staffId) {
      query.set('staffId', String(staffId))
    }
    return request<DayAvailability[]>(`/availability?${query}`)
  },

  book: (body: CreateBookingRequest) =>
    request<BookingConfirmation>('/bookings', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
