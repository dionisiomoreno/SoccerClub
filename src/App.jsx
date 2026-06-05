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

function PrivateRoute({ children, roles }) {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#f3f3f4]">
      <div className="w-8 h-8 border-2 border-[#1ab394] border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* ── Area Genitori (layout separato) ── */}
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
        {/* Prima Squadra */}
        <Route index element={<Dashboard />} />
        <Route path="calciatori"  element={<PrivateRoute roles={['admin']}><Players /></PrivateRoute>} />
        <Route path="presenze"    element={<Attendances />} />
        <Route path="calendario"  element={<Calendar />} />
        <Route path="convocazioni" element={<Callups />} />
        <Route path="materiale"   element={<Materials />} />
        <Route path="documenti"   element={<Documents />} />
        <Route path="cedolini"    element={<PrivateRoute roles={['admin','mister','player_paid']}><Payslips /></PrivateRoute>} />
        <Route path="sanzioni"    element={<PrivateRoute roles={['admin']}><Sanctions /></PrivateRoute>} />
        <Route path="mister"      element={<PrivateRoute roles={['admin']}><Mister /></PrivateRoute>} />
        <Route path="distinta"    element={<PrivateRoute roles={['admin']}><MatchReport /></PrivateRoute>} />
        <Route path="chat"        element={<ChatPS />} />
        {/* Scuola Calcio */}
        <Route path="sc/atleti"    element={<PrivateRoute roles={['admin','segreteria']}><YouthPlayers /></PrivateRoute>} />
        <Route path="sc/pagamenti" element={<PrivateRoute roles={['admin','segreteria']}><SCPayments /></PrivateRoute>} />
        <Route path="sc/magazzino" element={<PrivateRoute roles={['admin','segreteria']}><SCWarehouse /></PrivateRoute>} />
        <Route path="sc/bacheca"   element={<PrivateRoute roles={['admin','segreteria','mister']}><SCBacheca /></PrivateRoute>} />
        <Route path="sc/chat"      element={<SCChat />} />
        {/* Comune */}
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
