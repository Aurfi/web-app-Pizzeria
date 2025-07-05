import axios from "axios";
import { CartService } from "../services/cart";
import { getMenuItems, saveMenuItems } from "../services/database";
import { t } from "../services/i18n";
import { brandingService } from "../services/branding";
import { isOpenNow } from "../services/hours";

export class MenuPage {
  private categories: any[] = [];
  private menuItems: any[] = [];
  private selectedCategory: string | null = null;
  private selectedCategoryName: string | null = null;
	private dietaryFilters: Set<string> = new Set();

	render(): HTMLElement {
		const container = document.createElement("div");
		container.className = "menu-page";

    const urlParams = new URLSearchParams(window.location.search);
    this.selectedCategory = urlParams.get("category");
    this.selectedCategoryName = urlParams.get("categoryName");

		container.innerHTML = `
      <div class="menu-header">
        <div class="category-tabs" id="category-tabs">
          <div class="loading">${t('menu.loadingCategories')}</div>
        </div>
      </div>
      
      <div class="menu-items" id="menu-items">
        <div class="loading">${t('menu.loadingItems')}</div>
      </div>
    `;

		this.setupEventListeners(container);
		this.loadData(container);

		return container;
	}

	private setupEventListeners(container: HTMLElement) {
    // no dietary filters
	}

	private async loadData(container: HTMLElement) {
    try {
			await this.loadCategories(container);
			await this.loadMenuItems(container);
		} catch (error) {
			console.error("Failed to load menu data:", error);
			await this.loadOfflineData(container);
		}
	}

  private async loadCategories(container: HTMLElement) {
    try {
      this.categories = await (await import("../services/menu")).MenuService.getCategories();
      this.renderCategories(container);
    } catch (error) {
      console.error("Failed to load categories:", error);
      const tabsContainer = container.querySelector("#category-tabs");
      if (tabsContainer) tabsContainer.innerHTML = '';
    }
  }

	private renderCategories(container: HTMLElement) {
		const tabsContainer = container.querySelector("#category-tabs");
		if (!tabsContainer) return;

		tabsContainer.innerHTML = `
      <button class="category-tab ${!this.selectedCategory ? "active" : ""}" data-category="">
        ${t('menu.allCategories')}
      </button>
      ${this.categories
        .map(
          (category) => `
        <button class="category-tab ${ String(this.selectedCategory || '') === String(category.id) ? "active" : ""}" 
                data-category="${category.id}">
          ${category.name}
        </button>
      `,
        )
        .join("")}
    `;

		tabsContainer.querySelectorAll(".category-tab").forEach((tab) => {
			tab.addEventListener("click", () => {
				const categoryId = tab.getAttribute("data-category");
				this.selectCategory(categoryId, container);
			});
		});
	}

	private selectCategory(categoryId: string | null, container: HTMLElement) {
		this.selectedCategory = categoryId;

		container.querySelectorAll(".category-tab").forEach((tab) => {
			tab.classList.toggle("active", tab.getAttribute("data-category") === (categoryId || ""));
		});

		const url = new URL(window.location.href);
		if (categoryId) {
			url.searchParams.set("category", categoryId);
		} else {
			url.searchParams.delete("category");
		}
		window.history.replaceState({}, "", url.toString());

    const list = container.querySelector('#menu-items');
    if (list) list.innerHTML = `<div class="loading">${t('menu.loadingItems')}</div>`;
    this.loadMenuItems(container);
	}

