import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import { Hono } from 'hono'
import orderRoutes from '../../src/routes/order'
import authRoutes from '../../src/routes/auth'
import { pool } from '../../src/config/database'

const app = new Hono()
app.route('/orders', orderRoutes)
app.route('/auth', authRoutes)

describe('Orders API Integration Tests', () => {
  let accessToken: string
  let userId: string

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        delivery_address TEXT,
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        menu_item_id INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        quantity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  })

  afterAll(async () => {
    // Cleanup test database
    await pool.query('DROP TABLE IF EXISTS order_items')
    await pool.query('DROP TABLE IF EXISTS orders')
    await pool.query('DROP TABLE IF EXISTS users')
    await pool.end()
  })

  beforeEach(async () => {
    // Clear tables before each test
    await pool.query('DELETE FROM order_items')
    await pool.query('DELETE FROM orders')
    await pool.query('DELETE FROM users')

    // Create and login a test user
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
      phone: '+1234567890'
    }

    const registerResponse = await request(app.fetch)
      .post('/auth/register')
      .send(userData)

    accessToken = registerResponse.body.accessToken
    userId = registerResponse.body.user.id
  })

  describe('POST /orders', () => {
    it('should create a new order successfully', async () => {
      const orderData = {
        items: [
          {
            menuItemId: 1,
            name: 'Pizza Margherita',
            price: 12.99,
            quantity: 2
          },
          {
            menuItemId: 2,
            name: 'Caesar Salad',
            price: 8.99,
            quantity: 1
          }
        ],
        total: 34.97,
        deliveryAddress: '123 Main St, City, State 12345',
        paymentMethod: 'credit_card'
      }

      const response = await request(app.fetch)
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(201)

      expect(response.body).toHaveProperty('order')
      expect(response.body.order.total).toBe(34.97)
      expect(response.body.order.status).toBe('pending')
      expect(response.body.order.userId).toBe(userId)
      expect(response.body.order.items).toHaveLength(2)
    })

    it('should return 401 for unauthenticated request', async () => {
      const orderData = {
        items: [
          {
            menuItemId: 1,
            name: 'Pizza Margherita',
            price: 12.99,
            quantity: 2
          }
        ],
        total: 25.98,
        deliveryAddress: '123 Main St',
        paymentMethod: 'credit_card'
      }

      const response = await request(app.fetch)
        .post('/orders')
        .send(orderData)
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for invalid order data', async () => {
      const orderData = {
        items: [], // Empty items array
        total: 0,
        deliveryAddress: '123 Main St',
        paymentMethod: 'credit_card'
      }

      const response = await request(app.fetch)
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 400 for missing required fields', async () => {
      const orderData = {
        items: [
          {
            menuItemId: 1,
            name: 'Pizza Margherita',
            price: 12.99,
            quantity: 2
          }
        ],
        total: 25.98
        // Missing deliveryAddress and paymentMethod
      }

      const response = await request(app.fetch)
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /orders', () => {
    beforeEach(async () => {
      // Create some test orders
      const orders = [
        {
          items: [{ menuItemId: 1, name: 'Pizza', price: 12.99, quantity: 1 }],
          total: 12.99,
          deliveryAddress: '123 Main St',
          paymentMethod: 'credit_card'
        },
        {
          items: [{ menuItemId: 2, name: 'Burger', price: 8.99, quantity: 2 }],
          total: 17.98,
          deliveryAddress: '456 Oak Ave',
          paymentMethod: 'paypal'
        }
      ]

      for (const order of orders) {
        await request(app.fetch)
          .post('/orders')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(order)
      }
    })

    it('should return user orders', async () => {
      const response = await request(app.fetch)
        .get('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('orders')
      expect(Array.isArray(response.body.orders)).toBe(true)
      expect(response.body.orders).toHaveLength(2)
      expect(response.body.orders[0].userId).toBe(userId)
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.fetch)
        .get('/orders')
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return orders sorted by creation date (newest first)', async () => {
      const response = await request(app.fetch)
        .get('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const orders = response.body.orders
      expect(new Date(orders[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(orders[1].createdAt).getTime()
      )
    })
  })

  describe('GET /orders/:id', () => {
    let orderId: string

    beforeEach(async () => {
      // Create a test order
      const orderData = {
        items: [{ menuItemId: 1, name: 'Pizza', price: 12.99, quantity: 1 }],
        total: 12.99,
        deliveryAddress: '123 Main St',
        paymentMethod: 'credit_card'
      }

      const response = await request(app.fetch)
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)

      orderId = response.body.order.id
    })

    it('should return specific order by id', async () => {
      const response = await request(app.fetch)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body).toHaveProperty('order')
      expect(response.body.order.id).toBe(orderId)
      expect(response.body.order.userId).toBe(userId)
    })

    it('should return 404 for non-existent order', async () => {
      const response = await request(app.fetch)
        .get('/orders/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await request(app.fetch)
        .get(`/orders/${orderId}`)
        .expect(401)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 403 for accessing another user order', async () => {
      // Create another user
      const anotherUserData = {
        email: 'another@example.com',
        password: 'password123',
        name: 'Another User'
      }

      const anotherUserResponse = await request(app.fetch)
        .post('/auth/register')
        .send(anotherUserData)

      const anotherUserToken = anotherUserResponse.body.accessToken

      const response = await request(app.fetch)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .expect(403)

      expect(response.body).toHaveProperty('error')
    })
  })

  describe('PATCH /orders/:id/status', () => {
    let orderId: string

    beforeEach(async () => {
      // Create a test order
      const orderData = {
        items: [{ menuItemId: 1, name: 'Pizza', price: 12.99, quantity: 1 }],
        total: 12.99,
        deliveryAddress: '123 Main St',
        paymentMethod: 'credit_card'
      }

      const response = await request(app.fetch)
        .post('/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(orderData)

      orderId = response.body.order.id
    })

    it('should update order status', async () => {
      const response = await request(app.fetch)
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'confirmed' })
        .expect(200)

      expect(response.body.order.status).toBe('confirmed')
    })

    it('should return 400 for invalid status', async () => {
      const response = await request(app.fetch)
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'invalid_status' })
        .expect(400)

      expect(response.body).toHaveProperty('error')
    })

    it('should return 404 for non-existent order', async () => {
      const response = await request(app.fetch)
        .patch('/orders/99999/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'confirmed' })
        .expect(404)

      expect(response.body).toHaveProperty('error')
    })
  })
})