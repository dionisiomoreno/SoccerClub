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
import MatchReport from './pages/MatchReport'
import Settings from './pages/Settings'
import Mister from './pages/Mister'
import NotFound from './pages/NotFound'

function PrivateRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-brand-bg"><div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="calciatori" element={<PrivateRoute roles={['admin']}><Players /></PrivateRoute>} />
        <Route path="presenze" element={<Attendances />} />
        <Route path="calendario" element={<Calendar />} />
        <Route path="convocazioni" element={<Callups />} />
        <Route path="materiale" element={<Materials />} />
        <Route path="documenti" element={<Documents />} />
        <Route path="cedolini" element={<PrivateRoute roles={['admin','mister','player_paid']}><Payslips /></PrivateRoute>} />
        <Route path="sanzioni" element={<PrivateRoute roles={['admin']}><Sanctions /></PrivateRoute>} />
        <Route path="mister" element={<PrivateRoute roles={['admin']}><Mister /></PrivateRoute>} />
        <Route path="distinta" element={<PrivateRoute roles={['admin']}><MatchReport /></PrivateRoute>} />
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
        <Toaster toastOptions={{ style: { background: '#1E1E1E', color: '#F5F5F5', border: '1px solid #2A2A2A' } }} />
      </AuthProvider>
    </BrowserRouter>
  )
}
