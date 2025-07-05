// Basic test to verify Vitest setup
describe('Helper Functions', () => {
  it('should pass basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string formatting', () => {
    const formatPrice = (price: number) => `$${price.toFixed(2)}`;
    expect(formatPrice(12.5)).toBe('$12.50');
  });

  it('should validate environment', () => {
    expect(typeof window).toBe('object');
  });
});