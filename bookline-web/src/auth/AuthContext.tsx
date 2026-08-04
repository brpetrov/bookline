import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { adminApi, tokenStore } from '../api/admin'

type Session = {
  email: string
  displayName: string
  roles: string[]
}

type AuthValue = {
  session: Session | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

const SESSION_KEY = 'bookline.session'

const readStoredSession = (): Session | null => {
  if (!tokenStore.get()) {
    return null
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession)

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await adminApi.login(email, password)
    tokenStore.set(result.token)

    const next: Session = {
      email: result.email,
      displayName: result.displayName,
      roles: result.roles,
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    setSession(next)
  }, [])

  const signOut = useCallback(() => {
    tokenStore.clear()
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }, [])

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}
