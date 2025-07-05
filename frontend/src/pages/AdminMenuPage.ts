import { Page } from "../types/index";
import { MenuService } from "../services/menu";
import { MenuItem, MenuCategory } from "../types/index";

export class AdminMenuPage implements Page {
	private element: HTMLElement;
	private menuItems: MenuItem[] = [];
	private categories: MenuCategory[] = [];

	constructor() {
		this.element = document.createElement("div");
		this.element.className = "admin-menu-page";
	}

	async render(): Promise<HTMLElement> {
		await this.loadData();
		
		this.element.innerHTML = `
			<div class="admin-menu-container">
				<div class="admin-header">
					<h1 class="admin-title">Gestion du Menu</h1>
					<div class="admin-actions">
						<button class="btn primary" id="addItemBtn">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<line x1="12" y1="5" x2="12" y2="19"></line>
								<line x1="5" y1="12" x2="19" y2="12"></line>
							</svg>
							Ajouter Article
						</button>
						<button class="btn secondary" id="backToDashboard">
							← Retour au Tableau de Bord
						</button>
					</div>
				</div>

				<div class="menu-management-grid">
					<div class="menu-items-section">
						<h2 class="section-title">Articles du Menu</h2>
						<div class="menu-items-list" id="menuItemsList">
							${this.renderMenuItems()}
						</div>
					</div>

					<div class="menu-form-section">
						<h2 class="section-title">Ajouter/Modifier Article</h2>
						<form class="menu-item-form" id="menuItemForm">
							<div id="formError" class="message error" style="display:none;"></div>
							<input type="hidden" id="itemId" />
							
							<div class="form-group">
								<label for="itemName">Nom de l'article</label>
								<input type="text" id="itemName" name="name" required />
							</div>

							<div class="form-group">
								<label for="itemDescription">Description</label>
								<textarea id="itemDescription" name="description" rows="3"></textarea>
							</div>

							<div class="form-row">
								<div class="form-group">
									<label for="itemPrice">Prix (€)</label>
									<input type="number" id="itemPrice" name="price" step="0.01" min="0" required />
								</div>
								
								<div class="form-group">
									<label for="itemCategory">Catégorie</label>
									<select id="itemCategory" name="categoryId" required>
										<option value="">Sélectionner une catégorie</option>
										${this.categories.map(cat => `
											<option value="${cat.id}">${cat.name}</option>
										`).join('')}
									</select>
								</div>
							</div>

							<div class="form-group">
								<label for="itemImage">URL de l'image</label>
								<input type="url" id="itemImage" name="image" placeholder="https://example.com/image.jpg" />
							</div>

							<div class="form-row">
								<div class="form-group checkbox-group">
									<label>
										<input type="checkbox" id="itemAvailable" name="isAvailable" checked />
										<span class="checkmark"></span>
										Disponible
									</label>
								</div>

								<div class="form-group checkbox-group">
									<label>
										<input type="checkbox" id="itemFeatured" name="isFeatured" />
										<span class="checkmark"></span>
										Article Vedette
									</label>
								</div>
							</div>

							<div class="form-actions">
								<button type="submit" class="btn primary" id="saveItemBtn">
									Sauvegarder
								</button>
								<button type="button" class="btn secondary" id="clearFormBtn">
									Effacer
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		`;

		this.setupEventListeners();
		return this.element;
	}

	private async loadData() {
		try {
			const token = localStorage.getItem("adminToken");
			
			// Load menu items from admin API
			const itemsResponse = await fetch("/api/admin/menu/items", {
				headers: {
					"Authorization": `Bearer ${token}`
				}
			});
			
			if (itemsResponse.ok) {
				const itemsData = await itemsResponse.json();
				this.menuItems = itemsData.items.map((item: any) => ({
					id: item.id,
					name: item.name,
					description: item.description || "",
					price: item.price,
					categoryId: item.category?.id || "",
					image: item.imageUrl || "",
					isAvailable: item.available,
					isFeatured: false // Not in backend data
				}));
			} else {
				console.error("Failed to load menu items:", itemsResponse.status);
				this.menuItems = [];
			}

			// Load categories from admin API
			const categoriesResponse = await fetch("/api/admin/menu/categories", {
				headers: {
					"Authorization": `Bearer ${token}`
				}
			});
			
			if (categoriesResponse.ok) {
				const categoriesData = await categoriesResponse.json();
				this.categories = categoriesData.categories.map((cat: any) => ({
					id: cat.id,
					name: cat.name,
					displayOrder: cat.sortOrder || 0
				}));
			} else {
				console.error("Failed to load categories:", categoriesResponse.status);
				this.categories = [];
			}
		} catch (error) {
			console.error("Error loading menu data:", error);
			this.menuItems = [];
			this.categories = [];
		}
	}

