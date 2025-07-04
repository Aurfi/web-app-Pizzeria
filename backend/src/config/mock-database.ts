// Mock database for local development without Docker
export interface MockUser {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface MockMenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  calories?: number;
  preparation_time?: number;
}

export interface MockCategory {
  id: string;
  name: string;
  description?: string;
  sort_order: number;
}

class MockDatabase {
  public users: MockUser[] = [
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'john@example.com',
      password_hash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      first_name: 'John',
      last_name: 'Doe',
      phone: '+1234567890',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      email: 'jane@example.com',
      password_hash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
      first_name: 'Jane',
      last_name: 'Smith',
      phone: '+1234567891',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'demo-user-pizza',
      email: 'demo@mariospizzeria.com',
      password_hash: '$2b$10$Q5SHGQo7IZx0ABbWsw0fp.mHBI9AV3vFNc/GjhV7Q5BAUurWpL.KG', // demo123
      first_name: 'Demo',
      last_name: 'Customer',
      phone: '+1555123PIZZA',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public categories: MockCategory[] = [
    { id: 'pizza-signature', name: 'Signature Pizzas', description: 'Our chef\'s special creations', sort_order: 1 },
    { id: 'pizza-classic', name: 'Classic Pizzas', description: 'Traditional Italian favorites', sort_order: 2 },
    { id: 'pizza-specialty', name: 'Specialty Pizzas', description: 'Gourmet combinations', sort_order: 3 },
    { id: 'calzones', name: 'Calzones', description: 'Folded pizza perfection', sort_order: 4 },
    { id: 'appetizers', name: 'Appetizers', description: 'Start your meal right', sort_order: 5 },
    { id: 'desserts', name: 'Desserts', description: 'Sweet Italian endings', sort_order: 6 },
    { id: 'beverages', name: 'Beverages', description: 'Refresh and enjoy', sort_order: 7 },
  ];

  public menuItems: MockMenuItem[] = [
    // Signature Pizzas
    {
      id: 'mario-special',
      category_id: 'pizza-signature',
      name: 'Mario\'s Special',
      description: 'Pepperoni, Italian sausage, mushrooms, bell peppers, onions, black olives',
      price: 18.99,
      image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop',
      available: true,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      calories: 920,
      preparation_time: 18,
    },
    {
      id: 'quattro-formaggi',
      category_id: 'pizza-signature',
      name: 'Quattro Formaggi',
      description: 'Mozzarella, gorgonzola, parmesan, and ricotta cheese blend',
      price: 19.99,
      image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop',
      available: true,
      is_vegetarian: true,
      is_vegan: false,
      is_gluten_free: false,
      calories: 1050,
      preparation_time: 16,
    },
    // Classic Pizzas
    {
      id: 'margherita',
      category_id: 'pizza-classic',
      name: 'Margherita',
      description: 'San Marzano tomatoes, fresh mozzarella di bufala, fresh basil, extra virgin olive oil',
      price: 14.99,
      image_url: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop',
      available: true,
      is_vegetarian: true,
      is_vegan: false,
      is_gluten_free: false,
      calories: 680,
      preparation_time: 12,
    },
    {
      id: 'pepperoni',
      category_id: 'pizza-classic',
      name: 'Pepperoni',
      description: 'Classic pepperoni with mozzarella and tomato sauce',
      price: 16.99,
      image_url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop',
      available: true,
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      calories: 820,
      preparation_time: 12,
    },
    // Appetizers
    {
      id: 'garlic-knots',
      category_id: 'appetizers',
      name: 'Garlic Knots',
      description: 'Fresh baked knots with garlic butter and parmesan',
      price: 6.99,
      image_url: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&h=300&fit=crop',
      available: true,
      is_vegetarian: true,
      is_vegan: false,
      is_gluten_free: false,
      calories: 320,
      preparation_time: 8,
    },
    {
      id: 'item4',
      category_id: 'cat3',
      name: 'Chocolate Cake',
      description: 'Rich chocolate cake with fudge',
      price: 6.99,
      available: true,
      is_vegetarian: true,
      is_vegan: false,
      is_gluten_free: false,
      calories: 480,
      preparation_time: 5,
    },
    {
      id: 'item5',
      category_id: 'cat4',
      name: 'Coca-Cola',
      description: 'Classic Coca-Cola',
      price: 2.99,
      available: true,
      is_vegetarian: true,
      is_vegan: true,
      is_gluten_free: true,
      calories: 140,
      preparation_time: 1,
    },
  ];

  async connect(): Promise<MockDatabase> {
    // Mock database is always "connected"
    return this;
  }

  release(): void {
    // Mock release - no-op
  }

  async query(sql: string, params: any[] = []): Promise<{ rows: any[] }> {
    // Simple SQL simulation
    console.log('Mock DB Query:', sql, params);
    
    if (sql.includes('SELECT') && sql.includes('users')) {
      if (sql.includes('WHERE email')) {
        const email = params[0];
        const user = this.users.find(u => u.email === email);
        return { rows: user ? [user] : [] };
      }
      return { rows: this.users };
    }
    
    if (sql.includes('SELECT') && sql.includes('menu_categories')) {
      return { rows: this.categories };
    }
    
    // Handle complex menu items query
    if (sql.includes('SELECT') && sql.includes('menu_items')) {
      // For the complex query, transform menu items to match expected structure
      const transformedItems = this.menuItems.map(item => ({
        ...item,
        is_available: item.available,
        category_name: this.categories.find(c => c.id === item.category_id)?.name || 'Unknown',
        options: []
      }));
      return { rows: transformedItems };
    }
    
    if (sql.includes('COUNT') && sql.includes('menu_items')) {
      return { rows: [{ count: this.menuItems.length }] };
    }
    
    if (sql.includes('SELECT 1')) {
      return { rows: [{ '?column?': 1 }] };
    }
    
    if (sql.includes('COUNT')) {
      return { rows: [{ count: this.users.length }] };
    }
    
    return { rows: [] };
  }
}

class MockRedis {
  private data = new Map<string, string>();
  
