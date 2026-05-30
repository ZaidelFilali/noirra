import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductRegister from './pages/ProductRegister'
import ProductDetail from './pages/ProductDetail'
import Configurator from './pages/Configurator'
import Chat from './pages/Chat'
import Complaints from './pages/Complaints'
import Orders from './pages/Orders'
import Community from './pages/Community'
import StoreFinder from './pages/StoreFinder'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 text-[#c9a961] animate-pulse" style={{ fontFamily: '"Playfair Display", serif' }}>✦</div>
          <p className="text-white/30 text-xs tracking-widest uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>Laden...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/register" element={<ProductRegister />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/configurator" element={<Configurator />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/complaints" element={<Complaints />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/community" element={<Community />} />
        <Route path="/storefinder" element={<StoreFinder />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
