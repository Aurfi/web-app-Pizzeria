import axios from "axios";
import { getOrders, saveOrder } from "../services/database";
import { t } from "../services/i18n";
import { brandingService } from "../services/branding";

export class OrdersPage {
	private orders: any[] = [];

	async render(): Promise<HTMLElement> {
		const container = document.createElement("div");
		container.className = "orders-page";

		container.innerHTML = `
      <div class="orders-header">
        <h1>${t('orders.title')}</h1>
        <div class="order-filters">
          <button class="filter-btn active" data-status="">${t('orders.filters.all')}</button>
          <button class="filter-btn" data-status="pending">${t('orders.filters.pending')}</button>
          <button class="filter-btn" data-status="confirmed">${t('orders.filters.active')}</button>
          <button class="filter-btn" data-status="delivered">${t('orders.filters.completed')}</button>
        </div>
      </div>
      
      <div class="orders-list" id="orders-list">
        <div class="loading">${t('orders.loadingOrders')}</div>
      </div>
    `;

		this.setupEventListeners(container);
		await this.loadOrders(container);

		return container;
	}

	private setupEventListeners(container: HTMLElement) {
		container.querySelectorAll(".filter-btn").forEach((btn) => {
			btn.addEventListener("click", async () => {
				container.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
				btn.classList.add("active");

				const status = btn.getAttribute("data-status");
				await this.loadOrders(container, status || undefined);
			});
		});
	}

	private async loadOrders(container: HTMLElement, status?: string) {
		try {
			let url = "/api/orders";
			if (status) {
				url += `?status=${status}`;
			}

			const response = await axios.get(url);
			this.orders = response.data.orders;

			for (const order of this.orders) {
				await saveOrder(order);
			}

			this.renderOrders(container);
		} catch (error) {
			console.error("Failed to load orders:", error);
			await this.loadOfflineOrders(container);
		}
	}

	private async loadOfflineOrders(container: HTMLElement) {
		try {
			const offlineOrders = await getOrders();
			if (offlineOrders.length > 0) {
				this.orders = offlineOrders;
				this.renderOrders(container);

				const notice = document.createElement("div");
				notice.className = "offline-notice";
        notice.textContent = t('orders.offlineNotice');
				container.insertBefore(notice, container.querySelector("#orders-list"));
			} else {
				const listContainer = container.querySelector("#orders-list");
				if (listContainer) {
        listContainer.innerHTML = `<p class="no-orders">${t('orders.empty.title')}</p>`;
				}
			}
		} catch (error) {
			console.error("Failed to load offline orders:", error);
		}
	}

	private renderOrders(container: HTMLElement) {
		const listContainer = container.querySelector("#orders-list");
		if (!listContainer) return;

		if (this.orders.length === 0) {
			listContainer.innerHTML = `
        <div class="no-orders">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <h2>${t('orders.empty.title')}</h2>
          <p>${t('orders.empty.subtitle')}</p>
          <button class="browse-menu-btn" data-action="browse-menu">${t('orders.empty.cta')}</button>
        </div>
      `;

			const browseBtn = listContainer.querySelector('[data-action="browse-menu"]');
			if (browseBtn) {
				browseBtn.addEventListener("click", () => {
					window.history.pushState({}, "", "/menu");
					window.dispatchEvent(new PopStateEvent("popstate"));
				});
			}
			return;
		}

		listContainer.innerHTML = this.orders
			.map(
				(order) => `
      <div class="order-card" data-order-id="${order.id}">
        <div class="order-header">
          <div class="order-info">
            <h3>${t('orders.orderNumber', { id: order.id.substring(0, 8) })}</h3>
            <p class="order-date">${new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
          </div>
          <div class="order-status ${order.status}">
            ${this.getStatusIcon(order.status)}
            <span>${this.formatStatus(order.status)}</span>
          </div>
        </div>
        
        <div class="order-items">
          ${
						order.items
							? order.items
									.slice(0, 3)
									.map(
										(item: any) => `
            <div class="order-item">
              <span>${item.quantity}x ${item.menuItem?.name || "Item"}</span>
              <span>${item.totalPrice?.toFixed(2) || "0.00"}€</span>
            </div>
          `,
									)
									.join("")
							: ""
					}
          ${
						order.items && order.items.length > 3
							? `
            <p class="more-items">+${order.items.length - 3} articles de plus</p>
          `
							: ""
					}
        </div>
        
        <div class="order-footer">
          <div class="order-total">
            ${t('cart.summary.total')}: ${brandingService.formatPrice(order.totalAmount || 0)}
          </div>
          <div class="order-actions">
            ${
							order.status === "delivered"
								? `
              <button class="reorder-btn" data-order-id="${order.id}">${t('orders.actions.reorder')}</button>
            `
								: order.status === "pending" || order.status === "confirmed"
									? `
              <button class="track-btn" data-order-id="${order.id}">${t('orders.actions.track')}</button>
            `
									: ""
						}
            <button class="view-details-btn" data-order-id="${order.id}">${t('orders.actions.viewDetails')}</button>
          </div>
        </div>
      </div>
    `,
			)
			.join("");

		this.setupOrderEventListeners(listContainer);
	}

