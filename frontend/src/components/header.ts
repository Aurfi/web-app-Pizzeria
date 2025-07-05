import { AuthService } from "../services/auth";
import { brandingService } from "../services/branding";
import { i18n, t } from "../services/i18n";

export class Header {
	private element: HTMLElement;

	constructor() {
		this.element = document.createElement("header");
		this.element.className = "app-header";
	}

	render(): HTMLElement {
		this.update();

		AuthService.onChange(() => this.update());
		brandingService.onChange(() => this.update());

		window.addEventListener("online", () => this.updateConnectionStatus());
		window.addEventListener("offline", () => this.updateConnectionStatus());

		return this.element;
	}

	private update() {
		const user = AuthService.getUser();

		this.element.innerHTML = `
      <div class="header-container">
        <div class="header-left">
          <button class="menu-toggle" aria-label="Menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="header-center">
          <h1 class="app-title">${brandingService.restaurantName}</h1>
        </div>
        
        <div class="header-right">
          <div class="connection-status" id="connection-status"></div>
          ${
						user
							? `
            <button class="notification-btn" aria-label="Notifications">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span class="notification-badge hidden">0</span>
            </button>
          `
							: ""
					}
          <button class="language-btn" aria-label="Change Language">
            <span class="flag ${i18n.getLanguage() === 'fr' ? 'flag-fr' : 'flag-uk'}"></span>
          </button>
          <button class="owner-btn" aria-label="Owner Access">
            <span class="owner-text">${t('navigation.owner')}</span>
          </button>
        </div>
      </div>
    `;

		this.updateConnectionStatus();
		this.setupEventListeners();
	}

	private updateConnectionStatus() {
		const statusElement = this.element.querySelector("#connection-status");
		if (statusElement) {
			if (!navigator.onLine) {
				statusElement.innerHTML = `
            <span class="offline-indicator">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M1 9l2-2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l2 2V2L1 2z"/>
              </svg>
              ${t('offline.indicator')}
            </span>
        `;
			} else {
				statusElement.innerHTML = "";
			}
		}
	}

	private setupEventListeners() {
		const menuToggle = this.element.querySelector(".menu-toggle");
		if (menuToggle) {
			menuToggle.addEventListener("click", () => {
				this.toggleSideMenu();
			});
		}

		const languageBtn = this.element.querySelector(".language-btn");
		if (languageBtn) {
			languageBtn.addEventListener("click", () => {
				this.openLanguageSelector();
			});
		}

		const notificationBtn = this.element.querySelector(".notification-btn");
		if (notificationBtn) {
			notificationBtn.addEventListener("click", () => {
				this.openNotifications();
			});
		}

		const ownerBtn = this.element.querySelector(".owner-btn");
		if (ownerBtn) {
			ownerBtn.addEventListener("click", () => {
				this.navigateToOwnerLogin();
			});
		}
	}

	private toggleSideMenu() {
		const existingMenu = document.querySelector(".side-menu");
		if (existingMenu) {
			existingMenu.remove();
			return;
		}

		const sideMenu = document.createElement("div");
		sideMenu.className = "side-menu";
		sideMenu.innerHTML = `
      <div class="side-menu-overlay"></div>
      <div class="side-menu-content">
        <div class="side-menu-header">
          <h2>${t('navigation.menu')}</h2>
          <button class="close-menu">×</button>
        </div>
        <nav class="side-menu-nav">
          <a href="/" class="side-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            ${t('navigation.home')}
          </a>
          <a href="/menu" class="side-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 4h16v16H4z"></path>
              <path d="M9 9h6v6H9z"></path>
            </svg>
            ${t('navigation.menu')}
          </a>
          <a href="/orders" class="side-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            ${t('navigation.orders')}
          </a>
          <a href="/profile" class="side-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            ${t('navigation.profile')}
          </a>
          <hr>
          <a href="/settings" class="side-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6m0 6v6m4.22-13.22 4.24 4.24M1.54 12l6m6 6 4.24 4.24"></path>
            </svg>
            ${t('navigation.settings')}
          </a>
          <a href="/help" class="side-menu-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            ${t('navigation.help')}
          </a>
        </nav>
      </div>
    `;

		document.body.appendChild(sideMenu);

		const overlay = sideMenu.querySelector(".side-menu-overlay");
		const closeBtn = sideMenu.querySelector(".close-menu");

		const closeSideMenu = () => sideMenu.remove();

		overlay?.addEventListener("click", closeSideMenu);
		closeBtn?.addEventListener("click", closeSideMenu);

		sideMenu.querySelectorAll(".side-menu-item").forEach((item) => {
			item.addEventListener("click", (e) => {
				e.preventDefault();
				const href = item.getAttribute("href");
				if (href) {
					window.history.pushState({}, "", href);
					window.dispatchEvent(new PopStateEvent("popstate"));
				}
				closeSideMenu();
			});
		});

		requestAnimationFrame(() => {
			sideMenu.classList.add("active");
		});
	}

	private openLanguageSelector() {
		// Close any existing dropdown
		const existingDropdown = document.querySelector(".language-dropdown");
		if (existingDropdown) {
			existingDropdown.remove();
			return;
		}

		const languageBtn = this.element.querySelector(".language-btn") as HTMLElement;
		const rect = languageBtn.getBoundingClientRect();
		
		const supportedLanguages = [
			{ code: "fr", name: "Français", flagClass: "flag-fr" },
			{ code: "en", name: "English", flagClass: "flag-uk" }
		];

		const currentLang = i18n.getLanguage();
		const otherLanguage = supportedLanguages.find(lang => lang.code !== currentLang);

		if (!otherLanguage) return;

		const dropdown = document.createElement("div");
		dropdown.className = "language-dropdown";
		dropdown.style.position = "fixed";
		dropdown.style.top = `${rect.bottom + 8}px`;
		dropdown.style.right = `${window.innerWidth - rect.right}px`;
		dropdown.innerHTML = `
			<button class="language-option" data-lang="${otherLanguage.code}">
				<span class="flag ${otherLanguage.flagClass}"></span>
				<span class="language-name">${otherLanguage.name}</span>
			</button>
		`;

		document.body.appendChild(dropdown);

		const option = dropdown.querySelector(".language-option");
		option?.addEventListener("click", async () => {
			const langCode = option.getAttribute("data-lang");
			if (langCode) {
				await i18n.setLanguage(langCode);
				dropdown.remove();
				// Trigger a page refresh to update all translations
				window.location.reload();
			}
		});

		// Close on outside click
		const handleOutsideClick = (e: Event) => {
			if (!dropdown.contains(e.target as Node) && !languageBtn.contains(e.target as Node)) {
				dropdown.remove();
				document.removeEventListener("click", handleOutsideClick);
			}
		};
		
		setTimeout(() => {
			document.addEventListener("click", handleOutsideClick);
		}, 100);

		// Add animation
		requestAnimationFrame(() => {
			dropdown.classList.add("active");
		});
	}

	private openNotifications() {
		console.log("Opening notifications");
	}

	private navigateToOwnerLogin() {
		window.history.pushState({}, "", "/admin/login");
		window.dispatchEvent(new PopStateEvent("popstate"));
	}
}
