// Central route configuration for the app.
import { createBrowserRouter, Navigate } from 'react-router-dom'
import Login from '../pages/Login.jsx'
import Register from '../pages/Register.jsx'
import Topics from '../pages/Topics.jsx'
import Chat from '../pages/Chat.jsx'
import History from '../pages/History.jsx'
import Pricing from '../pages/Pricing.jsx'

// Redirects to /login if there is no JWT stored yet.
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/topics" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  {
    path: '/topics',
    element: (
      <ProtectedRoute>
        <Topics />
      </ProtectedRoute>
    ),
  },
  {
    path: '/chat/:topic',
    element: (
      <ProtectedRoute>
        <Chat />
      </ProtectedRoute>
    ),
  },
  {
    path: '/history',
    element: (
      <ProtectedRoute>
        <History />
      </ProtectedRoute>
    ),
  },
  { path: '/pricing', element: <Pricing /> },
])

export default router