	private setupOrderEventListeners(container: Element) {
		container.querySelectorAll(".track-btn").forEach((btn) => {
			btn.addEventListener("click", () => {
				const orderId = btn.getAttribute("data-order-id");
				this.showTrackingModal(orderId!);
			});
		});

		container.querySelectorAll(".reorder-btn").forEach((btn) => {
			btn.addEventListener("click", async () => {
				const orderId = btn.getAttribute("data-order-id");
				await this.reorder(orderId!);
			});
		});

		container.querySelectorAll(".view-details-btn").forEach((btn) => {
			btn.addEventListener("click", () => {
				const orderId = btn.getAttribute("data-order-id");
				this.showOrderDetails(orderId!);
			});
		});
	}

	private showTrackingModal(orderId: string) {
		const order = this.orders.find((o) => o.id === orderId);
		if (!order) return;

		const modal = document.createElement("div");
		modal.className = "tracking-modal";
		modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${t('orders.tracking.title', { id: orderId.substring(0, 8) })}</h2>
          <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="tracking-timeline">
            <div class="timeline-item ${order.status === "pending" || order.status === "confirmed" || order.status === "preparing" || order.status === "ready" || order.status === "out_for_delivery" || order.status === "delivered" ? "completed" : ""}">
              <div class="timeline-icon">✓</div>
              <div class="timeline-content">
                <h4>${t('orders.tracking.timeline.placed')}</h4>
                <p>${new Date(order.createdAt).toLocaleString('fr-FR')}</p>
              </div>
            </div>
            
            <div class="timeline-item ${order.status === "confirmed" || order.status === "preparing" || order.status === "ready" || order.status === "out_for_delivery" || order.status === "delivered" ? "completed" : ""}">
              <div class="timeline-icon">✓</div>
              <div class="timeline-content">
                <h4>${t('orders.tracking.timeline.confirmed')}</h4>
                <p>${t('orders.tracking.timeline.confirmedDesc')}</p>
              </div>
            </div>
            
            <div class="timeline-item ${order.status === "preparing" || order.status === "ready" || order.status === "out_for_delivery" || order.status === "delivered" ? "completed" : ""}">
              <div class="timeline-icon">🍳</div>
              <div class="timeline-content">
                <h4>${t('orders.tracking.timeline.preparing')}</h4>
                <p>${t('orders.tracking.timeline.preparingDesc')}</p>
              </div>
            </div>
            
            <div class="timeline-item ${order.status === "out_for_delivery" || order.status === "delivered" ? "completed" : ""}">
              <div class="timeline-icon">🚗</div>
              <div class="timeline-content">
                <h4>${t('orders.tracking.timeline.outForDelivery')}</h4>
                <p>${t('orders.tracking.timeline.outForDeliveryDesc')}</p>
              </div>
            </div>
            
            <div class="timeline-item ${order.status === "delivered" ? "completed" : ""}">
              <div class="timeline-icon">📦</div>
              <div class="timeline-content">
                <h4>${t('orders.tracking.timeline.delivered')}</h4>
                <p>${order.actualDeliveryTime ? new Date(order.actualDeliveryTime).toLocaleString('fr-FR') : t('orders.tracking.timeline.estimated', { time: order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleString('fr-FR') : 'Bientôt' })}</p>
              </div>
            </div>
          </div>
          
          ${
						order.deliveryAddress
							? `
            <div class="delivery-info">
              <h4>${t('checkout.confirm.deliveryAddress')}</h4>
              <p>${order.deliveryAddress.streetAddress}</p>
              <p>${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.postalCode}</p>
            </div>
          `
							: ""
					}
        </div>
      </div>
    `;

		document.body.appendChild(modal);

		const closeModal = () => modal.remove();

		modal.querySelector(".modal-overlay")?.addEventListener("click", closeModal);
		modal.querySelector(".close-modal")?.addEventListener("click", closeModal);

		requestAnimationFrame(() => {
			modal.classList.add("active");
		});
	}

	private async reorder(orderId: string) {
		const order = this.orders.find((o) => o.id === orderId);
		if (!order || !order.items) return;

		alert("Articles ajoutés au panier !");

		window.history.pushState({}, "", "/cart");
		window.dispatchEvent(new PopStateEvent("popstate"));
	}

	private showOrderDetails(orderId: string) {
		const order = this.orders.find((o) => o.id === orderId);
		if (!order) return;

		const modal = document.createElement("div");
		modal.className = "order-details-modal";
		modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${t('orders.details.title')}</h2>
          <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <h3>${t('orders.orderNumber', { id: orderId.substring(0, 8) })}</h3>
            <p>${t('orders.details.placedOn', { date: new Date(order.createdAt).toLocaleDateString('fr-FR') })}</p>
            <p>${t('orders.details.status')}: <span class="status-badge ${order.status}">${this.formatStatus(order.status)}</span></p>
          </div>
          
          <div class="detail-section">
            <h3>${t('orders.details.items')}</h3>
            ${
							order.items
								? order.items
										.map(
											(item: any) => `
              <div class="detail-item">
                <div>
                  <strong>${item.quantity}x ${item.menuItem?.name || "Item"}</strong>
                  ${
										item.selectedOptions && item.selectedOptions.length > 0
											? `
                    <p class="item-options">${item.selectedOptions.map((opt: any) => opt.selectedValue).join(", ")}</p>
                  `
											: ""
									}
                  ${
										item.specialInstructions
											? `
                    <p class="special-instructions">"${item.specialInstructions}"</p>
                  `
											: ""
									}
                </div>
                <span>${brandingService.formatPrice(item.totalPrice || 0)}</span>
              </div>
            `,
										)
										.join("")
								: "<p>No items</p>"
						}
          </div>
          
          <div class="detail-section">
            <h3>${t('orders.details.paymentSummary')}</h3>
            <div class="summary-row">
              <span>${t('cart.summary.subtotal')}</span>
              <span>${brandingService.formatPrice(order.subtotal || 0)}</span>
            </div>
            <div class="summary-row">
              <span>${t('cart.summary.deliveryFee')}</span>
              <span>${brandingService.formatPrice(order.deliveryFee || 0)}</span>
            </div>
            <div class="summary-row">
              <span>${t('cart.summary.tax')}</span>
              <span>${brandingService.formatPrice(order.taxAmount || 0)}</span>
            </div>
            <div class="summary-row total">
              <span>${t('cart.summary.total')}</span>
              <span>${brandingService.formatPrice(order.totalAmount || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

		document.body.appendChild(modal);

		const closeModal = () => modal.remove();

		modal.querySelector(".modal-overlay")?.addEventListener("click", closeModal);
		modal.querySelector(".close-modal")?.addEventListener("click", closeModal);

		requestAnimationFrame(() => {
			modal.classList.add("active");
		});
	}

	private getStatusIcon(status: string): string {
		const icons: Record<string, string> = {
			pending: "⏳",
			confirmed: "✅",
			preparing: "🍳",
			ready: "✨",
			out_for_delivery: "🚗",
			delivered: "✓",
			cancelled: "❌",
		};
		return icons[status] || "📦";
	}

  private formatStatus(status: string): string {
    const map: Record<string, string> = {
      pending: t('orders.status.pending'),
      confirmed: t('orders.status.confirmed'),
      preparing: t('orders.status.preparing'),
      ready: t('orders.status.ready'),
      out_for_delivery: t('orders.status.outForDelivery'),
      delivered: t('orders.status.delivered'),
      cancelled: t('orders.status.cancelled')
    };
    return map[status] || status;
  }
}
