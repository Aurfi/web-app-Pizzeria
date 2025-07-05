import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../../src/services/auth'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock fetch
global.fetch = vi.fn()

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('login', () => {
    it('should login user successfully', async () => {
      const mockResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await AuthService.login('test@example.com', 'password123')

      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'mock-access-token')
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'mock-refresh-token')
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.user))
      expect(result).toEqual(mockResponse)
    })

    it('should throw error for invalid credentials', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' }),
      })

      await expect(AuthService.login('test@example.com', 'wrong-password')).rejects.toThrow(
        'Invalid credentials'
      )
    })

    it('should throw error for network failure', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(AuthService.login('test@example.com', 'password123')).rejects.toThrow(
        'Network error'
      )
    })
  })

  describe('register', () => {
    it('should register user successfully', async () => {
      const mockResponse = {
        user: {
          id: 1,
          email: 'newuser@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'Jane Smith',
        phone: '+1234567890',
      }

      const result = await AuthService.register(userData)

      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      expect(result).toEqual(mockResponse)
    })

    it('should throw error for existing email', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'Email already exists' }),
      })

      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Jane Smith',
        phone: '+1234567890',
      }

      await expect(AuthService.register(userData)).rejects.toThrow('Email already exists')
    })
  })

  describe('logout', () => {
    it('should logout user successfully', async () => {
      localStorage.setItem('accessToken', 'mock-token')
      localStorage.setItem('refreshToken', 'mock-refresh-token')
      localStorage.setItem('user', JSON.stringify({ id: 1 }))

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Logged out successfully' }),
      })

      await AuthService.logout()

      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
      })

      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken')
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    })

    it('should logout even if API call fails', async () => {
      localStorage.setItem('accessToken', 'mock-token')

      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await AuthService.logout()

      expect(localStorage.removeItem).toHaveBeenCalledWith('accessToken')
      expect(localStorage.removeItem).toHaveBeenCalledWith('refreshToken')
      expect(localStorage.removeItem).toHaveBeenCalledWith('user')
    })
  })

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }

      localStorage.setItem('refreshToken', 'old-refresh-token')

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await AuthService.refreshToken()

      expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'old-refresh-token',
        }),
      })

      expect(localStorage.setItem).toHaveBeenCalledWith('accessToken', 'new-access-token')
      expect(localStorage.setItem).toHaveBeenCalledWith('refreshToken', 'new-refresh-token')
      expect(result).toEqual(mockResponse)
    })

    it('should throw error if no refresh token available', async () => {
      localStorage.getItem = vi.fn().mockReturnValue(null)

      await expect(AuthService.refreshToken()).rejects.toThrow('No refresh token available')
    })
  })

  describe('isAuthenticated', () => {
    it('should return true if access token exists', () => {
      localStorage.getItem = vi.fn().mockReturnValue('mock-token')

      const result = AuthService.isAuthenticated()

      expect(result).toBe(true)
      expect(localStorage.getItem).toHaveBeenCalledWith('accessToken')
    })

    it('should return false if no access token', () => {
      localStorage.getItem = vi.fn().mockReturnValue(null)

      const result = AuthService.isAuthenticated()

      expect(result).toBe(false)
    })
  })

  describe('getUser', () => {
    it('should return user data if stored', () => {
      const mockUser = { id: 1, email: 'test@example.com', firstName: 'John' }
      localStorage.getItem = vi.fn().mockReturnValue(JSON.stringify(mockUser))

      const result = AuthService.getUser()

      expect(result).toEqual(mockUser)
      expect(localStorage.getItem).toHaveBeenCalledWith('user')
    })

    it('should return null if no user data', () => {
      localStorage.getItem = vi.fn().mockReturnValue(null)

      const result = AuthService.getUser()

      expect(result).toBeNull()
    })

    it('should return null if invalid JSON', () => {
      localStorage.getItem = vi.fn().mockReturnValue('invalid-json')

      const result = AuthService.getUser()

      expect(result).toBeNull()
    })
  })

  describe('getToken', () => {
    it('should return access token if exists', () => {
      localStorage.getItem = vi.fn().mockReturnValue('mock-access-token')

      const result = AuthService.getToken()

      expect(result).toBe('mock-access-token')
      expect(localStorage.getItem).toHaveBeenCalledWith('accessToken')
    })

    it('should return null if no token', () => {
      localStorage.getItem = vi.fn().mockReturnValue(null)

      const result = AuthService.getToken()

      expect(result).toBeNull()
    })
  })
})