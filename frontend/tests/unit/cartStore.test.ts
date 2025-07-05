import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCartStore } from '../../src/stores/cartStore'

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useCartStore())
    act(() => {
      result.current.clearCart()
    })
  })

  it('should initialize with empty cart', () => {
    const { result } = renderHook(() => useCartStore())
    
    expect(result.current.items).toEqual([])
    expect(result.current.total).toBe(0)
  })

  it('should add item to cart', () => {
    const { result } = renderHook(() => useCartStore())
    
    const newItem = {
      id: '1',
      menuItemId: 'menu-1',
      name: 'Pizza',
      price: 12.99,
      quantity: 1,
      image: 'pizza.jpg'
    }

    act(() => {
      result.current.addItem(newItem)
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toEqual(newItem)
    expect(result.current.total).toBe(12.99)
  })

  it('should update quantity when adding existing item', () => {
    const { result } = renderHook(() => useCartStore())
    
    const item = {
      id: '1',
      menuItemId: 'menu-1',
      name: 'Pizza',
      price: 12.99,
      quantity: 1,
      image: 'pizza.jpg'
    }

    act(() => {
      result.current.addItem(item)
      result.current.addItem({ ...item, quantity: 2 })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].quantity).toBe(3)
    expect(result.current.total).toBe(38.97)
  })

  it('should remove item from cart', () => {
    const { result } = renderHook(() => useCartStore())
    
    const item = {
      id: '1',
      menuItemId: 'menu-1',
      name: 'Pizza',
      price: 12.99,
      quantity: 2,
      image: 'pizza.jpg'
    }

    act(() => {
      result.current.addItem(item)
      result.current.removeItem('1')
    })

    expect(result.current.items).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })

  it('should update item quantity', () => {
    const { result } = renderHook(() => useCartStore())
    
    const item = {
      id: '1',
      menuItemId: 'menu-1',
      name: 'Pizza',
      price: 12.99,
      quantity: 2,
      image: 'pizza.jpg'
    }

    act(() => {
      result.current.addItem(item)
      result.current.updateQuantity('1', 5)
    })

    expect(result.current.items[0].quantity).toBe(5)
    expect(result.current.total).toBe(64.95)
  })

  it('should remove item when quantity is set to 0', () => {
    const { result } = renderHook(() => useCartStore())
    
    const item = {
      id: '1',
      menuItemId: 'menu-1',
      name: 'Pizza',
      price: 12.99,
      quantity: 2,
      image: 'pizza.jpg'
    }

    act(() => {
      result.current.addItem(item)
      result.current.updateQuantity('1', 0)
    })

    expect(result.current.items).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })

  it('should clear entire cart', () => {
    const { result } = renderHook(() => useCartStore())
    
    const items = [
      {
        id: '1',
        menuItemId: 'menu-1',
        name: 'Pizza',
        price: 12.99,
        quantity: 2,
        image: 'pizza.jpg'
      },
      {
        id: '2',
        menuItemId: 'menu-2',
        name: 'Burger',
        price: 8.99,
        quantity: 1,
        image: 'burger.jpg'
      }
    ]

    act(() => {
      items.forEach(item => result.current.addItem(item))
      result.current.clearCart()
    })

    expect(result.current.items).toHaveLength(0)
    expect(result.current.total).toBe(0)
  })

  it('should calculate total correctly with multiple items', () => {
    const { result } = renderHook(() => useCartStore())
    
    const items = [
      {
        id: '1',
        menuItemId: 'menu-1',
        name: 'Pizza',
        price: 12.99,
        quantity: 2,
        image: 'pizza.jpg'
      },
      {
        id: '2',
        menuItemId: 'menu-2',
        name: 'Burger',
        price: 8.99,
        quantity: 3,
        image: 'burger.jpg'
      }
    ]

    act(() => {
      items.forEach(item => result.current.addItem(item))
    })

    const expectedTotal = (12.99 * 2) + (8.99 * 3)
    expect(result.current.total).toBe(expectedTotal)
  })
})