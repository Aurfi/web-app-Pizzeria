export interface RestaurantConfig {
  // Restaurant Identity
  restaurant: {
    name: string;
    tagline: string;
    type: 'pizzeria' | 'burger' | 'sushi' | 'mexican' | 'italian' | 'cafe' | 'bakery' | 'seafood';
    cuisine: string;
    description: string;
  };

  // Visual Identity
  colors: {
    primary: string;      // Main brand color
    secondary: string;    // Secondary accent
    accent: string;       // Call-to-action buttons
    success: string;      // Success messages
    warning: string;      // Warnings
    error: string;        // Errors
    background: string;   // Page background
    surface: string;      // Card backgrounds
    text: {
      primary: string;    // Main text
      secondary: string;  // Secondary text
      light: string;      // Light text on dark backgrounds
    };
  };

  // Typography
  fonts: {
    primary: string;      // Main font family
    headings: string;     // Headings font
    accent: string;       // Special text (prices, etc.)
  };

  // Contact & Location
  contact: {
    phone: string;
    address: string;
    hours: string;
    socialMedia?: {
      instagram?: string;
      facebook?: string;
      twitter?: string;
    };
  };

  // Features
  features: {
    delivery: boolean;
    pickup: boolean;
    reservations: boolean;
    loyalty: boolean;
  };

  // Demo Credentials
  demo: {
    email: string;
    password: string; // Display password, not hash
  };
}

// Import available brand configurations
import { marioPizzeriaConfig } from './brands/mario-pizzeria.js';
import { burgerJunctionConfig } from './brands/burger-junction.js';

// ==========================================
// ACTIVE BRAND CONFIGURATION
// Change this line to switch brands:
// ==========================================
export const restaurantConfig: RestaurantConfig = marioPizzeriaConfig;

// Alternative configurations (commented out):
// export const restaurantConfig: RestaurantConfig = burgerJunctionConfig;

// Export individual configs for reference
export const pizzeriaConfig = marioPizzeriaConfig;
export const burgerConfig = burgerJunctionConfig;