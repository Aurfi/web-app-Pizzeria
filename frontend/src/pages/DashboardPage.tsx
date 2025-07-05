import React, { useState, useEffect } from 'react'
import { 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react'
import axios from 'axios'

interface DashboardStats {
  today: {
    orders: number
    revenue: number
    averageOrderValue: number
  }
  week: {
    orders: number
    revenue: number
  }
  month: {
    orders: number
    revenue: number
  }
  pending_orders: number
  low_stock_items: number
}

interface RecentOrder {
  id: string
  status: string
  total: number
  customerName: string
  itemCount: number
  createdAt: string
}

function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/admin/dashboard')
      const data = response.data
      
      setStats(data.stats)
      setRecentOrders(data.recentOrders)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard data')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'badge-warning',
      confirmed: 'badge-info',
      preparing: 'badge-warning', 
      ready: 'badge-success',
      out_for_delivery: 'badge-info',
      delivered: 'badge-success',
      cancelled: 'badge-error'
    }
    return badges[status as keyof typeof badges] || 'badge-gray'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span style={{ marginLeft: '12px' }}>Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-content">
          <div style={{ textAlign: 'center', color: 'var(--color-error)' }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 16px' }} />
            <h3>Error Loading Dashboard</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={fetchDashboardData}>
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Today&apos;s Revenue</p>
              <p className="stat-value">{formatCurrency(stats?.today.revenue || 0)}</p>
              <p className="stat-change positive">+12% from yesterday</p>
            </div>
            <DollarSign size={24} style={{ color: 'var(--color-success)' }} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Today&apos;s Orders</p>
              <p className="stat-value">{stats?.today.orders || 0}</p>
              <p className="stat-change positive">+8% from yesterday</p>
            </div>
            <ShoppingCart size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Average Order Value</p>
              <p className="stat-value">{formatCurrency(stats?.today.averageOrderValue || 0)}</p>
              <p className="stat-change negative">-3% from yesterday</p>
            </div>
            <TrendingUp size={24} style={{ color: 'var(--color-warning)' }} />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label">Pending Orders</p>
              <p className="stat-value">{stats?.pending_orders || 0}</p>
              <p className="stat-change">Requires attention</p>
            </div>
            <Clock size={24} style={{ color: 'var(--color-warning)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Orders</h3>
          </div>
          <div className="card-content">
            {recentOrders.length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>#{order.id.slice(-6)}</td>
                        <td>{order.customerName}</td>
                        <td>{formatCurrency(order.total)}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--color-gray-500)' }}>
                No recent orders
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Stats</h3>
          </div>
          <div className="card-content">
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: 'var(--color-gray-600)', marginBottom: '4px' }}>
                This Week
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>
                {stats?.week.orders || 0} orders
              </div>
              <div style={{ fontSize: '16px', color: 'var(--color-gray-700)' }}>
                {formatCurrency(stats?.week.revenue || 0)}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: 'var(--color-gray-600)', marginBottom: '4px' }}>
                This Month
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>
                {stats?.month.orders || 0} orders
              </div>
              <div style={{ fontSize: '16px', color: 'var(--color-gray-700)' }}>
                {formatCurrency(stats?.month.revenue || 0)}
              </div>
            </div>

            {(stats?.low_stock_items || 0) > 0 && (
              <div className="bg-warning-50 p-3 rounded" style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: 'var(--border-radius)' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#92400e' }}>
                  <AlertTriangle size={16} style={{ marginRight: '8px' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    {stats.low_stock_items} items low in stock
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage