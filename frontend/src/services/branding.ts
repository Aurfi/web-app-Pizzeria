import { activeBrandConfig, type BrandConfig } from '../config/branding';

// Define RestaurantConfig interface locally
interface RestaurantConfig {
  restaurant: {
    name: string;
    tagline: string;
    type: string;
    cuisine: string;
    description: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      light: string;
    };
  };
  fonts: {
    primary: string;
    headings: string;
    accent: string;
  };
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
  features: {
    delivery: boolean;
    pickup: boolean;
    reservations: boolean;
    loyalty: boolean;
  };
  demo: {
    email: string;
    password: string;
  };
}

export class BrandingService {
  private config: RestaurantConfig | null = null;
  private initialized = false;

  async initialize() {
    // Use the active brand configuration - no API calls, fully static
    this.config = activeBrandConfig as RestaurantConfig;
    
    this.applyCSSVariables();
    this.updatePageTitle();
    this.loadFonts();
    this.initialized = true;
    
    // Notify listeners that branding is loaded
    this.notifyListeners();
  }


  private applyCSSVariables() {
    const root = document.documentElement;
    const colors = this.config.colors;

    // Apply color variables
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-warning', colors.warning);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-text-primary', colors.text.primary);
    root.style.setProperty('--color-text-secondary', colors.text.secondary);
    root.style.setProperty('--color-text-light', colors.text.light);

    // Apply font variables
    root.style.setProperty('--font-primary', this.config.fonts.primary);
    root.style.setProperty('--font-headings', this.config.fonts.headings);
    root.style.setProperty('--font-accent', this.config.fonts.accent);
  }

  private updatePageTitle() {
    document.title = `${this.config.restaurant.name} - ${this.config.restaurant.tagline}`;
  }

  private loadFonts() {
    // Extract Google Font names from font families
    const fonts = [
      this.config.fonts.primary,
      this.config.fonts.headings,
      this.config.fonts.accent
    ];

    fonts.forEach(fontFamily => {
      const fontName = this.extractGoogleFontName(fontFamily);
      if (fontName) {
        this.loadGoogleFont(fontName);
      }
    });
  }

  private extractGoogleFontName(fontFamily: string): string | null {
    // Extract font name from CSS font-family string
    const match = fontFamily.match(/"([^"]+)"/);
    if (match) {
      const fontName = match[1];
      // Only load if it's likely a Google Font (not system fonts)
      if (!['Inter', 'Arial', 'Helvetica', 'Times', 'Georgia', 'Verdana'].includes(fontName)) {
        return fontName.replace(/\s+/g, '+');
      }
    }
    return null;
  }

  private loadGoogleFont(fontName: string) {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700&display=swap`;
    link.rel = 'stylesheet';
    link.id = `font-${fontName}`;
    
    // Don't load if already loaded
    if (!document.getElementById(`font-${fontName}`)) {
      document.head.appendChild(link);
    }
  }

  // Getters for components to access config (with null checks)
  get restaurantName() { return this.config?.restaurant.name || 'Restaurant'; }
  get restaurantTagline() { return this.config?.restaurant.tagline || 'Great Food, Great Experience'; }
  get restaurantDescription() { return this.config?.restaurant.description || 'A demo restaurant'; }
  get restaurantType() { return this.config?.restaurant.type || 'restaurant'; }
  get cuisine() { return this.config?.restaurant.cuisine || 'International'; }
  get contact() { return this.config?.contact; }
  get features() { return this.config?.features; }
  get demoCredentials() { return this.config?.demo; }
  get isInitialized() { return this.initialized; }

  formatPrice(price: number): string {
    const formattedPrice = price.toFixed(2);
    return `${formattedPrice}€`; // Euro format for France
  }

  // Method to switch restaurant config (for demos)
  switchConfig(newConfig: RestaurantConfig) {
    this.config = newConfig;
    this.applyCSSVariables();
    this.updatePageTitle();
    this.loadFonts();
    
    // Trigger a re-render event
    window.dispatchEvent(new CustomEvent('brandingChanged', { 
      detail: { config: this.config } 
    }));
    this.notifyListeners();
  }

  private listeners: Set<() => void> = new Set();

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

export const brandingService = new BrandingService();