	private renderMenuItems(): string {
		if (this.menuItems.length === 0) {
			return `<div class="no-items">Aucun article dans le menu</div>`;
		}

		return this.menuItems.map(item => `
			<div class="menu-item-card" data-item-id="${item.id}">
				<div class="item-image">
					${item.image ? `<img src="${item.image}" alt="${item.name}" />` : 
						`<div class="placeholder-image">
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
								<circle cx="8.5" cy="8.5" r="1.5"></circle>
								<polyline points="21,15 16,10 5,21"></polyline>
							</svg>
						</div>`
					}
				</div>
				<div class="item-details">
					<h3 class="item-name">${item.name}</h3>
					<p class="item-description">${item.description || 'Aucune description'}</p>
					<div class="item-meta">
						<span class="item-price">€${item.price.toFixed(2)}</span>
						<span class="item-status ${item.isAvailable ? 'available' : 'unavailable'}">
							${item.isAvailable ? 'Disponible' : 'Indisponible'}
						</span>
					</div>
				</div>
				<div class="item-actions">
					<button class="btn small secondary edit-item" data-item-id="${item.id}">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
						</svg>
						Modifier
					</button>
					<button class="btn small danger delete-item" data-item-id="${item.id}">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3,6 5,6 21,6"></polyline>
							<path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
						</svg>
						Supprimer
					</button>
				</div>
			</div>
		`).join('');
	}

