import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import ClassroomDetail from './pages/ClassroomDetail'
import LiveRoom from './pages/LiveRoom'
import AssignmentDetail from './pages/AssignmentDetail'
import JoinByLink from './pages/JoinByLink'
import Navigation from './components/Navigation'
import Sidebar from './components/Sidebar'
import Calendar from './pages/Calendar'
import Settings from './pages/Settings'
import EnrolledClasses from './pages/EnrolledClasses'
import MyClasses from './pages/MyClasses'
import { AccessibilityProvider } from './context/AccessibilityContext'

function App() {
  const { token, user } = useAuth()
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  return (
    <AccessibilityProvider>
    <div className="min-h-screen font-sans bg-surface-50 text-surface-900 flex">
      {token && (
        <Sidebar onToggle={(val) => setSidebarExpanded(val)} />
      )}
      
      <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-200 ${
        token ? (sidebarExpanded ? 'pl-56' : 'pl-16') : ''
      }`}>
        {token && <Navigation />}
        <main className="flex-grow">
          <Routes>
            <Route 
              path="/login" 
              element={!token ? <Login /> : <Navigate to="/dashboard" />} 
            />
            <Route 
              path="/register" 
              element={!token ? <Register /> : <Navigate to="/dashboard" />} 
            />
            <Route 
              path="/forgot-password" 
              element={!token ? <ForgotPassword /> : <Navigate to="/dashboard" />} 
            />
            <Route 
              path="/reset-password" 
              element={!token ? <ResetPassword /> : <Navigate to="/dashboard" />} 
            />
            <Route 
              path="/dashboard" 
              element={token ? <Dashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/classroom/:id" 
              element={token ? <ClassroomDetail /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/live/:classroomId/:sessionId" 
              element={token ? <LiveRoom /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/assignment/:id" 
              element={token ? <AssignmentDetail /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/join/link/:inviteLink" 
              element={<JoinByLink />} 
            />
            <Route 
              path="/calendar" 
              element={token ? <Calendar /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/settings" 
              element={token ? <Settings /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/enrolled-classes" 
              element={token ? (user?.role === 'STUDENT' ? <EnrolledClasses /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} 
            />
            <Route 
              path="/my-classes" 
              element={token ? (user?.role === 'TEACHER' ? <MyClasses /> : <Navigate to="/dashboard" />) : <Navigate to="/login" />} 
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
    </AccessibilityProvider>
  )
}

export default App
