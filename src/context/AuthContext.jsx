import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [club, setClub] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(prof)

    // Carica il club associato (tranne superadmin che non ha club reale)
    if (prof?.club_id && prof.role !== 'superadmin') {
      const { data: clubData } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', prof.club_id)
        .single()
      setClub(clubData)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).then(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setClub(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn  = (email, password) => supabase.auth.signInWithPassword({ email, password })
  const signOut = () => supabase.auth.signOut()

  // Ruoli
  const isAdmin      = profile?.role === 'admin'
  const isMister     = profile?.role === 'mister'
  const isSegreteria = profile?.role === 'segreteria'
  const isPaid       = profile?.role === 'player_paid'
  const isVolunteer  = profile?.role === 'player_volunteer'
  const isPlayer     = isPaid || isVolunteer
  const isParent     = profile?.role === 'parent'
  const isSuperAdmin = profile?.role === 'superadmin'

  // Stato licenza
  const licenseActive  = club?.stato === 'active' || club?.stato === 'trial'
  const licenseExpired = club?.stato === 'expired' || club?.stato === 'suspended'

  // Moduli abilitati in base al piano
  const canUsePS       = licenseActive && (club?.piano === 'starter' || club?.piano === 'pro' || club?.piano === 'full')
  const canUseSC       = licenseActive && (club?.piano === 'pro' || club?.piano === 'full')
  const canUseParents  = licenseActive && club?.piano === 'full'

  return (
    <AuthContext.Provider value={{
      user, profile, club, loading,
      signIn, signOut,
      isAdmin, isMister, isSegreteria,
      isPaid, isVolunteer, isPlayer,
      isParent, isSuperAdmin,
      licenseActive, licenseExpired,
      canUsePS, canUseSC, canUseParents,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
