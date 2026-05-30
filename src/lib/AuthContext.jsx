import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

const DEV_EMAIL   = (import.meta.env.VITE_ADMIN_EMAIL ?? 'dev@btrt.local').split(',')[0].trim()
const DEV_USER    = { id: 'dev-user', email: DEV_EMAIL }
const DEV_PROFILE = { id: 'dev-user', name: 'Dev Admin', email: DEV_EMAIL, role: 'admin', status: 'active', password_set: true, last_payment: new Date().toISOString() }
const DEV_MEMBERSHIP = { user_id: 'dev-user', status: 'active', current_period_end: null }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [membership, setMembership] = useState(null)

  useEffect(() => {
    if (import.meta.env.DEV && sessionStorage.getItem('dev_login')) {
      setUser(DEV_USER)
      setProfile(DEV_PROFILE)
      setMembership(DEV_MEMBERSHIP)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else { setProfile(null); setMembership(null) }

      // Password recovery flow: Supabase fires this when the user lands via
      // a reset-password email link. Redirect them to the form to set a new one.
      if (event === 'PASSWORD_RECOVERY') {
        if (window.location.pathname !== '/reset-password') {
          window.location.assign('/reset-password?recovery=1')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    const [{ data: prof }, { data: mship }] = await Promise.all([
      supabase.from('members').select('*').eq('id', userId).single(),
      supabase.from('memberships').select('*').eq('user_id', userId).maybeSingle(),
    ])
    setProfile(prof)
    setMembership(mship)
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
    setMembership(DEV_MEMBERSHIP)
  }

  async function signOut() {
    sessionStorage.removeItem('dev_login')
    setUser(null)
    setProfile(null)
    setMembership(null)
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, membership, signInWithGoogle, signOut, devLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
