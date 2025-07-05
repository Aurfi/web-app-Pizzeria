import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import AdminLayout from './components/Layout/AdminLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import MenuPage from './pages/MenuPage'
import OrdersPage from './pages/OrdersPage'
import SettingsPage from './pages/SettingsPage'

function AdminApp() {
  const { isAuthenticated, isLoading } = useAuthStore()

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner" />
        <span style={{ marginLeft: '12px' }}>Loading...</span>
      </div>
    )
  }

  // If not authenticated, show login page
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Main admin interface
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  )
}

export default AdminApp
