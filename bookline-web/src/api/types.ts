export type Service = {
  id: number
  name: string
  durationMinutes: number
  pricePence: number
  colour: string
}

export type Staff = {
  id: number
  name: string
  colour: string
  avatarUrl: string | null
}

export type AvailableSlot = {
  startsAtUtc: string
  staffId: number
}

export type DayAvailability = {
  date: string
  slots: AvailableSlot[]
}

export type CreateBookingRequest = {
  serviceId: number
  staffId: number
  startsAtUtc: string
  customerName: string
  customerEmail: string
  customerPhone: string
  notes?: string
}

export type BookingConfirmation = {
  appointmentId: number
  serviceName: string
  staffName: string
  startsAtUtc: string
  endsAtUtc: string
  pricePence: number
  customerName: string
  customerEmail: string
}

export type ProblemDetails = {
  type?: string
  title?: string
  status?: number
  detail?: string
  errors?: Record<string, string[]>
}
