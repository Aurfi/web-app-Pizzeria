-- Seed data: Base Tomate, Base Crème, Desserts, Boissons

-- Clear existing menu data
DELETE FROM order_items;
DELETE FROM menu_items;
DELETE FROM menu_categories;

-- Insert categories
INSERT INTO menu_categories (id, name, description, sort_order, is_active, image_url) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Base Tomate', 'Pizzas à base de sauce tomate', 1, true, 'https://images.unsplash.com/photo-1548365328-9f547fb095de?w=900&q=80&auto=format&fit=crop'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Base Crème', 'Pizzas à base de crème fraîche', 2, true, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=900&q=80&auto=format&fit=crop'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Desserts', 'Douceurs pour terminer le repas', 3, true, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=900&q=80&auto=format&fit=crop'),
  ('550e8400-e29b-41d4-a716-446655440004', 'Boissons', 'Rafraîchissements et boissons', 4, true, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&q=80&auto=format&fit=crop')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active, image_url = EXCLUDED.image_url;

-- Base Tomate items
INSERT INTO menu_items (id, category_id, name, description, price, image_url, is_available, is_vegetarian, is_vegan, is_gluten_free, calories, preparation_time, sort_order) VALUES
  ('650e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Margherita', 'Tomate, mozzarella, basilic frais, huile d''olive extra vierge', 14.90, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&h=300&fit=crop', true, true, false, false, 680, 12, 1),
  ('650e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440001', 'Reine', 'Jambon cuit, champignons, mozzarella, sauce tomate', 16.90, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop', true, false, false, false, 780, 12, 2),
  ('650e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440001', 'Diavola', 'Salami piquant, mozzarella, sauce tomate, huile pimentée', 17.90, 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop', true, false, false, false, 820, 12, 3),
  ('650e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440001', 'Végétarienne', 'Poivrons, champignons, oignons, olives, tomates, mozzarella', 16.50, 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop', true, true, false, false, 740, 13, 4);

-- Base Crème items
INSERT INTO menu_items (id, category_id, name, description, price, image_url, is_available, is_vegetarian, is_vegan, is_gluten_free, calories, preparation_time, sort_order) VALUES
  ('650e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440002', '4 Fromages (crème)', 'Crème, mozzarella, gorgonzola, chèvre, parmesan', 18.90, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop', true, true, false, false, 1050, 16, 1),
  ('650e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440002', 'Savoyarde', 'Crème, pommes de terre, lardons, oignons, reblochon', 19.90, 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop', true, false, false, false, 1120, 16, 2),
  ('650e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440002', 'Carbonara', 'Crème, œuf, pancetta, pecorino romano, poivre noir', 17.90, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop', true, false, false, false, 980, 15, 3),
  ('650e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440002', 'Norvégienne', 'Crème, saumon fumé, citron, aneth, mozzarella', 19.50, 'https://images.unsplash.com/photo-1523986371872-9d3ba2e2f642?w=400&h=300&fit=crop', true, false, false, false, 900, 14, 4);

-- Desserts
INSERT INTO menu_items (id, category_id, name, description, price, image_url, is_available, is_vegetarian, is_vegan, is_gluten_free, calories, preparation_time, sort_order) VALUES
  ('650e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440003', 'Tiramisu', 'Biscuit imbibé de café, mascarpone, cacao', 6.90, 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=400&h=300&fit=crop', true, true, false, false, 380, 5, 1),
  ('650e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440003', 'Panna Cotta', 'Crème vanille, coulis de fruits rouges', 5.90, 'https://images.unsplash.com/photo-1543332164-6e82f355bad8?w=400&h=300&fit=crop', true, true, false, true, 260, 3, 2),
  ('650e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440003', 'Fondant au chocolat', 'Cœur coulant, servi tiède', 6.50, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476e?w=400&h=300&fit=crop', true, true, false, false, 420, 8, 3),
  ('650e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440003', 'Gelato', 'Glace artisanale – parfums du jour', 4.90, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=300&fit=crop', true, true, false, true, 220, 2, 4);

-- Boissons
INSERT INTO menu_items (id, category_id, name, description, price, image_url, is_available, is_vegetarian, is_vegan, is_gluten_free, calories, preparation_time, sort_order) VALUES
  ('650e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440004', 'Eau minérale', 'Plate ou gazeuse 50cl', 2.50, 'https://images.unsplash.com/photo-1526401485004-2fda9f4d3d83?w=400&h=300&fit=crop', true, true, true, true, 0, 0, 1),
  ('650e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440004', 'Soda', 'Coca‑Cola, Sprite, etc. 33cl', 3.00, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop', true, true, true, true, 140, 0, 2),
  ('650e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440004', 'Bière italienne', 'Bouteille 33cl', 5.00, 'https://images.unsplash.com/photo-1532634726-8b9fb99825c7?w=400&h=300&fit=crop', true, true, true, true, 150, 0, 3),
  ('650e8400-e29b-41d4-a716-446655440404', '550e8400-e29b-41d4-a716-446655440004', 'Verre de vin rouge', 'Chianti, 12cl', 8.00, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop', true, true, true, true, 120, 0, 4);
