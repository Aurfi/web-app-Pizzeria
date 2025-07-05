import { CartService } from "../services/cart";
import { t } from "../services/i18n";

export class BottomNav {
	private element: HTMLElement;
	private navigationCallback?: (path: string) => void;

	constructor() {
		this.element = document.createElement("nav");
		this.element.className = "bottom-nav";
	}

	render(): HTMLElement {
		this.update();

		CartService.onChange(() => this.updateCartBadge());

		return this.element;
	}

	onNavigate(callback: (path: string) => void) {
		this.navigationCallback = callback;
	}

	private update() {
		const currentPath = window.location.pathname;

		this.element.innerHTML = `
      <div class="nav-container">
        <button class="nav-item ${currentPath === "/" ? "active" : ""}" data-path="/">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>${t('navigation.home')}</span>
        </button>
        
        <button class="nav-item ${currentPath === "/menu" ? "active" : ""}" data-path="/menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16v16H4z"></path>
            <path d="M9 9h6v6H9z"></path>
          </svg>
          <span>${t('navigation.menu')}</span>
        </button>
        
        <button class="nav-item ${currentPath === "/cart" ? "active" : ""}" data-path="/cart">
          <div class="nav-icon-wrapper">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span class="cart-badge hidden"></span>
          </div>
          <span>${t('navigation.cart')}</span>
        </button>
        
        <button class="nav-item ${currentPath === "/orders" ? "active" : ""}" data-path="/orders">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>${t('navigation.orders')}</span>
        </button>
        
        <button class="nav-item ${currentPath === "/profile" ? "active" : ""}" data-path="/profile">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>${t('navigation.profile')}</span>
        </button>
      </div>
    `;

		this.setupEventListeners();
		this.updateCartBadge();
	}

	private setupEventListeners() {
		this.element.querySelectorAll(".nav-item").forEach((item) => {
			item.addEventListener("click", (e) => {
				e.preventDefault();
				const path = item.getAttribute("data-path");
				if (path && this.navigationCallback) {
					this.navigationCallback(path);
				}
			});
		});
	}

	private updateCartBadge() {
		const badge = this.element.querySelector(".cart-badge");
		if (badge) {
			const count = CartService.getItemCount();
			if (count > 0) {
				badge.textContent = count > 99 ? "99+" : count.toString();
				badge.classList.remove("hidden");
			} else {
				badge.classList.add("hidden");
			}
		}
	}
}
