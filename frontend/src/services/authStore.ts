import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: 'customer' | 'staff' | 'admin' | 'owner'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setLoading: (loading: boolean) => void
  clearError: () => void
  checkAuth: () => Promise<void>
}

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3003'

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await axios.post(`${API_BASE}/api/auth/login`, {
            email,
            password
          })

          const { user, accessToken, refreshToken } = response.data

          // Check if user has admin privileges
          if (!['admin', 'owner', 'staff'].includes(user.role)) {
            throw new Error('Insufficient privileges. Admin access required.')
          }

          // Set up axios default authorization header
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          })
        } catch (error: any) {
          set({
            error: error.response?.data?.error || error.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false
          })
          throw error
        }
      },

      logout: () => {
        // Clear axios authorization header
        delete axios.defaults.headers.common['Authorization']
        
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      clearError: () => {
        set({ error: null })
      },

      checkAuth: async () => {
        const state = get()
        
        if (!state.accessToken) {
          set({ isLoading: false, isAuthenticated: false })
          return
        }

        try {
          // Set up axios header
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`
          
          // Test the token with a simple admin endpoint
          await axios.get(`${API_BASE}/api/admin/dashboard`)
          
          set({ isAuthenticated: true, isLoading: false })
        } catch (error: any) {
          console.error('Auth check failed:', error)
          
          // If token is invalid, try to refresh
          if (state.refreshToken) {
            try {
              const response = await axios.post(`${API_BASE}/api/auth/refresh`, {
                refreshToken: state.refreshToken
              })

              const { accessToken, refreshToken } = response.data
              axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`

              set({
                accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false
              })
            } catch {
              // Refresh failed, logout
              get().logout()
              set({ isLoading: false })
            }
          } else {
            // No refresh token, logout
            get().logout()
            set({ isLoading: false })
          }
        }
      }
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Initialize auth check on store creation
setTimeout(() => {
  useAuthStore.getState().checkAuth()
}, 100)