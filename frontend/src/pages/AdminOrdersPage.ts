import { Page } from "../types/index";

interface OrderItem {
	id: string;
	name: string;
	quantity: number;
	unitPrice: number;
	subtotal: number;
}

interface Order {
	id: string;
	status: string;
	subtotal: number;
	tax: number;
	deliveryFee: number;
	total: number;
	notes?: string;
	estimatedDeliveryTime?: string;
	actualDeliveryTime?: string;
	createdAt: string;
	updatedAt: string;
	customer: {
		name: string;
		email: string;
		phone?: string;
	};
	deliveryAddress?: string;
	itemCount: number;
	items?: OrderItem[];
}

interface OrderFilters {
	status?: string;
	date?: string;
	customer?: string;
	page: number;
	limit: number;
}

export class AdminOrdersPage implements Page {
	private element: HTMLElement;
	private orders: Order[] = [];
	private filters: OrderFilters = { page: 1, limit: 20 };
	private totalPages = 1;

	constructor() {
		this.element = document.createElement("div");
		this.element.className = "admin-orders-page";
	}

	async render(): Promise<HTMLElement> {
		await this.loadOrders();
		
		this.element.innerHTML = `
			<div class="admin-orders-container">
				<div class="admin-header">
					<h1 class="admin-title">Gestion des Commandes</h1>
					<div class="admin-actions">
						<button class="btn secondary" id="refreshBtn">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M3 2v6h6M21 12a9 9 0 01-9 9 9 9 0 01-9-9 9 9 0 019-9c2.39 0 4.68.94 6.4 2.6l2.6 2.6"/>
							</svg>
							Actualiser
						</button>
						<button class="btn secondary" id="backToDashboard">
							← Retour au Tableau de Bord
						</button>
					</div>
				</div>

				<div class="orders-filters">
					<div class="filter-group">
						<label for="statusFilter">Statut:</label>
						<select id="statusFilter">
							<option value="">Tous les statuts</option>
							<option value="pending">En attente</option>
							<option value="confirmed">Confirmé</option>
							<option value="preparing">En préparation</option>
							<option value="ready">Prêt</option>
							<option value="out_for_delivery">En livraison</option>
							<option value="delivered">Livré</option>
							<option value="cancelled">Annulé</option>
						</select>
					</div>

					<div class="filter-group">
						<label for="dateFilter">Date:</label>
						<input type="date" id="dateFilter" />
					</div>

					<div class="filter-group">
						<label for="customerFilter">Client:</label>
						<input type="text" id="customerFilter" placeholder="Nom ou email du client" />
					</div>

					<button class="btn primary" id="applyFiltersBtn">Appliquer les filtres</button>
					<button class="btn secondary" id="clearFiltersBtn">Effacer</button>
				</div>

				<div class="orders-list">
					<div class="orders-header">
						<div class="order-summary">
							<span class="orders-count">${this.orders.length} commande(s)</span>
						</div>
					</div>

					<div class="orders-grid" id="ordersGrid">
						${this.renderOrders()}
					</div>

					${this.renderPagination()}
				</div>
			</div>

			<!-- Order Detail Modal -->
			<div class="order-details-modal" id="orderModal">
				<div class="modal-content">
					<div class="modal-header">
						<h2>Détails de la Commande</h2>
						<button class="modal-close" id="closeModal">×</button>
					</div>
					<div class="modal-body" id="orderDetails">
						<!-- Order details will be loaded here -->
					</div>
				</div>
			</div>
		`;

		this.setupEventListeners();
		return this.element;
	}

