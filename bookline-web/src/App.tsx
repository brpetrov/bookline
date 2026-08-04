import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { BookingFlow } from './booking/BookingFlow'
import { AdminLayout, RequireAuth } from './admin/AdminLayout'
import { Calendar } from './admin/Calendar'
import { Dashboard } from './admin/Dashboard'
import { HoursPage } from './admin/HoursPage'
import { Login } from './admin/Login'
import { ServicesPage } from './admin/ServicesPage'
import { StaffPage } from './admin/StaffPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BookingFlow />} />
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/calendar" replace />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="hours" element={<HoursPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
