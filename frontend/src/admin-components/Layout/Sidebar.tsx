import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  BarChart3, 
  ChefHat, 
  ClipboardList, 
  Package, 
  Settings,
  Pizza
} from 'lucide-react'

const navItems = [
  {
    path: '/admin/dashboard',
    label: 'Tableau de bord',
    icon: BarChart3
  },
  {
    path: '/admin/menu',
    label: 'Menu',
    icon: ChefHat
  },
  {
    path: '/admin/orders',
    label: 'Commandes',
    icon: ClipboardList
  },
  {
    path: '/admin/settings',
    label: 'Paramètres',
    icon: Settings
  }
]

function Sidebar() {
  const location = useLocation()

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <Link to="/admin/dashboard" className="sidebar-logo">
          <Pizza size={24} />
          <span>Panneau Admin</span>
        </Link>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
