import { describe, it, expect, beforeEach, vi } from 'vitest'
import { cartService } from '../../src/services/cart'
import type { MenuItem, CartItem } from '../../src/types'

// Mock IndexedDB
const mockDB = {
  cartItems: {
    toArray: vi.fn(),
    clear: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    first: vi.fn(),
  },
}

vi.mock('../../src/services/database', () => ({
  db: mockDB,
}))

describe('Cart Service', () => {
  const mockMenuItem: MenuItem = {
    id: '1',
    name: 'Test Burger',
    description: 'A delicious test burger',
    price: 12.99,
    category: 'burgers',
    image: '/images/burger.jpg',
    isAvailable: true,
    preparationTime: 15,
    allergens: ['gluten'],
    nutritionalInfo: {
      calories: 650,
      protein: 35,
      carbs: 45,
      fat: 38,
    },
  }

  const mockCartItem: CartItem = {
    id: '1',
    menuItem: mockMenuItem,
    quantity: 2,
    specialInstructions: 'No pickles',
    addedAt: new Date(),
    price: 12.99,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCartItems', () => {
    it('should return all cart items', async () => {
      mockDB.cartItems.toArray.mockResolvedValue([mockCartItem])

      const result = await cartService.getCartItems()

      expect(result).toEqual([mockCartItem])
      expect(mockDB.cartItems.toArray).toHaveBeenCalled()
    })

    it('should return empty array if no items', async () => {
      mockDB.cartItems.toArray.mockResolvedValue([])

      const result = await cartService.getCartItems()

      expect(result).toEqual([])
    })
  })

  describe('addToCart', () => {
    it('should add new item to cart', async () => {
      mockDB.cartItems.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      })

      mockDB.cartItems.put.mockResolvedValue(1)

      await cartService.addToCart(mockMenuItem, 1, 'Extra cheese')

      expect(mockDB.cartItems.put).toHaveBeenCalledWith({
        id: mockMenuItem.id,
        menuItem: mockMenuItem,
        quantity: 1,
        specialInstructions: 'Extra cheese',
        addedAt: expect.any(Date),
        price: mockMenuItem.price,
      })
    })

    it('should update existing item quantity', async () => {
      const existingItem = { ...mockCartItem, quantity: 1 }
      mockDB.cartItems.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingItem),
        }),
      })

      mockDB.cartItems.put.mockResolvedValue(1)

      await cartService.addToCart(mockMenuItem, 2)

      expect(mockDB.cartItems.put).toHaveBeenCalledWith({
        ...existingItem,
        quantity: 3,
        addedAt: expect.any(Date),
      })
    })

    it('should handle special instructions for existing items', async () => {
      const existingItem = { ...mockCartItem, specialInstructions: 'No onions' }
      mockDB.cartItems.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingItem),
        }),
      })

      mockDB.cartItems.put.mockResolvedValue(1)

      await cartService.addToCart(mockMenuItem, 1, 'Extra cheese')

      expect(mockDB.cartItems.put).toHaveBeenCalledWith({
        ...existingItem,
        quantity: 3,
        specialInstructions: 'No onions; Extra cheese',
        addedAt: expect.any(Date),
      })
    })
  })

  describe('removeFromCart', () => {
    it('should remove item from cart', async () => {
      mockDB.cartItems.delete.mockResolvedValue(1)

      await cartService.removeFromCart('1')

      expect(mockDB.cartItems.delete).toHaveBeenCalledWith('1')
    })
  })

  describe('updateQuantity', () => {
    it('should update item quantity', async () => {
      mockDB.cartItems.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockCartItem),
        }),
      })

      mockDB.cartItems.put.mockResolvedValue(1)

      await cartService.updateQuantity('1', 5)

      expect(mockDB.cartItems.put).toHaveBeenCalledWith({
        ...mockCartItem,
        quantity: 5,
      })
    })

    it('should remove item if quantity is 0', async () => {
      mockDB.cartItems.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(mockCartItem),
        }),
      })

      mockDB.cartItems.delete.mockResolvedValue(1)

      await cartService.updateQuantity('1', 0)

      expect(mockDB.cartItems.delete).toHaveBeenCalledWith('1')
    })

    it('should throw error if item not found', async () => {
      mockDB.cartItems.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      })

      await expect(cartService.updateQuantity('999', 1)).rejects.toThrow('Item not found in cart')
    })
  })

  describe('clearCart', () => {
    it('should clear all cart items', async () => {
      mockDB.cartItems.clear.mockResolvedValue(1)

      await cartService.clearCart()

      expect(mockDB.cartItems.clear).toHaveBeenCalled()
    })
  })

  describe('getCartTotal', () => {
    it('should calculate total cart value', async () => {
      const items = [
        { ...mockCartItem, quantity: 2, price: 12.99 },
        { ...mockCartItem, id: '2', quantity: 1, price: 8.99 },
      ]

      mockDB.cartItems.toArray.mockResolvedValue(items)

      const total = await cartService.getCartTotal()

      expect(total).toBe(34.97) // (12.99 * 2) + (8.99 * 1)
    })

    it('should return 0 for empty cart', async () => {
      mockDB.cartItems.toArray.mockResolvedValue([])

      const total = await cartService.getCartTotal()

      expect(total).toBe(0)
    })
  })

  describe('getCartItemCount', () => {
    it('should return total item count', async () => {
      const items = [
        { ...mockCartItem, quantity: 2 },
        { ...mockCartItem, id: '2', quantity: 3 },
      ]

      mockDB.cartItems.toArray.mockResolvedValue(items)

      const count = await cartService.getCartItemCount()

      expect(count).toBe(5) // 2 + 3
    })

    it('should return 0 for empty cart', async () => {
      mockDB.cartItems.toArray.mockResolvedValue([])

      const count = await cartService.getCartItemCount()

      expect(count).toBe(0)
    })
  })
})