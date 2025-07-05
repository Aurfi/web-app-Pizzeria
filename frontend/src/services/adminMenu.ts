import axios from 'axios';
import { generateMenuItemId, generateCategoryId, generateMenuItemOptionId, generateMenuItemOptionValueId } from '../utils/uuid';
import type { MenuItem, MenuCategory, MenuItemOption, MenuItemOptionValue } from '../types';

export interface CreateMenuItemData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image?: string;
  isAvailable?: boolean;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  calories?: number;
  preparationTime?: number;
  sortOrder?: number;
  options?: Omit<MenuItemOption, 'id'>[];
}

export interface CreateMenuCategoryData {
  name: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateMenuItemData extends Partial<CreateMenuItemData> {
  id: string;
}

export interface UpdateMenuCategoryData extends Partial<CreateMenuCategoryData> {
  id: string;
}

class AdminMenuServiceClass {
  /**
   * Create a new menu item with proper UUID generation
   */
  async createMenuItem(data: CreateMenuItemData): Promise<MenuItem> {
    const menuItemId = generateMenuItemId();
    
    const menuItemData = {
      id: menuItemId,
      name: data.name,
      description: data.description,
      price: data.price,
      categoryId: data.categoryId,
      image: data.image || null,
      isAvailable: data.isAvailable ?? true,
      isVegetarian: data.isVegetarian ?? false,
      isVegan: data.isVegan ?? false,
      isGlutenFree: data.isGlutenFree ?? false,
      calories: data.calories || null,
      preparationTime: data.preparationTime || null,
      sortOrder: data.sortOrder ?? 0,
      options: data.options?.map(option => ({
        ...option,
        id: generateMenuItemOptionId(),
        values: option.values.map(value => ({
          ...value,
          id: generateMenuItemOptionValueId()
        }))
      })) || []
    };

    try {
      const response = await axios.post('/api/admin/menu/items', menuItemData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create menu item');
    }
  }

  /**
   * Update an existing menu item
   */
  async updateMenuItem(data: UpdateMenuItemData): Promise<MenuItem> {
    try {
      const response = await axios.put(`/api/admin/menu/items/${data.id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update menu item');
    }
  }

  /**
   * Delete a menu item
   */
  async deleteMenuItem(id: string): Promise<void> {
    try {
      await axios.delete(`/api/admin/menu/items/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete menu item');
    }
  }

  /**
   * Create a new menu category with proper UUID generation
   */
  async createMenuCategory(data: CreateMenuCategoryData): Promise<MenuCategory> {
    const categoryId = generateCategoryId();
    
    const categoryData = {
      id: categoryId,
      name: data.name,
      description: data.description || null,
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true
    };

    try {
      const response = await axios.post('/api/admin/menu/categories', categoryData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to create menu category');
    }
  }

  /**
   * Update an existing menu category
   */
  async updateMenuCategory(data: UpdateMenuCategoryData): Promise<MenuCategory> {
    try {
      const response = await axios.put(`/api/admin/menu/categories/${data.id}`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update menu category');
    }
  }

  /**
   * Delete a menu category
   */
  async deleteMenuCategory(id: string): Promise<void> {
    try {
      await axios.delete(`/api/admin/menu/categories/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete menu category');
    }
  }

  /**
   * Get all menu items for admin management
   */
  async getMenuItems(categoryId?: string): Promise<MenuItem[]> {
    try {
      let url = '/api/admin/menu/items';
      if (categoryId) {
        url += `?categoryId=${categoryId}`;
      }
      const response = await axios.get(url);
      return Array.isArray(response.data) ? response.data : response.data?.items ?? [];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch menu items');
    }
  }

  /**
   * Get all menu categories for admin management
   */
  async getMenuCategories(): Promise<MenuCategory[]> {
    try {
      const response = await axios.get('/api/admin/menu/categories');
      return Array.isArray(response.data) ? response.data : response.data?.categories ?? [];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch menu categories');
    }
  }

  /**
   * Add an option to an existing menu item
   */
  async addMenuItemOption(menuItemId: string, option: Omit<MenuItemOption, 'id'>): Promise<MenuItemOption> {
    const optionData = {
      ...option,
      id: generateMenuItemOptionId(),
      values: option.values.map(value => ({
        ...value,
        id: generateMenuItemOptionValueId()
      }))
    };

    try {
      const response = await axios.post(`/api/admin/menu/items/${menuItemId}/options`, optionData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to add menu item option');
    }
  }

  /**
   * Update a menu item option
   */
  async updateMenuItemOption(menuItemId: string, optionId: string, option: Partial<MenuItemOption>): Promise<MenuItemOption> {
    try {
      const response = await axios.put(`/api/admin/menu/items/${menuItemId}/options/${optionId}`, option);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update menu item option');
    }
  }

  /**
   * Delete a menu item option
   */
  async deleteMenuItemOption(menuItemId: string, optionId: string): Promise<void> {
    try {
      await axios.delete(`/api/admin/menu/items/${menuItemId}/options/${optionId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to delete menu item option');
    }
  }

  /**
   * Bulk update menu items sort order
   */
  async updateMenuItemsOrder(items: { id: string; sortOrder: number }[]): Promise<void> {
    try {
      await axios.put('/api/admin/menu/items/reorder', { items });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update menu items order');
    }
  }

  /**
   * Bulk update menu categories sort order
   */
  async updateMenuCategoriesOrder(categories: { id: string; sortOrder: number }[]): Promise<void> {
    try {
      await axios.put('/api/admin/menu/categories/reorder', { categories });
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to update menu categories order');
    }
  }
}

export const AdminMenuService = new AdminMenuServiceClass();