  private async loadMenuItems(container: HTMLElement) {
    try {
      // Prefer server-side filtering when a category is specified
      const base = "/api/menu/items";
      const params = new URLSearchParams();
      if (this.selectedCategory) params.set("category", String(this.selectedCategory));
      params.set("limit", "200");

      const url = params.toString() ? `${base}?${params.toString()}` : base;
      let resp = await axios.get(url);
      const normalize = (payload: any) => (Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload?.items) ? payload.items : [])));
      let items = normalize(resp.data);

      // Do not inject any hardcoded fallbacks; keep server/IndexedDB only

      this.menuItems = items;

      if (this.menuItems?.length) {
        await saveMenuItems(this.menuItems);
      }

      // Render with current filters (includes selectedCategory)
      this.applyFilters(container);
    } catch (error) {
      console.error("Failed to load menu items:", error);
      await this.loadOfflineData(container);
    }
  }

  private async loadOfflineData(container: HTMLElement) {
    try {
      const offlineItems = await getMenuItems(this.selectedCategory || undefined);
      if (offlineItems.length > 0) {
        this.menuItems = offlineItems;
        this.applyFilters(container);
      } else {
        const itemsContainer = container.querySelector("#menu-items");
        if (itemsContainer) {
            itemsContainer.innerHTML = `<p class="no-items">${t('menu.noItems')}</p>`;
        }
      }
		} catch (error) {
			console.error("Failed to load offline data:", error);
		}
	}

  private applyFilters(container: HTMLElement) {
    let filteredItems = [...this.menuItems];

    if (this.selectedCategory) {
      const sel = String(this.selectedCategory);
      filteredItems = filteredItems.filter((item: any) => String(item.categoryId || item.category?.id || '') === sel);
      // If empty, leave the list empty to reflect no items in this category
    }

    // no dietary filters

    this.renderFilteredItems(filteredItems, container);
		this.updateActiveFilters(container);
	}

	private renderMenuItems(container: HTMLElement) {
		this.renderFilteredItems(this.menuItems, container);
	}

	private renderFilteredItems(items: any[], container: HTMLElement) {
		const itemsContainer = container.querySelector("#menu-items");
		if (!itemsContainer) return;

    if (items.length === 0) {
      itemsContainer.innerHTML = `<p class="no-items">${t('menu.noItems')}</p>`;
      return;
    }

		itemsContainer.innerHTML = items
			.map(
				(item) => `
      <div class="menu-item-card" data-item-id="${item.id}">
        <div class="item-image">
          <img src="${item.imageUrl || "/images/placeholder.jpg"}" alt="${item.name}" loading="lazy">
        </div>
          <div class="item-content">
            <h3>${item.name}</h3>
            <p class="item-description">${item.description || ""}</p>
          
            <div class="item-footer">
              <span class="item-price">${item.price.toFixed(2)}€</span>
              <div class="item-actions">
              <button class="customize-btn" ${item.available === false || item.isAvailable === false ? 'disabled' : ''} data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}'>
                ${item.available === false || item.isAvailable === false ? t('menu.unavailable') : t('menu.customize')}
              </button>
              <button class="quick-add-btn" ${item.available === false || item.isAvailable === false ? 'disabled' : ''} data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}'>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `,
			)
			.join("");

		this.setupItemEventListeners(itemsContainer);
	}

	private setupItemEventListeners(container: Element) {
    container.querySelectorAll(".customize-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const itemData = JSON.parse(
          (btn.getAttribute("data-item") || "{}").replace(/&apos;/g, "'"),
        );
        this.openCustomizeModal(itemData);
      });
    });

    container.querySelectorAll(".quick-add-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const open = await isOpenNow();
        if (!open.open) {
          alert(`Le restaurant est fermé actuellement. Horaires aujourd'hui: ${open.window}`);
          return;
        }
        const itemData = JSON.parse(
          (btn.getAttribute("data-item") || "{}").replace(/&apos;/g, "'"),
        );
        await CartService.addItem(itemData, 1);

				btn.innerHTML = "✓";
				btn.classList.add("added");
				setTimeout(() => {
					btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          `;
					btn.classList.remove("added");
				}, 1500);
			});
		});
	}

	private openCustomizeModal(item: any) {
		const modal = document.createElement("div");
		modal.className = "customize-modal";
		modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${t('customization.title', { itemName: item.name })}</h2>
          <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="item-preview">
            <img src="${item.imageUrl || "/images/placeholder.jpg"}" alt="${item.name}">
            <p>${item.description || ""}</p>
          </div>
          
          ${
						item.options && item.options.length > 0
							? `
            <div class="item-options">
              ${item.options
								.map(
									(option: any) => `
                <div class="option-group">
                  <h4>${option.name} ${option.isRequired ? '<span class="required">' + t('customization.required') + '</span>' : ""}</h4>
                  ${
										option.type === "single"
											? `
                    <div class="radio-options">
                      ${option.values
												.map(
													(value: any, index: number) => `
                        <label>
                          <input type="radio" name="option-${option.id}" value="${value.id}" 
                                 ${index === 0 && option.isRequired ? "checked" : ""}>
                          <span>${value.value}</span>
                          ${value.priceModifier > 0 ? `<span class="price-mod">+${brandingService.formatPrice(value.priceModifier)}</span>` : ""}
                        </label>
                      `,
												)
												.join("")}
                    </div>
                  `
											: `
                    <div class="checkbox-options">
                      ${option.values
												.map(
													(value: any) => `
                        <label>
                          <input type="checkbox" name="option-${option.id}" value="${value.id}">
                          <span>${value.value}</span>
                          ${value.priceModifier > 0 ? `<span class=\"price-mod\">+${brandingService.formatPrice(value.priceModifier)}</span>` : ""}
                        </label>
                      `,
												)
												.join("")}
                    </div>
                  `
									}
                </div>
              `,
								)
								.join("")}
            </div>
          `
							: ""
					}
          
          <div class="special-instructions">
            <h4>Instructions Spéciales</h4>
            <textarea placeholder="Ajoutez vos demandes particulières..." id="special-instructions"></textarea>
          </div>
          
          <div class="quantity-selector">
            <h4>Quantité</h4>
            <div class="quantity-controls">
              <button class="qty-btn" data-action="decrease">-</button>
              <span class="quantity" id="quantity">1</span>
              <button class="qty-btn" data-action="increase">+</button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <div class="total-price">
            ${t('customization.total')} : <span id="total-price">${brandingService.formatPrice(item.price)}</span>
          </div>
          <button class="add-to-cart-modal-btn">${t('menu.addToCart')}</button>
        </div>
      </div>
    `;

		document.body.appendChild(modal);

		let quantity = 1;
		const basePrice = item.price;

		const updateTotal = () => {
			let total = basePrice;

			modal
				.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked')
				.forEach((input) => {
					const inputEl = input as HTMLInputElement;
					const option = item.options.find(
						(o: any) => o.id === inputEl.name.replace("option-", ""),
					);
					if (option) {
						const value = option.values.find((v: any) => v.id === inputEl.value);
						if (value?.priceModifier) {
							total += value.priceModifier;
						}
					}
				});

			total *= quantity;

			const totalElement = modal.querySelector("#total-price");
			if (totalElement) {
				totalElement.textContent = total.toFixed(2) + "€";
			}
		};

		modal.querySelectorAll("input").forEach((input) => {
			input.addEventListener("change", updateTotal);
		});

		modal.querySelectorAll(".qty-btn").forEach((btn) => {
			btn.addEventListener("click", () => {
				const action = btn.getAttribute("data-action");
				if (action === "increase") {
					quantity++;
				} else if (action === "decrease" && quantity > 1) {
					quantity--;
				}
				const qtyElement = modal.querySelector("#quantity");
				if (qtyElement) {
					qtyElement.textContent = quantity.toString();
				}
				updateTotal();
			});
		});

		const closeModal = () => modal.remove();

		modal.querySelector(".modal-overlay")?.addEventListener("click", closeModal);
		modal.querySelector(".close-modal")?.addEventListener("click", closeModal);

    modal.querySelector(".add-to-cart-modal-btn")?.addEventListener("click", async () => {
      const open = await isOpenNow();
      if (!open.open) {
        alert(`Le restaurant est fermé actuellement. Horaires aujourd'hui: ${open.window}`);
        return;
      }
      const selectedOptions: any[] = [];

			modal
				.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked')
				.forEach((input) => {
					const inputEl = input as HTMLInputElement;
					const option = item.options.find(
						(o: any) => o.id === inputEl.name.replace("option-", ""),
					);
					if (option) {
						const value = option.values.find((v: any) => v.id === inputEl.value);
						if (value) {
							selectedOptions.push({
								optionId: option.id,
								optionName: option.name,
								valueId: value.id,
								selectedValue: value.value,
								priceModifier: value.priceModifier || 0,
							});
						}
					}
				});

      await CartService.addItem(item, quantity, selectedOptions);

      closeModal();
    });

		requestAnimationFrame(() => {
			modal.classList.add("active");
		});
	}

	private updateActiveFilters(container: HTMLElement) {
		const filtersContainer = container.querySelector("#active-filters");
		if (!filtersContainer) return;

    const filters: string[] = [];

    const labels: Record<string, string> = {
      vegetarian: t('menu.vegetarian'),
      vegan: t('menu.vegan'),
      gluten_free: t('menu.glutenFree'),
    };

    this.dietaryFilters.forEach((filter) => {
      const label = labels[filter] || filter;
      filters.push(label);
    });

		if (filters.length > 0) {
			filtersContainer.innerHTML = filters
				.map(
					(filter) => `
        <span class="filter-tag">${filter}</span>
      `,
				)
				.join("");
		} else {
			filtersContainer.innerHTML = "";
		}
	}
}
