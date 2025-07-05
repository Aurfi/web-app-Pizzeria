import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/dom'
import { App } from '../../src/app'
import { AuthService } from '../../src/services/auth'

// Mock services
vi.mock('../../src/services/auth')
vi.mock('../../src/services/branding', () => ({
  brandingService: {
    restaurantName: 'Test Restaurant',
    restaurantTagline: 'Delicious Test Food',
  },
}))

// Mock Router
vi.mock('../../src/utils/router', () => ({
  Router: vi.fn().mockImplementation(() => ({
    addRoute: vi.fn(),
    navigate: vi.fn(),
    setNotFoundHandler: vi.fn(),
  })),
}))

// Mock components
vi.mock('../../src/components/header', () => ({
  Header: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue(document.createElement('header')),
  })),
}))

vi.mock('../../src/components/BottomNav', () => ({
  BottomNav: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue(document.createElement('nav')),
    onNavigate: vi.fn(),
  })),
}))

// Mock pages
vi.mock('../../src/pages/HomePage', () => ({
  HomePage: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue(document.createElement('div')),
  })),
}))

vi.mock('../../src/pages/MenuPage', () => ({
  MenuPage: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue(document.createElement('div')),
  })),
}))

vi.mock('../../src/pages/CartPage', () => ({
  CartPage: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue(document.createElement('div')),
  })),
}))

vi.mock('../../src/pages/OrdersPage', () => ({
  OrdersPage: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue(Promise.resolve(document.createElement('div'))),
  })),
}))

vi.mock('../../src/pages/ProfilePage', () => ({
  ProfilePage: vi.fn().mockImplementation(() => ({
    render: vi.fn().mockReturnValue(Promise.resolve(document.createElement('div'))),
  })),
}))

const mockAuthService = vi.mocked(AuthService)

