import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { Hono } from 'hono'
import authRoutes from '../../src/routes/auth'
import { pool } from '../../src/config/database'

const app = new Hono()
app.route('/auth', authRoutes)

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  })

  afterAll(async () => {
    // Cleanup test database
    await pool.query('DROP TABLE IF EXISTS users')
    await pool.end()
  })

  beforeEach(async () => {
    // Clear users table before each test
    await pool.query('DELETE FROM users')
  })

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phone: '+1234567890'
      }

      const response = await request(app.fetch)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body.user.email).toBe(userData.email)
      expect(response.body.user.name).toBe(userData.name)
      expect(response.body.user).not.toHaveProperty('password')
    })

    it('should return 400 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        name: 'Test User'
      }

      const response = await request(app.fetch)
        .post('/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
        name: 'Test User'
      }

      const response = await request(app.fetch)
        .post('/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      // Register user first time
      await request(app.fetch)
        .post('/auth/register')
        .send(userData)
        .expect(201)

      // Try to register same email again
      const response = await request(app.fetch)
        .post('/auth/register')
        .send(userData)
        .expect(409)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await request(app.fetch)
        .post('/auth/register')
        .send(userData)
    })

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const response = await request(app.fetch)
        .post('/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body).toHaveProperty('user')
      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('refreshToken')
      expect(response.body.user.email).toBe(loginData.email)
    })

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      }

      const response = await request(app.fetch)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      const response = await request(app.fetch)
        .post('/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for missing fields', async () => {
      const loginData = {
        email: 'test@example.com'
        // missing password
      }

      const response = await request(app.fetch)
        .post('/auth/login')
        .send(loginData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /auth/refresh', () => {
    let refreshToken: string

    beforeEach(async () => {
      // Create and login a test user to get refresh token
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await request(app.fetch)
        .post('/auth/register')
        .send(userData)

      const loginResponse = await request(app.fetch)
        .post('/auth/login')
        .send({ email: userData.email, password: userData.password })

      refreshToken = loginResponse.body.refreshToken
    })

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app.fetch)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(response.body).toHaveProperty('accessToken')
      expect(response.body).toHaveProperty('refreshToken')
    })

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.fetch)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app.fetch)
        .post('/auth/refresh')
        .send({})
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('POST /auth/logout', () => {
    let accessToken: string

    beforeEach(async () => {
      // Create and login a test user to get access token
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      }

      await request(app.fetch)
        .post('/auth/register')
        .send(userData)

      const loginResponse = await request(app.fetch)
        .post('/auth/login')
        .send({ email: userData.email, password: userData.password })

      accessToken = loginResponse.body.accessToken
    })

    it('should logout successfully with valid token', async () => {
      const response = await request(app.fetch)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('message')
    })

    it('should return 401 for missing authorization header', async () => {
      const response = await request(app.fetch)
        .post('/auth/logout')
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 401 for invalid token', async () => {
      const response = await request(app.fetch)
        .post('/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })
  })
})