import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const isAdmin      = profile?.role === 'admin'
  const isMister     = profile?.role === 'mister'
  const isSegreteria = profile?.role === 'segreteria'
  const isPaid       = profile?.role === 'player_paid'
  const isVolunteer  = profile?.role === 'player_volunteer'
  const isPlayer     = isPaid || isVolunteer
  const isParent     = profile?.role === 'parent'

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signIn, signOut,
      isAdmin, isMister, isSegreteria,
      isPaid, isVolunteer, isPlayer, isParent
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
