import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cartService } from '../../src/services/cart'
import { redis } from '../../src/config/database'

// Mock dependencies
vi.mock('../../src/config/database')

const mockRedis = vi.mocked(redis)

describe('Cart Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCart', () => {
    it('should return cart for user', async () => {
      const userId = '123'
      const mockCart = {
        items: [
          {
            id: '1',
            menuItemId: 'menu-1',
            name: 'Pizza',
            price: 12.99,
            quantity: 2
          }
        ],
        total: 25.98
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(mockCart))

      const result = await cartService.getCart(userId)

      expect(mockRedis.get).toHaveBeenCalledWith(`cart:${userId}`)
      expect(result).toEqual(mockCart)
    })

    it('should return empty cart for new user', async () => {
      const userId = '123'
      mockRedis.get.mockResolvedValue(null)

      const result = await cartService.getCart(userId)

      expect(result).toEqual({ items: [], total: 0 })
    })
  })

  describe('addToCart', () => {
    it('should add new item to cart', async () => {
      const userId = '123'
      const cartItem = {
        menuItemId: 'menu-1',
        name: 'Pizza',
        price: 12.99,
        quantity: 1
      }

      mockRedis.get.mockResolvedValue(null) // Empty cart
      mockRedis.setex.mockResolvedValue('OK')

      const result = await cartService.addToCart(userId, cartItem)

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `cart:${userId}`,
        3600, // 1 hour TTL
        expect.stringContaining('"total":12.99')
      )
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(12.99)
    })

    it('should update quantity for existing item', async () => {
      const userId = '123'
      const existingCart = {
        items: [
          {
            id: '1',
            menuItemId: 'menu-1',
            name: 'Pizza',
            price: 12.99,
            quantity: 1
          }
        ],
        total: 12.99
      }
      const cartItem = {
        menuItemId: 'menu-1',
        name: 'Pizza',
        price: 12.99,
        quantity: 2
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(existingCart))
      mockRedis.setex.mockResolvedValue('OK')

      const result = await cartService.addToCart(userId, cartItem)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].quantity).toBe(3) // 1 + 2
      expect(result.total).toBe(38.97) // 3 * 12.99
    })
  })

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      const userId = '123'
      const existingCart = {
        items: [
          {
            id: '1',
            menuItemId: 'menu-1',
            name: 'Pizza',
            price: 12.99,
            quantity: 2
          },
          {
            id: '2',
            menuItemId: 'menu-2',
            name: 'Burger',
            price: 8.99,
            quantity: 1
          }
        ],
        total: 34.97
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(existingCart))
      mockRedis.setex.mockResolvedValue('OK')

      const result = await cartService.removeFromCart(userId, '1')

      expect(result.items).toHaveLength(1)
      expect(result.items[0].menuItemId).toBe('menu-2')
      expect(result.total).toBe(8.99)
    })

    it('should return empty cart when removing last item', async () => {
      const userId = '123'
      const existingCart = {
        items: [
          {
            id: '1',
            menuItemId: 'menu-1',
            name: 'Pizza',
            price: 12.99,
            quantity: 1
          }
        ],
        total: 12.99
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(existingCart))
      mockRedis.setex.mockResolvedValue('OK')

      const result = await cartService.removeFromCart(userId, '1')

      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('clearCart', () => {
    it('should clear user cart', async () => {
      const userId = '123'
      mockRedis.del.mockResolvedValue(1)

      await cartService.clearCart(userId)

      expect(mockRedis.del).toHaveBeenCalledWith(`cart:${userId}`)
    })
  })

  describe('updateCartItemQuantity', () => {
    it('should update item quantity', async () => {
      const userId = '123'
      const existingCart = {
        items: [
          {
            id: '1',
            menuItemId: 'menu-1',
            name: 'Pizza',
            price: 12.99,
            quantity: 2
          }
        ],
        total: 25.98
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(existingCart))
      mockRedis.setex.mockResolvedValue('OK')

      const result = await cartService.updateCartItemQuantity(userId, '1', 3)

      expect(result.items[0].quantity).toBe(3)
      expect(result.total).toBe(38.97) // 3 * 12.99
    })

    it('should remove item when quantity is 0', async () => {
      const userId = '123'
      const existingCart = {
        items: [
          {
            id: '1',
            menuItemId: 'menu-1',
            name: 'Pizza',
            price: 12.99,
            quantity: 2
          }
        ],
        total: 25.98
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(existingCart))
      mockRedis.setex.mockResolvedValue('OK')

      const result = await cartService.updateCartItemQuantity(userId, '1', 0)

      expect(result.items).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })
})