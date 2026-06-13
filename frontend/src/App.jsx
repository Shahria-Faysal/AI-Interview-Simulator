import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Layouts
import AppLayout from './layouts/AppLayout'

// Pages
import LandingPage      from './pages/LandingPage'
import LoginPage        from './pages/LoginPage'
import RegisterPage     from './pages/RegisterPage'
import DashboardPage    from './pages/DashboardPage'
import ResumeUploadPage from './pages/ResumeUploadPage'
import CreateInterviewPage from './pages/CreateInterviewPage'
import InterviewPage    from './pages/InterviewPage'
import HistoryPage      from './pages/HistoryPage'

/** Redirects unauthenticated users to /login */
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

/** Redirects already-authenticated users away from auth pages */
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

    {/* Protected – wrapped in the sidebar/header layout */}
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard"        element={<DashboardPage />} />
      <Route path="/resume"           element={<ResumeUploadPage />} />
      <Route path="/interview/new"    element={<CreateInterviewPage />} />
      <Route path="/interview/:id"    element={<InterviewPage />} />
      <Route path="/history"          element={<HistoryPage />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
