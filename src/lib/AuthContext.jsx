import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

const DEV_EMAIL   = import.meta.env.VITE_ADMIN_EMAIL ?? 'dev@btrt.local'
const DEV_USER    = { id: 'dev-user', email: DEV_EMAIL }
const DEV_PROFILE = { id: 'dev-user', name: 'Dev Admin', email: DEV_EMAIL, status: 'active', last_payment: new Date().toISOString() }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    if (import.meta.env.DEV && sessionStorage.getItem('dev_login')) {
      setUser(DEV_USER)
      setProfile(DEV_PROFILE)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  function devLogin() {
    sessionStorage.setItem('dev_login', '1')
    setUser(DEV_USER)
    setProfile(DEV_PROFILE)
  }

  async function signOut() {
    sessionStorage.removeItem('dev_login')
    setUser(null)
    setProfile(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, signInWithGoogle, signOut, devLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
