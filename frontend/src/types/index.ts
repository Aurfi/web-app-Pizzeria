// User types
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

// Menu types
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image?: string;
  isAvailable: boolean;
  isFeatured?: boolean;
  allergies?: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  options?: MenuItemOption[];
}

export interface MenuItemOption {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  values: MenuItemOptionValue[];
}

export interface MenuItemOptionValue {
  id: string;
  name: string;
  price: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder?: number;
}

// Cart types
export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selectedOptions?: SelectedOption[];
  menuItem?: MenuItem;
}

export interface SelectedOption {
  optionId: string;
  selectedValue: string;
  additionalPrice: number;
}

// Order types
export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  deliveryAddress?: Address;
  paymentMethod?: PaymentMethod;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
}

export interface CreateOrderData {
  items: CartItem[];
  deliveryAddress?: Address;
  paymentMethod: PaymentMethod;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  instructions?: string;
}

export interface PaymentMethod {
  type: 'card' | 'cash' | 'digital';
  details?: any;
}

// Frontend-specific state types
export interface CartState {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Simple page contract used by vanilla admin/mobile pages
export interface Page {
  render(): Promise<HTMLElement> | HTMLElement;
}