	private setupEventListeners() {
		// Back to dashboard
		const backBtn = this.element.querySelector("#backToDashboard");
		backBtn?.addEventListener("click", () => {
			window.history.pushState({}, "", "/admin/dashboard");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		// Add new item
		const addBtn = this.element.querySelector("#addItemBtn");
		addBtn?.addEventListener("click", () => {
			this.clearForm();
		});

		// Form submission
		const form = this.element.querySelector("#menuItemForm") as HTMLFormElement;
		form?.addEventListener("submit", (e) => this.handleFormSubmit(e));

		// Remove invalid styles on input change
		['#itemName', '#itemPrice', '#itemCategory'].forEach(sel => {
			const el = this.element.querySelector(sel) as HTMLInputElement | HTMLSelectElement | null;
			if (el) {
				el.addEventListener('input', () => el.classList.remove('invalid'));
				el.addEventListener('change', () => el.classList.remove('invalid'));
			}
		});

		// Clear form
		const clearBtn = this.element.querySelector("#clearFormBtn");
		clearBtn?.addEventListener("click", () => this.clearForm());

		// Edit and delete buttons
		this.element.querySelectorAll(".edit-item").forEach(btn => {
			btn.addEventListener("click", (e) => {
				const itemId = (e.currentTarget as HTMLElement).dataset.itemId;
				if (itemId) this.editItem(itemId);
			});
		});

		this.element.querySelectorAll(".delete-item").forEach(btn => {
			btn.addEventListener("click", (e) => {
				const itemId = (e.currentTarget as HTMLElement).dataset.itemId;
				if (itemId) this.deleteItem(itemId);
			});
		});
	}

	private async handleFormSubmit(e: Event) {
		e.preventDefault();
		
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		
		const errorBox = this.element.querySelector('#formError') as HTMLDivElement;
		if (errorBox) { errorBox.style.display = 'none'; errorBox.textContent = ''; }

		const itemId = (this.element.querySelector("#itemId") as HTMLInputElement).value;
		const name = (formData.get("name") as string || '').trim();
		const rawPrice = (formData.get("price") as string || '').trim();
		const categoryId = (formData.get("categoryId") as string || '').trim();
		const price = parseFloat(rawPrice);
		if (!name || !rawPrice || isNaN(price) || price < 0 || !categoryId) {
			if (errorBox) {
				errorBox.textContent = 'Veuillez renseigner un nom, un prix valide et une catégorie.';
				errorBox.style.display = 'block';
			}
			// Mark invalid fields
			const nameEl = this.element.querySelector('#itemName') as HTMLInputElement;
			const priceEl = this.element.querySelector('#itemPrice') as HTMLInputElement;
			const catEl = this.element.querySelector('#itemCategory') as HTMLSelectElement;
			if (nameEl) nameEl.classList.toggle('invalid', !name);
			if (priceEl) priceEl.classList.toggle('invalid', !rawPrice || isNaN(price) || price < 0);
			if (catEl) catEl.classList.toggle('invalid', !categoryId);
			return;
		}
		const itemData: any = {
			name,
			description: formData.get("description") as string,
			price,
			categoryId,
			imageUrl: formData.get("image") as string || undefined,
			available: formData.has("isAvailable"),
			// Additional fields for the backend
			isVegetarian: false,
			isVegan: false,
			isGlutenFree: false
		};

		try {
			const saveBtn = this.element.querySelector("#saveItemBtn") as HTMLButtonElement;
			saveBtn.disabled = true;
			saveBtn.textContent = "Sauvegarde...";

			const token = localStorage.getItem("adminToken");
			let response: Response;

			if (itemId) {
				// Update existing item
				const updatePayload = { ...itemData, isAvailable: itemData.available };
				response = await fetch(`/api/admin/menu/items/${itemId}`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${token}`
					},
					body: JSON.stringify(updatePayload)
				});
			} else {
				// Create new item
				response = await fetch("/api/admin/menu/items", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${token}`
					},
					body: JSON.stringify(itemData)
				});
			}

			if (response.ok) {
				// Refresh the menu items list
				await this.loadData();
				this.updateMenuItemsList();
				this.clearForm();
				
				// Show success message
				const action = itemId ? "modifié" : "ajouté";
				this.showMessage(`Article ${action} avec succès!`, "success");
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || "Erreur lors de la sauvegarde");
			}
			
		} catch (error) {
			console.error("Error saving menu item:", error);
			this.showMessage(`Erreur lors de la sauvegarde: ${error.message}`, "error");
		} finally {
			const saveBtn = this.element.querySelector("#saveItemBtn") as HTMLButtonElement;
			saveBtn.disabled = false;
			saveBtn.textContent = "Sauvegarder";
		}
	}

	private editItem(itemId: string) {
		const item = this.menuItems.find(i => i.id === itemId);
		if (!item) return;

		// Populate form with item data
		(this.element.querySelector("#itemId") as HTMLInputElement).value = item.id;
		(this.element.querySelector("#itemName") as HTMLInputElement).value = item.name;
		(this.element.querySelector("#itemDescription") as HTMLTextAreaElement).value = item.description || "";
		(this.element.querySelector("#itemPrice") as HTMLInputElement).value = item.price.toString();
		(this.element.querySelector("#itemCategory") as HTMLSelectElement).value = item.categoryId || "";
		(this.element.querySelector("#itemImage") as HTMLInputElement).value = item.image || "";
		(this.element.querySelector("#itemAvailable") as HTMLInputElement).checked = item.isAvailable;
		(this.element.querySelector("#itemFeatured") as HTMLInputElement).checked = item.isFeatured || false;

		// Scroll to form
		this.element.querySelector(".menu-form-section")?.scrollIntoView({ behavior: "smooth" });
	}

	private async deleteItem(itemId: string) {
		const item = this.menuItems.find(i => i.id === itemId);
		if (!item) return;

		if (confirm(`Êtes-vous sûr de vouloir supprimer "${item.name}" ?`)) {
			try {
				const token = localStorage.getItem("adminToken");
				const response = await fetch(`/api/admin/menu/items/${itemId}`, {
					method: "DELETE",
					headers: {
						"Authorization": `Bearer ${token}`
					}
				});

				if (response.ok) {
					// Refresh the menu items list
					await this.loadData();
					this.updateMenuItemsList();
					
					this.showMessage("Article supprimé avec succès!", "success");
				} else {
					const errorData = await response.json();
					throw new Error(errorData.error || "Erreur lors de la suppression");
				}
			} catch (error) {
				console.error("Error deleting menu item:", error);
				this.showMessage(`Erreur lors de la suppression: ${error.message}`, "error");
			}
		}
	}

	private clearForm() {
		const form = this.element.querySelector("#menuItemForm") as HTMLFormElement;
		form?.reset();
		(this.element.querySelector("#itemId") as HTMLInputElement).value = "";
		(this.element.querySelector("#itemAvailable") as HTMLInputElement).checked = true;
	}

	private updateMenuItemsList() {
		const listContainer = this.element.querySelector("#menuItemsList");
		if (listContainer) {
			listContainer.innerHTML = this.renderMenuItems();
			this.setupItemEventListeners();
		}
	}

	private setupItemEventListeners() {
		this.element.querySelectorAll(".edit-item").forEach(btn => {
			btn.addEventListener("click", (e) => {
				const itemId = (e.currentTarget as HTMLElement).dataset.itemId;
				if (itemId) this.editItem(itemId);
			});
		});

		this.element.querySelectorAll(".delete-item").forEach(btn => {
			btn.addEventListener("click", (e) => {
				const itemId = (e.currentTarget as HTMLElement).dataset.itemId;
				if (itemId) this.deleteItem(itemId);
			});
		});
	}

	private showMessage(message: string, type: "success" | "error") {
		// Create and show a temporary message
		const messageDiv = document.createElement("div");
		messageDiv.className = `message ${type}`;
		messageDiv.textContent = message;
		
		const header = this.element.querySelector(".admin-header");
		header?.appendChild(messageDiv);
		
		setTimeout(() => {
			messageDiv.remove();
		}, 3000);
	}

	destroy() {
		// Cleanup if needed
	}
}
