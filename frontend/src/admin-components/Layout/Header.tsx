import React, { useState } from 'react'
import { LogOut, Bell, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

interface HeaderProps {
  title: string
}

function Header({ title }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  const getUserInitials = () => {
    if (!user) return '?'
    return `${user.firstName[0]}${user.lastName[0]}`
  }

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'owner':
        return 'Propriétaire'
      case 'admin':
        return 'Admin'
      case 'staff':
        return 'Équipe'
      default:
        return 'Utilisateur'
    }
  }

  return (
    <header className="admin-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>

      <div className="header-actions">
        <button className="btn btn-secondary">
          <Bell size={16} />
        </button>

        <div className="user-menu" onClick={() => setShowUserMenu(!showUserMenu)}>
          <div className="user-avatar">
            {getUserInitials()}
          </div>
          <div className="user-info">
            <div className="user-name">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="user-role" style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
              {getRoleBadge()}
            </div>
          </div>
          <ChevronDown size={16} />

          {showUserMenu && (
            <div className="user-dropdown" style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: 'white',
              border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow-lg)',
              minWidth: '200px',
              zIndex: 50
            }}>
              <div className="dropdown-item" style={{ 
                padding: '12px 16px',
                borderBottom: '1px solid var(--color-gray-200)'
              }}>
                <div style={{ fontWeight: 500 }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
                  {user?.email}
                </div>
              </div>
              
              <button 
                className="dropdown-item" 
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--color-error)'
                }}
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
