import axios from "axios";
import { AuthService } from "../services/auth";
import { CartService } from "../services/cart";
import { t } from "../services/i18n";
import { brandingService } from "../services/branding";

export class CartPage {
  private appliedPromoCode: string | null = null;
  private promoDiscount: number = 0;
	render(): HTMLElement {
		const container = document.createElement("div");
		container.className = "cart-page";

		const items = CartService.getItems();

		if (items.length === 0) {
			container.innerHTML = this.renderEmptyCart();
		} else {
			container.innerHTML = this.renderCart();
		}

		this.setupEventListeners(container);

		CartService.onChange(() => {
			const items = CartService.getItems();
			if (items.length === 0) {
				container.innerHTML = this.renderEmptyCart();
			} else {
				container.innerHTML = this.renderCart();
			}
			this.setupEventListeners(container);
		});

		return container;
	}

	private renderEmptyCart(): string {
		return `
      <div class="empty-cart">
        <div class="empty-cart-icon">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </div>
        <h2>${t('cart.empty.title')}</h2>
        <p>${t('cart.empty.subtitle')}</p>
        <button class="browse-menu-btn" data-action="browse-menu">${t('cart.empty.cta')}</button>
      </div>
    `;
	}

	private renderCart(): string {
		const items = CartService.getItems();
		const subtotal = CartService.getSubtotal();
		const deliveryFee = CartService.getDeliveryFee();
		const tax = CartService.getTaxAmount();
		const taxRate = subtotal > 0 ? tax / subtotal : 0;
		const discount = this.promoDiscount > 0 ? this.promoDiscount : 0;
		const discountedSubtotal = Math.max(0, subtotal - discount);
		const taxAdj = discountedSubtotal * taxRate;
		const total = discountedSubtotal + deliveryFee + taxAdj;

		return `
      <div class="cart-content">
        <div class="cart-header">
          <h1>${t('cart.title')}</h1>
          <button class="clear-cart-btn">${t('cart.clearCart')}</button>
        </div>
        
        <div class="cart-items">
          ${items
						.map(
							(item) => `
            <div class="cart-item" data-item-id="${item.id}">
              <div class="cart-item-image">
                <img src="${item.image || "/images/placeholder.jpg"}" alt="${item.name}">
              </div>
              <div class="cart-item-details">
                <h3>${item.name}</h3>
                ${
									item.selectedOptions && item.selectedOptions.length > 0
										? `
                  <p class="item-options">
                    ${item.selectedOptions.map((opt: any) => opt.selectedValue).join(", ")}
                  </p>
                `
										: ""
								}

                <div class="item-price">${brandingService.formatPrice(item.price * item.quantity)}</div>
              </div>
              <div class="cart-item-actions">
                <div class="quantity-controls">
                  <button class="qty-btn" data-action="decrease" data-item-id="${item.id}">-</button>
                  <span class="quantity">${item.quantity}</span>
                  <button class="qty-btn" data-action="increase" data-item-id="${item.id}">+</button>
                </div>
                <button class="remove-item-btn" data-item-id="${item.id}">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          `,
						)
						.join("")}
        </div>
        
        <div class="promo-code-section">
          <input type="text" placeholder="${t('cart.promoCode')}" id="promo-code">
          <button class="apply-promo-btn">${t('cart.apply')}</button>
        </div>
        
        <div class="cart-summary">
          <div class="summary-row">
            <span>${t('cart.summary.subtotal')}</span>
            <span>${brandingService.formatPrice(subtotal)}</span>
          </div>
          ${discount > 0 ? `<div class="summary-row discount"><span>Remise (${this.appliedPromoCode})</span><span>- ${brandingService.formatPrice(discount)}</span></div>` : ''}
          <div class="summary-row">
            <span>${t('cart.summary.deliveryFee')}</span>
            <span>${brandingService.formatPrice(deliveryFee)}</span>
          </div>
          <div class="summary-row">
            <span>${t('cart.summary.tax')}</span>
            <span>${brandingService.formatPrice(taxAdj)}</span>
          </div>
          <div class="summary-row total">
            <span>${t('cart.summary.total')}</span>
            <span>${brandingService.formatPrice(total)}</span>
          </div>
        </div>
        
        <div class="checkout-section">
          ${
						!AuthService.isAuthenticated()
							? `
            <p class="login-prompt">${t('cart.checkout.signInRequired')}</p>
            <button class="login-btn" data-action="login">${t('auth.signIn')}</button>
          `
							: `
            <button class="checkout-btn" data-action="checkout">${t('cart.checkout.proceedToCheckout')}</button>
          `
					}
        </div>
      </div>
    `;
	}

