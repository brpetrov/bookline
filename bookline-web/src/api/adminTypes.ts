export type LoginResponse = {
  token: string
  expiresAtUtc: string
  email: string
  displayName: string
  roles: string[]
}

export type Appointment = {
  id: number
  staffId: number
  staffName: string
  staffColour: string
  serviceId: number
  serviceName: string
  serviceColour: string
  durationMinutes: number
  customerId: number
  customerName: string
  customerEmail: string
  customerPhone: string
  startsAtUtc: string
  endsAtUtc: string
  status: AppointmentStatus
  pricePence: number
  notes: string | null
  createdAtUtc: string
}

export type AppointmentStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'NoShow'

export type StaffAdmin = {
  id: number
  name: string
  email: string
  colour: string
  avatarUrl: string | null
  isActive: boolean
  serviceIds: number[]
}

export type OpeningHour = {
  id: number
  dayOfWeek: number
  openTime: string
  closeTime: string
}

export type NamedCount = { name: string; count: number; valuePence: number }

export type DayCount = { date: string; count: number; revenuePence: number }

export type DashboardSummary = {
  bookings: number
  revenuePence: number
  utilisationPercent: number
  cancellationCount: number
  topServices: NamedCount[]
  bookingsPerDay: DayCount[]
  statusMix: NamedCount[]
}

export type UpdateAppointment = {
  startsAtUtc?: string
  staffId?: number
  status?: AppointmentStatus
  notes?: string
}
