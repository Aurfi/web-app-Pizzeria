import React, { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

interface AdminLayoutProps {
  children: ReactNode
}

function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation()

  // Get page title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/admin/dashboard':
        return 'Tableau de bord'
      case '/admin/menu':
        return 'Gestion du menu'
      case '/admin/orders':
        return 'Gestion des commandes'
      case '/admin/settings':
        return 'Paramètres'
      default:
        return 'Tableau de bord Admin'
    }
  }

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <Header title={getPageTitle()} />
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AdminLayout
