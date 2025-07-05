import axios from "axios";
import type { MenuItem } from "../types";
import { getMenuItems, saveMenuItems } from "./database";

class MenuServiceClass {
	private categoriesCache: any[] | null = null;
	private cacheTimestamp: number = 0;
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	async getCategories() {
		// Check if we have valid cache
		if (this.categoriesCache && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
			return this.categoriesCache;
		}

    try {
      const response = await axios.get("/api/menu/categories");
      const categories = response.data || [];

      // Fallback: reuse an image from an item in the category if category has no image
      const needsImage = categories.filter((c: any) => !c.imageUrl);
      if (needsImage.length) {
        // Fetch one item per category that needs an image
        await Promise.all(
          needsImage.map(async (cat: any) => {
            try {
              const items = await this.getMenuItems(cat.id) as any[];
              const withImage = items.find((it: any) => (it.imageUrl || it.image));
              if (withImage) {
                cat.imageUrl = withImage.imageUrl || withImage.image;
              }
            } catch (_e) {
              // ignore, leave imageUrl as undefined
            }
          })
        );
      }

      this.categoriesCache = categories;
      this.cacheTimestamp = Date.now();
      return categories;
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      // No hardcoded fallback; surface empty list
      return [];
    }
	}

  async getFeaturedItems(): Promise<MenuItem[]> {
    try {
            // Try to get from API
            const response = await axios.get("/api/menu/items?featured=true&limit=10");
            // Backend returns an object { data, pagination } – normalize to array
            const payload = response.data;
            const items = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                ? payload.data
                : Array.isArray(payload?.items)
                ? payload.items
                : [];

            // Save to IndexedDB for offline use
            if (items.length) {
                await saveMenuItems(items);
            }

            return items;
        } catch (error) {
			console.error("Failed to fetch featured items:", error);

			// Try to get from IndexedDB only; no hardcoded fallback
			const offlineItems = await getMenuItems();
			return offlineItems.length > 0 ? offlineItems.slice(0, 10) : [];
        }
  }

  async getMenuItems(categoryId?: string, filters?: any): Promise<MenuItem[]> {
    try {
      let url = "/api/menu/items";
      const params = new URLSearchParams();

      if (categoryId) params.append("category", categoryId);
      if (filters?.dietary) params.append("dietary", filters.dietary.join(","));
      if (filters?.search) params.append("search", filters.search);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await axios.get(url);
      const payload = response.data as any;
      const items: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
        ? payload.items
        : [];

      if (items.length) {
        await saveMenuItems(items as MenuItem[]);
      }

      return items as MenuItem[];
    } catch (error) {
      console.error("Failed to fetch menu items:", error);

      // Fallback to IndexedDB
      const offlineItems = await getMenuItems(categoryId);
      return offlineItems;
    }
  }

	async getMenuItem(id: string): Promise<MenuItem | null> {
		try {
			const response = await axios.get(`/api/menu/items/${id}`);
			return response.data;
		} catch (error) {
			console.error("Failed to fetch menu item:", error);

			// Try to get from IndexedDB
			const offlineItems = await getMenuItems();
			return offlineItems.find((item) => item.id === id) || null;
		}
	}

	async searchItems(query: string): Promise<MenuItem[]> {
		if (query.length < 2) {
			return [];
		}

		try {
			const response = await axios.get(`/api/menu/items?search=${encodeURIComponent(query)}`);
			return response.data;
		} catch (error) {
			console.error("Failed to search items:", error);

			// Search in offline data
			const offlineItems = await getMenuItems();
			const lowerQuery = query.toLowerCase();

			return offlineItems.filter(
				(item) =>
					item.name.toLowerCase().includes(lowerQuery) ||
					item.description?.toLowerCase().includes(lowerQuery),
			);
		}
	}
}

export const MenuService = new MenuServiceClass();