  async ping(): Promise<string> {
    return 'PONG';
  }
  
  async set(key: string, value: string, _expireMode?: string, _expireTime?: number): Promise<string> {
    this.data.set(key, value);
    return 'OK';
  }

  async setex(key: string, _seconds: number, value: string): Promise<string> {
    this.data.set(key, value);
    // In a real implementation, we'd set an expiration timer
    // For demo purposes, we'll just store the value
    return 'OK';
  }
  
  async get(key: string): Promise<string | null> {
    return this.data.get(key) || null;
  }
  
  async del(key: string): Promise<number> {
    return this.data.delete(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = this.data.get(key);
    const value = current ? parseInt(current, 10) + 1 : 1;
    this.data.set(key, value.toString());
    return value;
  }

  async expire(key: string, _seconds: number): Promise<number> {
    // For demo purposes, we'll just return 1 (success)
    // In a real implementation, we'd set an expiration timer
    return this.data.has(key) ? 1 : 0;
  }

  // Add pipeline method for compatibility
  pipeline() {
    const commands: Array<{ method: string; args: any[] }> = [];
    
    const pipeline = {
      incr: (key: string) => {
        commands.push({ method: 'incr', args: [key] });
        return pipeline;
      },
      expire: (key: string, seconds: number) => {
        commands.push({ method: 'expire', args: [key, seconds] });
        return pipeline;
      },
      exec: async () => {
        const results = [];
        for (const cmd of commands) {
          if (cmd.method === 'incr') {
            results.push([null, await this.incr(cmd.args[0])]);
          } else if (cmd.method === 'expire') {
            results.push([null, await this.expire(cmd.args[0], cmd.args[1])]);
          }
        }
        return results;
      }
    };
    
    return pipeline;
  }
}

export const mockPool = new MockDatabase();
export const mockRedis = new MockRedis();