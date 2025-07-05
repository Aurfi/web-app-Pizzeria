import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Pizza, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

interface LoginForm {
  email: string
  password: string
}

function LoginPage() {
  const { login, error, isLoading, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>()

  // Clear errors when component mounts
  useEffect(() => {
    clearError()
  }, [clearError])

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password)
    } catch {
      // Error is handled in the store
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--color-gray-50)' 
    }}>
      <div style={{ maxWidth: '28rem', width: '100%', padding: '2rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            margin: '0 auto', 
            height: '3rem', 
            width: '3rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            borderRadius: '50%', 
            backgroundColor: 'var(--color-primary-light)' 
          }}>
            <Pizza style={{ height: '2rem', width: '2rem', color: 'var(--color-primary)' }} />
          </div>
          <h2 style={{ marginTop: '1.5rem', fontSize: '1.875rem', fontWeight: '800', color: 'var(--color-gray-900)' }}>
            Admin Dashboard
          </h2>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-gray-600)' }}>
            Sign in to access Mario&apos;s Pizzeria admin panel
          </p>
        </div>

        <div style={{ 
          backgroundColor: 'white', 
          padding: '2rem 1.5rem', 
          boxShadow: 'var(--shadow)', 
          borderRadius: 'var(--border-radius)' 
        }}>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && (
              <div style={{ 
                backgroundColor: '#fef2f2', 
                border: '1px solid #fecaca', 
                color: '#dc2626', 
                padding: '0.75rem 1rem', 
                borderRadius: 'var(--border-radius)' 
              }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                autoComplete="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="admin@mariospizzeria.com"
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', { 
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`form-input pr-10 ${errors.password ? 'error' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full btn btn-primary btn-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-2" />
                    Signing in...
                  </div>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600">
              Demo credentials:
            </div>
            <div className="text-sm font-mono bg-gray-50 p-2 rounded mt-2">
              <div>Email: admin@mariospizzeria.com</div>
              <div>Password: admin123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage