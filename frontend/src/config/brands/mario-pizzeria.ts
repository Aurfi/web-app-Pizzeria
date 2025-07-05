// Mario's Pizzeria Brand Configuration - Italian Pizza in France
export const marioPizzeriaConfig = {
  restaurant: {
    name: "Mario's Pizzeria",
    tagline: "Pizzas Italiennes Authentiques depuis 1962",
    type: 'pizzeria' as const,
    cuisine: 'Italienne',
    description: 'Pizzas traditionnelles au feu de bois préparées avec des ingrédients frais et des recettes familiales transmises de génération en génération.'
  },

  colors: {
    primary: '#C41E3A',      // Rouge italien
    secondary: '#2E8B57',    // Vert basilic  
    accent: '#FF6B35',       // Orange chaleureux
    success: '#28A745',      
    warning: '#FFC107',      
    error: '#DC3545',        
    background: '#FAFAFA',   
    surface: '#FFFFFF',      
    text: {
      primary: '#2C3E50',    
      secondary: '#6C757D',  
      light: '#FFFFFF'       
    }
  },

  fonts: {
    primary: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    headings: '"SF Pro Display", -apple-system, "Inter", system-ui, sans-serif', 
    accent: '"SF Pro Display", -apple-system, "Inter", system-ui, sans-serif'
  },

  contact: {
    phone: '01 45 32 78 92',
    address: '25 Rue des Martyrs, 75009 Paris, France',
    hours: 'Lun-Jeu: 11h-22h | Ven-Sam: 11h-23h | Dim: 12h-21h',
    socialMedia: {
      instagram: '@mariospizzeriaparis',
      facebook: 'mariospizzeriaparis'
    }
  },

  features: {
    delivery: true,
    pickup: true,
    reservations: false,
    loyalty: true
  },

  demo: {
    email: 'demo@mariospizzeria.fr',
    password: 'demo123'
  }
};