  private async loadOrders() {
    try {
      const token = localStorage.getItem("adminToken");
      const queryParams = new URLSearchParams();
			
			if (this.filters.status) queryParams.append('status', this.filters.status);
			if (this.filters.date) queryParams.append('date', this.filters.date);
			if (this.filters.customer) queryParams.append('customer', this.filters.customer);
			queryParams.append('page', this.filters.page.toString());
			queryParams.append('limit', this.filters.limit.toString());

      const response = await fetch(`/api/admin/orders?${queryParams.toString()}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.orders = data.orders;
        this.totalPages = data.pagination.totalPages;
      } else {
        console.error("Failed to load orders:", response.status);
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('adminToken');
          window.history.pushState({}, "", "/admin/login");
          window.dispatchEvent(new PopStateEvent("popstate"));
          return;
        }
        this.orders = [];
        this.totalPages = 1;
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      this.orders = [];
      this.totalPages = 1;
    }
  }

	private renderOrders(): string {
		if (this.orders.length === 0) {
			return `<div class="no-orders">Aucune commande trouvée</div>`;
		}

		return this.orders.map(order => `
			<div class="order-card" data-order-id="${order.id}">
				<div class="order-header">
					<div class="order-id">#${order.id}</div>
					<div class="order-status ${order.status}">
						${this.getStatusText(order.status)}
					</div>
					<div class="order-time">
						${new Date(order.createdAt).toLocaleString('fr-FR')}
					</div>
				</div>

				<div class="order-body">
					<div class="order-customer">
						<strong>${order.customer.name}</strong>
						<div class="customer-contact">
							${order.customer.email}
							${order.customer.phone ? `• ${order.customer.phone}` : ''}
						</div>
					</div>

					<div class="order-items-summary">
						${order.itemCount} article(s) • €${order.total.toFixed(2)}
					</div>

					${order.deliveryAddress ? `
						<div class="order-address">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
								<circle cx="12" cy="10" r="3"></circle>
							</svg>
							${order.deliveryAddress}
						</div>
					` : ''}

					${order.notes ? `
						<div class="order-notes">
							<strong>Notes:</strong> ${order.notes}
						</div>
					` : ''}
				</div>

				<div class="order-actions">
					<button class="btn small primary view-order" data-order-id="${order.id}">
						Voir Détails
					</button>
					<select class="status-select" data-order-id="${order.id}">
						<option value="">Changer le statut</option>
						<option value="pending" ${order.status === 'pending' ? 'selected' : ''}>En attente</option>
						<option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmé</option>
						<option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>En préparation</option>
						<option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Prêt</option>
						<option value="out_for_delivery" ${order.status === 'out_for_delivery' ? 'selected' : ''}>En livraison</option>
						<option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Livré</option>
						<option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulé</option>
					</select>
				</div>
			</div>
		`).join('');
	}

	private renderPagination(): string {
		if (this.totalPages <= 1) return '';

		const currentPage = this.filters.page;
		let pages = [];

		// Always show first page
		if (currentPage > 3) {
			pages.push(1);
			if (currentPage > 4) pages.push('...');
		}

		// Show pages around current page
		for (let i = Math.max(1, currentPage - 2); i <= Math.min(this.totalPages, currentPage + 2); i++) {
			pages.push(i);
		}

		// Always show last page
		if (currentPage < this.totalPages - 2) {
			if (currentPage < this.totalPages - 3) pages.push('...');
			pages.push(this.totalPages);
		}

		return `
			<div class="pagination">
				<button class="pagination-btn" id="prevPage" ${currentPage <= 1 ? 'disabled' : ''}>
					Précédent
				</button>
				
				${pages.map(page => 
					page === '...' ? 
						'<span class="pagination-dots">...</span>' :
						`<button class="pagination-btn ${page === currentPage ? 'active' : ''}" data-page="${page}">
							${page}
						</button>`
				).join('')}
				
				<button class="pagination-btn" id="nextPage" ${currentPage >= this.totalPages ? 'disabled' : ''}>
					Suivant
				</button>
			</div>
		`;
	}

	private getStatusText(status: string): string {
		const statusMap: {[key: string]: string} = {
			'pending': 'En attente',
			'confirmed': 'Confirmé',
			'preparing': 'En préparation',
			'ready': 'Prêt',
			'out_for_delivery': 'En livraison',
			'delivered': 'Livré',
			'cancelled': 'Annulé'
		};
		return statusMap[status] || status;
	}

	private setupEventListeners() {
		// Back to dashboard
		const backBtn = this.element.querySelector("#backToDashboard");
		backBtn?.addEventListener("click", () => {
			window.history.pushState({}, "", "/admin/dashboard");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		// Refresh button
		const refreshBtn = this.element.querySelector("#refreshBtn");
		refreshBtn?.addEventListener("click", () => {
			this.refreshOrders();
		});

		// Apply filters
		const applyFiltersBtn = this.element.querySelector("#applyFiltersBtn");
		applyFiltersBtn?.addEventListener("click", () => {
			this.applyFilters();
		});

		// Clear filters
		const clearFiltersBtn = this.element.querySelector("#clearFiltersBtn");
		clearFiltersBtn?.addEventListener("click", () => {
			this.clearFilters();
		});

		// View order details
		this.element.querySelectorAll(".view-order").forEach(btn => {
			btn.addEventListener("click", (e) => {
				const orderId = (e.currentTarget as HTMLElement).dataset.orderId;
				if (orderId) this.viewOrderDetails(orderId);
			});
		});

		// Status change
		this.element.querySelectorAll(".status-select").forEach(select => {
			select.addEventListener("change", (e) => {
				const target = e.target as HTMLSelectElement;
				const orderId = target.dataset.orderId;
				const newStatus = target.value;
				if (orderId && newStatus) {
					this.updateOrderStatus(orderId, newStatus);
				}
			});
		});

		// Pagination
		this.element.querySelectorAll(".pagination-btn[data-page]").forEach(btn => {
			btn.addEventListener("click", (e) => {
				const page = parseInt((e.currentTarget as HTMLElement).dataset.page!);
				this.goToPage(page);
			});
		});

		const prevBtn = this.element.querySelector("#prevPage");
		prevBtn?.addEventListener("click", () => {
			if (this.filters.page > 1) this.goToPage(this.filters.page - 1);
		});

		const nextBtn = this.element.querySelector("#nextPage");
		nextBtn?.addEventListener("click", () => {
			if (this.filters.page < this.totalPages) this.goToPage(this.filters.page + 1);
		});

		// Modal close
		const closeModal = this.element.querySelector("#closeModal");
		closeModal?.addEventListener("click", () => {
			this.closeModal();
		});

		// Close modal on background click
		const modal = this.element.querySelector("#orderModal");
		modal?.addEventListener("click", (e) => {
			if (e.target === modal) this.closeModal();
		});
	}

	private async refreshOrders() {
		const refreshBtn = this.element.querySelector("#refreshBtn") as HTMLButtonElement;
		refreshBtn.disabled = true;
		refreshBtn.textContent = "Actualisation...";

		await this.loadOrders();
		this.updateOrdersGrid();

		refreshBtn.disabled = false;
		refreshBtn.innerHTML = `
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 2v6h6M21 12a9 9 0 01-9 9 9 9 0 01-9-9 9 9 0 019-9c2.39 0 4.68.94 6.4 2.6l2.6 2.6"/>
			</svg>
			Actualiser
		`;
	}

	private async applyFilters() {
		this.filters.status = (this.element.querySelector("#statusFilter") as HTMLSelectElement).value;
		this.filters.date = (this.element.querySelector("#dateFilter") as HTMLInputElement).value;
		this.filters.customer = (this.element.querySelector("#customerFilter") as HTMLInputElement).value;
		this.filters.page = 1; // Reset to first page

		await this.loadOrders();
		this.updateOrdersGrid();
	}

	private async clearFilters() {
		(this.element.querySelector("#statusFilter") as HTMLSelectElement).value = "";
		(this.element.querySelector("#dateFilter") as HTMLInputElement).value = "";
		(this.element.querySelector("#customerFilter") as HTMLInputElement).value = "";

		this.filters = { page: 1, limit: 20 };
		await this.loadOrders();
		this.updateOrdersGrid();
	}

	private async goToPage(page: number) {
		this.filters.page = page;
		await this.loadOrders();
		this.updateOrdersGrid();
	}

	private updateOrdersGrid() {
		const ordersGrid = this.element.querySelector("#ordersGrid");
		if (ordersGrid) {
			ordersGrid.innerHTML = this.renderOrders();
			this.setupOrderEventListeners();
		}

		const ordersCount = this.element.querySelector(".orders-count");
		if (ordersCount) {
			ordersCount.textContent = `${this.orders.length} commande(s)`;
		}

		const paginationContainer = this.element.querySelector(".pagination");
		if (paginationContainer?.parentNode) {
			(paginationContainer.parentNode as HTMLElement).innerHTML = this.renderPagination();
			this.setupPaginationEventListeners();
		}
	}

	private setupOrderEventListeners() {
		this.element.querySelectorAll(".view-order").forEach(btn => {
			btn.addEventListener("click", (e) => {
				const orderId = (e.currentTarget as HTMLElement).dataset.orderId;
				if (orderId) this.viewOrderDetails(orderId);
			});
		});

		this.element.querySelectorAll(".status-select").forEach(select => {
			select.addEventListener("change", (e) => {
				const target = e.target as HTMLSelectElement;
				const orderId = target.dataset.orderId;
				const newStatus = target.value;
				if (orderId && newStatus) {
					this.updateOrderStatus(orderId, newStatus);
				}
			});
		});
	}

	private setupPaginationEventListeners() {
		this.element.querySelectorAll(".pagination-btn[data-page]").forEach(btn => {
			btn.addEventListener("click", (e) => {
				const page = parseInt((e.currentTarget as HTMLElement).dataset.page!);
				this.goToPage(page);
			});
		});

		const prevBtn = this.element.querySelector("#prevPage");
		prevBtn?.addEventListener("click", () => {
			if (this.filters.page > 1) this.goToPage(this.filters.page - 1);
		});

		const nextBtn = this.element.querySelector("#nextPage");
		nextBtn?.addEventListener("click", () => {
			if (this.filters.page < this.totalPages) this.goToPage(this.filters.page + 1);
		});
	}

	private async viewOrderDetails(orderId: string) {
		try {
			const token = localStorage.getItem("adminToken");
			const response = await fetch(`/api/admin/orders/${orderId}`, {
				headers: {
					"Authorization": `Bearer ${token}`
				}
			});

			if (response.ok) {
				const data = await response.json();
				this.showOrderModal(data.order);
			} else {
				this.showMessage("Erreur lors du chargement des détails", "error");
			}
		} catch (error) {
			console.error("Error loading order details:", error);
			this.showMessage("Erreur lors du chargement des détails", "error");
		}
	}

	private showOrderModal(order: any) {
		const orderDetails = this.element.querySelector("#orderDetails");
		if (orderDetails) {
			orderDetails.innerHTML = `
				<div class="order-detail-section">
					<h3>Information de la Commande</h3>
					<div class="detail-grid">
						<div><strong>ID:</strong> #${order.id}</div>
						<div><strong>Statut:</strong> ${this.getStatusText(order.status)}</div>
						<div><strong>Créé le:</strong> ${new Date(order.createdAt).toLocaleString('fr-FR')}</div>
						<div><strong>Modifié le:</strong> ${new Date(order.updatedAt).toLocaleString('fr-FR')}</div>
					</div>
				</div>

				<div class="order-detail-section">
					<h3>Client</h3>
					<div class="detail-grid">
						<div><strong>Nom:</strong> ${order.customer.name}</div>
						<div><strong>Email:</strong> ${order.customer.email}</div>
						${order.customer.phone ? `<div><strong>Téléphone:</strong> ${order.customer.phone}</div>` : ''}
					</div>
				</div>

				${order.deliveryAddress ? `
					<div class="order-detail-section">
						<h3>Adresse de Livraison</h3>
						<p>${order.deliveryAddress.street}</p>
						${order.deliveryAddress.apartment ? `<p>Apt: ${order.deliveryAddress.apartment}</p>` : ''}
						<p>${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zipCode}</p>
					</div>
				` : ''}

				<div class="order-detail-section">
					<h3>Articles Commandés</h3>
					<div class="order-items-detail">
						${order.items.map((item: any) => `
							<div class="item-detail">
								<div class="item-info">
									<span class="item-name">${item.name}</span>
									<span class="item-quantity">x${item.quantity}</span>
								</div>
								<div class="item-price">€${item.subtotal.toFixed(2)}</div>
							</div>
						`).join('')}
					</div>
				</div>

				<div class="order-detail-section">
					<h3>Résumé de la Commande</h3>
					<div class="order-totals">
						<div class="total-line">
							<span>Sous-total:</span>
							<span>€${order.subtotal.toFixed(2)}</span>
						</div>
						<div class="total-line">
							<span>Taxes:</span>
							<span>€${order.tax.toFixed(2)}</span>
						</div>
						<div class="total-line">
							<span>Frais de livraison:</span>
							<span>€${order.deliveryFee.toFixed(2)}</span>
						</div>
						<div class="total-line total">
							<span><strong>Total:</strong></span>
							<span><strong>€${order.total.toFixed(2)}</strong></span>
						</div>
					</div>
				</div>

				${order.notes ? `
					<div class="order-detail-section">
						<h3>Notes</h3>
						<p>${order.notes}</p>
					</div>
				` : ''}
			`;
		}

		const modal = this.element.querySelector("#orderModal") as HTMLElement;
		modal.classList.add('active');
}

	private closeModal() {
		const modal = this.element.querySelector("#orderModal") as HTMLElement;
		modal.classList.remove('active');
	}

	private async updateOrderStatus(orderId: string, newStatus: string) {
		try {
			const token = localStorage.getItem("adminToken");
			const response = await fetch(`/api/admin/orders/${orderId}/status`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${token}`
				},
				body: JSON.stringify({ status: newStatus })
			});

			if (response.ok) {
				await this.loadOrders();
				this.updateOrdersGrid();
				this.showMessage("Statut de la commande mis à jour", "success");
			} else {
				const errorData = await response.json();
				throw new Error(errorData.error || "Erreur lors de la mise à jour");
			}
		} catch (error) {
			console.error("Error updating order status:", error);
			this.showMessage(`Erreur: ${error.message}`, "error");
			// Reset the select to previous value
			await this.loadOrders();
			this.updateOrdersGrid();
		}
	}

	private showMessage(message: string, type: "success" | "error") {
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
