/**
 * UUID utility functions for generating unique identifiers
 */

/**
 * Generate a new UUID using the Web Crypto API
 * Falls back to a simple random UUID if crypto.randomUUID is not available
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate if a string is a valid UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generate a UUID specifically for menu items
 */
export function generateMenuItemId(): string {
  return generateId();
}

/**
 * Generate a UUID specifically for menu categories  
 */
export function generateCategoryId(): string {
  return generateId();
}

/**
 * Generate a UUID for menu item options
 */
export function generateMenuItemOptionId(): string {
  return generateId();
}

/**
 * Generate a UUID for menu item option values
 */
export function generateMenuItemOptionValueId(): string {
  return generateId();
}

/**
 * Generate a UUID for cart items (already handled in cart service but included for completeness)
 */
export function generateCartItemId(): string {
  return generateId();
}

/**
 * Generate a UUID for orders (backend handles this, but available if needed)
 */
export function generateOrderId(): string {
  return generateId();
}

/**
 * Generate a UUID for order items
 */
export function generateOrderItemId(): string {
  return generateId();
}

/**
 * Generate a UUID for addresses (backend handles this, but available if needed)
 */
export function generateAddressId(): string {
  return generateId();
}

/**
 * Generate a UUID for payment methods (backend handles this, but available if needed)
 */
export function generatePaymentMethodId(): string {
  return generateId();
}

/**
 * Generate a UUID for user sessions (backend handles this, but available if needed)
 */
export function generateSessionId(): string {
  return generateId();
}

/**
 * Generate a UUID for reviews (backend handles this, but available if needed)
 */
export function generateReviewId(): string {
  return generateId();
}