import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Players from './pages/Players'
import Attendances from './pages/Attendances'
import Calendar from './pages/Calendar'
import Callups from './pages/Callups'
import Materials from './pages/Materials'
import Documents from './pages/Documents'
import Payslips from './pages/Payslips'
import Sanctions from './pages/Sanctions'
import Mister from './pages/Mister'
import MatchReport from './pages/MatchReport'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import ChatPS from './pages/ChatPS'
// Scuola Calcio
import YouthPlayers from './pages/sc/YouthPlayers'
import SCPayments from './pages/sc/SCPayments'
import SCWarehouse from './pages/sc/SCWarehouse'
import SCBacheca from './pages/sc/SCBacheca'
import SCChat from './pages/sc/SCChat'
// Area Genitori
import ParentLayout from './pages/parent/ParentLayout'
import ParentDashboard from './pages/parent/ParentDashboard'
import ParentChild from './pages/parent/ParentChild'
import ParentPayments from './pages/parent/ParentPayments'
import ParentDocuments from './pages/parent/ParentDocuments'
import ParentBacheca from './pages/parent/ParentBacheca'
import ParentKit from './pages/parent/ParentKit'
// Super Admin
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout'
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import SuperAdminClubs from './pages/superadmin/SuperAdminClubs'
import SuperAdminLicenses from './pages/superadmin/SuperAdminLicenses'

// ── Schermata licenza scaduta ──────────────────────────────────
function LicenseExpired() {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen bg-[#f3f3f4] flex items-center justify-center p-4">
      <div className="bg-white border border-[#e7eaec] rounded shadow-card p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-xl font-bold text-[#2f4050] mb-2">Licenza scaduta</h1>
        <p className="text-[#999] text-sm mb-6">
          La licenza di questa squadra è scaduta o sospesa.<br/>
          Contatta il supporto per rinnovarla.
        </p>
        <a href="mailto:info@soccerclub.it"
          className="inline-block bg-[#1ab394] hover:bg-[#18a689] text-white px-6 py-2 rounded text-sm font-semibold mb-3">
          Contatta il supporto
        </a>
        <br/>
        <button onClick={signOut} className="text-xs text-[#999] hover:text-[#676a6c] mt-2">
          Disconnetti
        </button>
      </div>
    </div>
  )
}

// ── Route privata con controllo ruolo e licenza ────────────────
function PrivateRoute({ children, roles }) {
  const { user, profile, club, loading, licenseExpired, isSuperAdmin } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f3f3f4]">
      <div className="w-8 h-8 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Superadmin → solo area superadmin
  if (isSuperAdmin && !roles?.includes('superadmin')) {
    return <Navigate to="/superadmin" replace />
  }

  // Genitore → solo area genitori
  if (profile?.role === 'parent' && !roles?.includes('parent')) {
    return <Navigate to="/genitore" replace />
  }

  // Licenza scaduta → blocca (tranne superadmin)
  if (!isSuperAdmin && licenseExpired) {
    return <LicenseExpired />
  }

  if (roles && !roles.includes(profile?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

function AppRoutes() {
  const { loading } = useAuth()

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f3f3f4]">
      <div className="w-8 h-8 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* ── Super Admin ── */}
      <Route path="/superadmin" element={
        <PrivateRoute roles={['superadmin']}>
          <SuperAdminLayout />
        </PrivateRoute>
      }>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="clubs" element={<SuperAdminClubs />} />
        <Route path="licenses" element={<SuperAdminLicenses />} />
      </Route>

      {/* ── Area Genitori ── */}
      <Route path="/genitore" element={
        <PrivateRoute roles={['parent']}>
          <ParentLayout />
        </PrivateRoute>
      }>
        <Route index element={<ParentDashboard />} />
        <Route path="figlio"    element={<ParentChild />} />
        <Route path="pagamenti" element={<ParentPayments />} />
        <Route path="documenti" element={<ParentDocuments />} />
        <Route path="bacheca"   element={<ParentBacheca />} />
        <Route path="kit"       element={<ParentKit />} />
      </Route>

      {/* ── App principale ── */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="calciatori"   element={<PrivateRoute roles={['admin']}><Players /></PrivateRoute>} />
        <Route path="presenze"     element={<Attendances />} />
        <Route path="calendario"   element={<Calendar />} />
        <Route path="convocazioni" element={<Callups />} />
        <Route path="materiale"    element={<Materials />} />
        <Route path="documenti"    element={<Documents />} />
        <Route path="cedolini"     element={<PrivateRoute roles={['admin','mister','player_paid']}><Payslips /></PrivateRoute>} />
        <Route path="sanzioni"     element={<PrivateRoute roles={['admin']}><Sanctions /></PrivateRoute>} />
        <Route path="mister"       element={<PrivateRoute roles={['admin']}><Mister /></PrivateRoute>} />
        <Route path="distinta"     element={<PrivateRoute roles={['admin']}><MatchReport /></PrivateRoute>} />
        <Route path="chat"         element={<ChatPS />} />
        <Route path="sc/atleti"    element={<PrivateRoute roles={['admin','segreteria']}><YouthPlayers /></PrivateRoute>} />
        <Route path="sc/pagamenti" element={<PrivateRoute roles={['admin','segreteria']}><SCPayments /></PrivateRoute>} />
        <Route path="sc/magazzino" element={<PrivateRoute roles={['admin','segreteria']}><SCWarehouse /></PrivateRoute>} />
        <Route path="sc/bacheca"   element={<PrivateRoute roles={['admin','segreteria','mister']}><SCBacheca /></PrivateRoute>} />
        <Route path="sc/chat"      element={<SCChat />} />
        <Route path="impostazioni" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster toastOptions={{ style: { background: '#fff', color: '#676a6c', border: '1px solid #e7eaec' } }} />
      </AuthProvider>
    </BrowserRouter>
  )
}
