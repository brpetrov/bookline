import { useEffect, useState } from 'react'
import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { tokenStore } from '../api/admin'

/**
 * Keeps the calendar and dashboard live. A pushed event doesn't carry the new data -
 * it just invalidates the relevant query keys and lets TanStack Query refetch. That
 * keeps one source of truth (the API) rather than trying to patch the cache by hand.
 */
export function useScheduleHub() {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL}/hubs/schedule`, {
        accessTokenFactory: () => tokenStore.get() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    }

    connection.on('AppointmentCreated', refresh)
    connection.on('AppointmentUpdated', refresh)
    connection.on('AppointmentCancelled', refresh)

    connection.onreconnected(() => {
      setConnected(true)
      refresh()
    })
    connection.onreconnecting(() => setConnected(false))
    connection.onclose(() => setConnected(false))

    connection
      .start()
      .then(() => setConnected(true))
      .catch(() => setConnected(false))

    return () => {
      if (connection.state !== HubConnectionState.Disconnected) {
        void connection.stop()
      }
    }
  }, [queryClient])

  return connected
}