describe('App Component', () => {
  let app: App
  let container: HTMLElement

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '<div id="app"></div>'
    container = document.getElementById('app')!

    // Reset mocks
    vi.clearAllMocks()
    mockAuthService.isAuthenticated.mockReturnValue(false)

    app = new App()
  })

  describe('Initialization', () => {
    it('should initialize app structure', async () => {
      await app.initialize()

      expect(container.children.length).toBeGreaterThan(0)
      expect(container.querySelector('header')).toBeTruthy()
      expect(container.querySelector('nav')).toBeTruthy()
      expect(container.querySelector('.app-main')).toBeTruthy()
    })

    it('should setup routes', async () => {
      await app.initialize()

      // Verify that routes are set up by checking router calls
      expect(app['router'].addRoute).toHaveBeenCalledWith('/', expect.any(Function))
      expect(app['router'].addRoute).toHaveBeenCalledWith('/menu', expect.any(Function))
      expect(app['router'].addRoute).toHaveBeenCalledWith('/cart', expect.any(Function))
      expect(app['router'].addRoute).toHaveBeenCalledWith('/orders', expect.any(Function))
      expect(app['router'].addRoute).toHaveBeenCalledWith('/profile', expect.any(Function))
      expect(app['router'].addRoute).toHaveBeenCalledWith('/login', expect.any(Function))
    })
  })

  describe('Navigation', () => {
    it('should navigate to login when accessing protected route while unauthenticated', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(false)
      const mockNavigate = vi.fn()
      app['router'].navigate = mockNavigate

      await app.initialize()

      // Simulate navigation to orders page
      const ordersRoute = app['router'].addRoute.mock.calls.find(
        (call) => call[0] === '/orders'
      )?.[1]
      
      if (ordersRoute) {
        await ordersRoute()
        expect(mockNavigate).toHaveBeenCalledWith('/login')
      }
    })

    it('should allow access to protected routes when authenticated', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true)
      const mockNavigate = vi.fn()
      app['router'].navigate = mockNavigate

      await app.initialize()

      // Simulate navigation to orders page
      const ordersRoute = app['router'].addRoute.mock.calls.find(
        (call) => call[0] === '/orders'
      )?.[1]
      
      if (ordersRoute) {
        await ordersRoute()
        expect(mockNavigate).not.toHaveBeenCalledWith('/login')
      }
    })
  })

  describe('Login Page', () => {
    it('should render login form', async () => {
      await app.initialize()

      // Simulate navigation to login
      const loginRoute = app['router'].addRoute.mock.calls.find(
        (call) => call[0] === '/login'
      )?.[1]
      
      if (loginRoute) {
        loginRoute()

        expect(container.querySelector('.login-page')).toBeTruthy()
        expect(container.querySelector('#login-form')).toBeTruthy()
        expect(container.querySelector('#login-email')).toBeTruthy()
        expect(container.querySelector('#login-password')).toBeTruthy()
        expect(container.querySelector('#login-submit')).toBeTruthy()
      }
    })

    it('should show error for empty fields', async () => {
      await app.initialize()

      // Navigate to login
      const loginRoute = app['router'].addRoute.mock.calls.find(
        (call) => call[0] === '/login'
      )?.[1]
      
      if (loginRoute) {
        loginRoute()

        const form = container.querySelector('#login-form') as HTMLFormElement
        const submitButton = container.querySelector('#login-submit') as HTMLButtonElement

        // Submit form with empty fields
        fireEvent.submit(form)

        await waitFor(() => {
          const errorDiv = container.querySelector('#login-error') as HTMLElement
          expect(errorDiv.textContent).toBe('Please fill in all fields')
          expect(errorDiv.style.display).toBe('block')
        })
      }
    })

    it('should call AuthService.login with form data', async () => {
      mockAuthService.login.mockResolvedValue({
        user: { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        accessToken: 'token',
        refreshToken: 'refresh-token',
      })

      await app.initialize()

      // Navigate to login
      const loginRoute = app['router'].addRoute.mock.calls.find(
        (call) => call[0] === '/login'
      )?.[1]
      
      if (loginRoute) {
        loginRoute()

        const form = container.querySelector('#login-form') as HTMLFormElement
        const emailInput = container.querySelector('#login-email') as HTMLInputElement
        const passwordInput = container.querySelector('#login-password') as HTMLInputElement

        // Fill form
        fireEvent.input(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.input(passwordInput, { target: { value: 'password123' } })

        // Submit form
        fireEvent.submit(form)

        await waitFor(() => {
          expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123')
        })
      }
    })

    it('should show error message on login failure', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'))

      await app.initialize()

      // Navigate to login
      const loginRoute = app['router'].addRoute.mock.calls.find(
        (call) => call[0] === '/login'
      )?.[1]
      
      if (loginRoute) {
        loginRoute()

        const form = container.querySelector('#login-form') as HTMLFormElement
        const emailInput = container.querySelector('#login-email') as HTMLInputElement
        const passwordInput = container.querySelector('#login-password') as HTMLInputElement

        // Fill form
        fireEvent.input(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.input(passwordInput, { target: { value: 'wrong-password' } })

        // Submit form
        fireEvent.submit(form)

        await waitFor(() => {
          const errorDiv = container.querySelector('#login-error') as HTMLElement
          expect(errorDiv.textContent).toBe('Invalid credentials')
          expect(errorDiv.style.display).toBe('block')
        })
      }
    })

    it('should navigate to menu on successful login', async () => {
      mockAuthService.login.mockResolvedValue({
        user: { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User' },
        accessToken: 'token',
        refreshToken: 'refresh-token',
      })

      const mockNavigate = vi.fn()
      app['router'].navigate = mockNavigate

      await app.initialize()

      // Navigate to login
      const loginRoute = app['router'].addRoute.mock.calls.find(
        (call) => call[0] === '/login'
      )?.[1]
      
      if (loginRoute) {
        loginRoute()

        const form = container.querySelector('#login-form') as HTMLFormElement
        const emailInput = container.querySelector('#login-email') as HTMLInputElement
        const passwordInput = container.querySelector('#login-password') as HTMLInputElement

        // Fill form
        fireEvent.input(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.input(passwordInput, { target: { value: 'password123' } })

        // Submit form
        fireEvent.submit(form)

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith('/menu')
        })
      }
    })
  })

  describe('404 Page', () => {
    it('should render 404 page for unknown routes', async () => {
      await app.initialize()

      // Simulate 404 handler
      const notFoundHandler = app['router'].setNotFoundHandler.mock.calls[0][0]
      notFoundHandler()

      expect(container.querySelector('.error-page')).toBeTruthy()
      expect(container.textContent).toContain('404')
      expect(container.textContent).toContain('Page not found')
    })
  })

  describe('Event Listeners', () => {
    it('should handle popstate events', async () => {
      const mockNavigate = vi.fn()
      app['router'].navigate = mockNavigate

      await app.initialize()

      // Simulate browser back/forward
      window.history.pushState({}, '', '/test-path')
      fireEvent(window, new PopStateEvent('popstate'))

      expect(mockNavigate).toHaveBeenCalledWith('/test-path')
    })

    it('should handle bottom navigation', async () => {
      const mockNavigate = vi.fn()
      app['router'].navigate = mockNavigate

      await app.initialize()

      // Get the onNavigate callback
      const onNavigateCallback = app['bottomNav'].onNavigate.mock.calls[0][0]
      
      // Simulate bottom nav navigation
      onNavigateCallback('/menu')

      expect(mockNavigate).toHaveBeenCalledWith('/menu')
    })
  })
})