	private setupEventListeners(container: HTMLElement) {
		container.querySelector('[data-action="browse-menu"]')?.addEventListener("click", () => {
			window.history.pushState({}, "", "/menu");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

    container.querySelector(".clear-cart-btn")?.addEventListener("click", async () => {
      if (confirm(t('cart.clearCartConfirm'))) {
        await CartService.clear();
      }
    });

		container.querySelectorAll(".qty-btn").forEach((btn) => {
			btn.addEventListener("click", async () => {
				const action = btn.getAttribute("data-action");
				const itemId = btn.getAttribute("data-item-id") || "";
				const item = CartService.getItems().find((i) => i.id === itemId);

				if (item) {
					const newQuantity =
						action === "increase" ? item.quantity + 1 : Math.max(0, item.quantity - 1);

					await CartService.updateItemQuantity(itemId, newQuantity);
				}
			});
		});

		container.querySelectorAll(".remove-item-btn").forEach((btn) => {
			btn.addEventListener("click", async () => {
				const itemId = btn.getAttribute("data-item-id") || "";
				await CartService.removeItem(itemId);
			});
		});

    container.querySelector(".apply-promo-btn")?.addEventListener("click", async () => {
      const code = ((container.querySelector("#promo-code") as HTMLInputElement)?.value || '').trim().toUpperCase();
      if (!code) return;

      if (!AuthService.isAuthenticated()) {
        alert('Veuillez vous connecter pour appliquer un code promo.');
        window.history.pushState({}, "", "/login");
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }

      try {
        // Check if user has previous orders
        const resp = await axios.get('/api/orders?limit=1');
        const hasOrder = Array.isArray(resp.data?.orders) && resp.data.orders.length > 0;
        if (code === 'WELCOME20' && !hasOrder) {
          this.appliedPromoCode = code;
          this.promoDiscount = parseFloat((CartService.getSubtotal() * 0.20).toFixed(2));
          // Re-render cart to reflect discount
          const root = container.closest('.cart-page');
          if (root) {
            root.innerHTML = this.renderCart();
            this.setupEventListeners(root as HTMLElement);
          }
          alert(t('cart.promoApplied', { code }));
        } else {
          alert('Code invalide ou non applicable. (Offre valable pour la première commande)');
        }
      } catch (e) {
        console.error('Promo validation failed', e);
        alert('Impossible de valider le code pour le moment.');
      }
    });

		container.querySelector('[data-action="login"]')?.addEventListener("click", () => {
			window.history.pushState({}, "", "/login");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		container.querySelector('[data-action="checkout"]')?.addEventListener("click", () => {
			this.proceedToCheckout();
		});
	}

	private async proceedToCheckout() {
		// Check business hours before allowing checkout
		const open = await this.isOpenNow();
		if (!open.open) {
			alert(`Le restaurant est fermé actuellement. Horaires aujourd'hui: ${open.window}`);
			return;
		}

		const modal = document.createElement("div");
		modal.className = "checkout-modal";
		modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>${t('checkout.title')}</h2>
          <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
          <div class="checkout-steps">
            <div class="step active" data-step="1">
              <span class="step-number">1</span>
              <span class="step-name">${t('checkout.steps.delivery')}</span>
            </div>
            <div class="step" data-step="2">
              <span class="step-number">2</span>
              <span class="step-name">${t('checkout.steps.payment')}</span>
            </div>
            <div class="step" data-step="3">
              <span class="step-number">3</span>
              <span class="step-name">${t('checkout.steps.confirm')}</span>
            </div>
          </div>
          
          <div class="step-content" id="step-content">
            ${this.renderDeliveryStep()}
          </div>
        </div>
      </div>
    `;

		document.body.appendChild(modal);

		const closeModal = () => modal.remove();

		modal.querySelector(".modal-overlay")?.addEventListener("click", closeModal);
		modal.querySelector(".close-modal")?.addEventListener("click", closeModal);

		this.setupCheckoutSteps(modal);

		requestAnimationFrame(() => {
			modal.classList.add("active");
		});
	}

	private async isOpenNow(): Promise<{ open: boolean; window: string }> {
		try {
			const resp = await fetch("/api/restaurant/hours");
			if (!resp.ok) return { open: true, window: "" }; // fail-open on API error
			const data = await resp.json();
			const hours = data.hours || {};
			const now = new Date();
			const jsDay = now.getDay(); // 0 Sun..6 Sat
			const dayKeys = [
				"monday",
				"tuesday",
				"wednesday",
				"thursday",
				"friday",
				"saturday",
				"sunday",
			];
			const todayKey = dayKeys[(jsDay + 6) % 7];
			const today = hours[todayKey] || { closed: true };
			const window = today.closed ? "Fermé" : `${today.open || ""} - ${today.close || ""}`;
			if (today.closed) return { open: false, window };
			const [oh, om] = (today.open || "00:00").split(":").map(Number);
			const [ch, cm] = (today.close || "00:00").split(":").map(Number);
			const minutesNow = now.getHours() * 60 + now.getMinutes();
			const openM = oh * 60 + om;
			const closeM = ch * 60 + cm;
			const isOpen = minutesNow >= openM && minutesNow < closeM;
			return { open: isOpen, window };
		} catch {
			return { open: true, window: "" };
		}
	}

	private renderDeliveryStep(): string {
		return `
      <div class="delivery-step">
        <h3>${t('checkout.delivery.title')}</h3>
        <form id="delivery-form" class="address-form">
          <input type="text" name="street" placeholder="${t('checkout.delivery.streetAddress')}" required>
          <div class="form-row">
            <input type="text" name="city" placeholder="${t('checkout.delivery.city')}" required>
            <input type="text" name="state" placeholder="${t('checkout.delivery.state')}" required>
          </div>
          <div class="form-row">
            <input type="text" name="zipCode" placeholder="${t('checkout.delivery.zipCode')}" required>
            <input type="text" name="country" placeholder="${t('checkout.delivery.country')}" value="FR" required>
          </div>
          <input type="tel" name="phone" placeholder="${t('checkout.delivery.phone')}" required>
          <textarea name="instructions" placeholder="${t('checkout.delivery.instructions')}"></textarea>
          <button type="submit" class="next-step-btn">${t('checkout.delivery.continueToPayment')}</button>
        </form>
      </div>
    `;
	}

	private renderPaymentStep(): string {
		return `
      <div class="payment-step">
        <h3>${t('checkout.payment.title')}</h3>
        <form id="payment-form">
          <div class="payment-options">
            <label>
              <input type="radio" name="payment" value="card" checked>
              <span>${t('checkout.payment.card')}</span>
            </label>
            <label>
              <input type="radio" name="payment" value="paypal">
              <span>${t('checkout.payment.paypal')}</span>
            </label>
            <label>
              <input type="radio" name="payment" value="cash">
              <span>${t('checkout.payment.cash')}</span>
            </label>
          </div>
          
          <div class="card-details">
            <input type="text" placeholder="${t('checkout.payment.cardNumber')}" pattern="[0-9]{16}" required>
            <div class="form-row">
              <input type="text" placeholder="${t('checkout.payment.expiryDate')}" pattern="[0-9]{2}/[0-9]{2}" required>
              <input type="text" placeholder="${t('checkout.payment.cvv')}" pattern="[0-9]{3,4}" required>
            </div>
            <input type="text" placeholder="${t('checkout.payment.cardholderName')}" required>
          </div>
          
          <button type="submit" class="next-step-btn">${t('checkout.payment.reviewOrder')}</button>
        </form>
      </div>
    `;
	}

	private renderConfirmStep(): string {
		const items = CartService.getItems();
		const total = CartService.getTotal();

		return `
      <div class="confirm-step">
        <h3>${t('checkout.confirm.title')}</h3>
        <div class="order-review">
          <div class="review-section">
            <h4>${t('checkout.confirm.items', { count: items.length })}</h4>
            ${items
							.map(
								(item) => `
              <div class="review-item">
                <span>${item.quantity}x ${item.name}</span>
              <span>${brandingService.formatPrice(item.price * item.quantity)}</span>
              </div>
            `,
							)
							.join("")}
          </div>
          
          <div class="review-section">
            <h4>${t('checkout.confirm.deliveryAddress')}</h4>
            <p>123 Main St, City, State 12345</p>
          </div>
          
          <div class="review-section">
            <h4>${t('checkout.confirm.paymentMethod')}</h4>
            <p>Credit Card ending in 4242</p>
          </div>
          
          <div class="review-total">
            <span>${t('cart.summary.total')}</span>
            <span>${brandingService.formatPrice(total)}</span>
          </div>
        </div>
        
        <button class="place-order-btn">${t('checkout.confirm.placeOrder')}</button>
      </div>
    `;
	}

	private setupCheckoutSteps(modal: HTMLElement) {
		const updateStep = (step: number) => {
			modal.querySelectorAll(".step").forEach((stepEl) => {
				const stepNum = parseInt(stepEl.getAttribute("data-step") || "0", 10);
				stepEl.classList.toggle("active", stepNum <= step);
			});

			const stepContent = modal.querySelector("#step-content");
			if (stepContent) {
				switch (step) {
					case 1:
						stepContent.innerHTML = this.renderDeliveryStep();
						break;
					case 2:
						stepContent.innerHTML = this.renderPaymentStep();
						break;
					case 3:
						stepContent.innerHTML = this.renderConfirmStep();
						break;
				}

				setupStepListeners();
			}
		};

		const setupStepListeners = () => {
			const deliveryForm = modal.querySelector("#delivery-form");
			if (deliveryForm) {
				deliveryForm.addEventListener("submit", (e) => {
					e.preventDefault();
					updateStep(2);
				});
			}

			const paymentForm = modal.querySelector("#payment-form");
			if (paymentForm) {
				paymentForm.addEventListener("submit", (e) => {
					e.preventDefault();
					updateStep(3);
				});
			}

			const placeOrderBtn = modal.querySelector(".place-order-btn");
			if (placeOrderBtn) {
				placeOrderBtn.addEventListener("click", async () => {
					await this.placeOrder();
					modal.remove();
				});
			}
		};

		setupStepListeners();
	}

	private getAddressFormData() {
		const form = document.querySelector('.address-form') as HTMLFormElement;
    if (!form) {
      throw new Error('address_form_not_found');
    }
		
		const formData = new FormData(form);
		return {
			street: formData.get('street') as string || '',
			city: formData.get('city') as string || '',
			state: formData.get('state') as string || '',
			zipCode: formData.get('zipCode') as string || '',
			country: formData.get('country') as string || 'US',
			phone: formData.get('phone') as string || '',
			instructions: formData.get('instructions') as string || ''
		};
	}

  private async placeOrder() {
		try {
			const items = CartService.getItems();

			const addressData = this.getAddressFormData();
			
			const orderData: any = {
				deliveryAddress: addressData,
				items: items.map((item) => ({
					menuItemId: item.menuItemId,
					quantity: item.quantity,
					selectedOptions: item.selectedOptions,

				})),
				specialInstructions: "",
			};

			if (this.appliedPromoCode) {
				orderData.promoCode = this.appliedPromoCode;
			}

			const response = await axios.post("/api/orders", orderData);

			await CartService.clear();

      alert(`${t('checkout.confirm.orderPlaced', { orderId: response.data.orderId })}`);

			window.history.pushState({}, "", "/orders");
			window.dispatchEvent(new PopStateEvent("popstate"));
		} catch (error) {
      console.error("Failed to place order:", error);
      alert(t('errors.generic'));
		}
	}
}
