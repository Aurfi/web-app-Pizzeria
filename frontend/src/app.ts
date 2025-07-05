import { BottomNav } from "./components/BottomNav";
import { FooterBar } from "./components/Footer";
import { Header } from "./components/header";
import { CartPage } from "./pages/CartPage";
import { HomePage } from "./pages/HomePage";
import { MenuPage } from "./pages/MenuPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProfilePage } from "./pages/ProfilePage";
// Admin pages are dynamically imported to avoid loading them on initial app render
import { AuthService } from "./services/auth";
import { brandingService } from "./services/branding";
import { Router } from "./utils/router";

export class App {
	private router: Router;
	private header: Header;
	private bottomNav: BottomNav;
	private footer: FooterBar;
	private container: HTMLElement;

	constructor() {
		this.router = new Router();
		this.header = new Header();
		this.bottomNav = new BottomNav();
		this.footer = new FooterBar();
		this.container = document.createElement("main");
		this.container.className = "app-main";
	}

  async initialize() {
    const appElement = document.querySelector<HTMLDivElement>("#app")!;

		appElement.innerHTML = "";
    appElement.appendChild(this.header.render());
    // Navigation buttons at the top (below header)
    appElement.appendChild(this.bottomNav.render());
    // Main content
    appElement.appendChild(this.container);
    // Phone + legal at the bottom
    appElement.appendChild(await this.footer.render());

		this.setupRoutes();
		this.setupEventListeners();

    // Respect current URL including query params (e.g., /menu?category=..)
    await this.router.handleCurrent();
  }

	private setupRoutes() {
		this.router.addRoute("/", () => {
			this.showMainNavigation();
			const homePage = new HomePage();
			this.renderPage(homePage.render());
		});

		this.router.addRoute("/menu", () => {
			this.showMainNavigation();
			const menuPage = new MenuPage();
			this.renderPage(menuPage.render());
		});

		this.router.addRoute("/cart", () => {
			this.showMainNavigation();
			const cartPage = new CartPage();
			this.renderPage(cartPage.render());
		});

		this.router.addRoute("/orders", async () => {
			if (!AuthService.isAuthenticated()) {
				this.router.navigate("/login");
				return;
			}
			this.showMainNavigation();
			const ordersPage = new OrdersPage();
			this.renderPage(await ordersPage.render());
		});

		this.router.addRoute("/profile", async () => {
			if (!AuthService.isAuthenticated()) {
				this.router.navigate("/login");
				return;
			}
			this.showMainNavigation();
			const profilePage = new ProfilePage();
			this.renderPage(await profilePage.render());
		});

		this.router.addRoute("/login", () => {
			this.showMainNavigation();
			this.renderLoginPage();
		});

		this.router.addRoute("/register", () => {
			this.showMainNavigation();
			this.renderRegisterPage();
		});

		this.router.addRoute("/mentions", () => {
			this.showMainNavigation();
			import("./pages/MentionsPage").then(({ MentionsPage }) => {
				const page = new MentionsPage();
				this.renderPage(page.render());
			});
		});

		this.router.addRoute("/admin/login", () => {
			this.renderAdminLoginPage();
		});

		this.router.addRoute("/admin/dashboard", async () => {
			if (!this.isAdminAuthenticated()) {
				this.router.navigate("/admin/login");
				return;
			}
			this.renderAdminDashboard();
		});

		this.router.addRoute("/admin/menu", async () => {
			if (!this.isAdminAuthenticated()) {
				this.router.navigate("/admin/login");
				return;
			}
			this.renderAdminMenuPage();
		});

		this.router.addRoute("/admin/orders", async () => {
			if (!this.isAdminAuthenticated()) {
				this.router.navigate("/admin/login");
				return;
			}
			this.renderAdminOrdersPage();
		});


		this.router.addRoute("/admin/analytics", async () => {
			if (!this.isAdminAuthenticated()) {
				this.router.navigate("/admin/login");
				return;
			}
			this.renderAdminAnalyticsPage();
		});

		this.router.setNotFoundHandler(() => {
			this.render404Page();
		});
	}

	private setupEventListeners() {
		this.bottomNav.onNavigate((path: string) => {
			this.router.navigate(path);
		});

    window.addEventListener("popstate", () => {
      // Handle current URL without pushing a new history state
      this.router.handleCurrent();
    });
  }

	private renderPage(content: HTMLElement | string) {
		this.container.innerHTML = "";
		if (typeof content === "string") {
			this.container.innerHTML = content;
		} else {
			this.container.appendChild(content);
		}

		window.scrollTo(0, 0);
	}

	private renderLoginPage() {
		this.renderPage(`
      <div class="login-page">
        <div class="login-container">
          <h1>Bienvenue chez ${brandingService.restaurantName}</h1>
          <p>${brandingService.restaurantTagline}</p>
          <p>Connectez-vous pour accéder à vos commandes et à votre profil</p>
          <form id="login-form">
            <input type="email" id="login-email" placeholder="Email" required />
            <input type="password" id="login-password" placeholder="Mot de passe" required />
            <button type="submit" id="login-submit">Se connecter</button>
          </form>
          <div id="login-error" style="color: red; display: none; margin-top: 1rem;"></div>
          <p>Pas de compte ? <a href="/register">Inscrivez-vous</a></p>
          <p>Identifiants démo : ${(brandingService.demoCredentials?.email) || 'demo@mariospizzeria.com'} / ${(brandingService.demoCredentials?.password) || 'demo123'}</p>
        </div>
      </div>
    `);

		const form = document.getElementById("login-form");
		const emailInput = document.getElementById("login-email") as HTMLInputElement;
		const passwordInput = document.getElementById("login-password") as HTMLInputElement;
		const submitButton = document.getElementById("login-submit") as HTMLButtonElement;

		form?.addEventListener("submit", async (e) => {
			e.preventDefault();
			
			const email = emailInput.value;
			const password = passwordInput.value;
			
            if (!email || !password) {
            	this.showLoginError("Veuillez remplir tous les champs");
            	return;
            }

            submitButton.disabled = true;
            submitButton.textContent = "Connexion...";
			this.hideLoginError();

			try {
				await AuthService.login(email, password);
				this.router.navigate("/menu");
            } catch (error: any) {
            	this.showLoginError(error.message || "Échec de la connexion");
            } finally {
            	submitButton.disabled = false;
            	submitButton.textContent = "Se connecter";
            }
        });
	}

	private renderRegisterPage() {
		this.renderPage(`
		  <div class="login-page">
			<div class="login-container">
			  <h1>Créer un compte</h1>
			  <p>Rejoignez ${brandingService.restaurantName} en quelques secondes</p>
			  <form id="register-form">
				<input type="text" id="reg-first" placeholder="Prénom" required />
				<input type="text" id="reg-last" placeholder="Nom" required />
				<input type="email" id="reg-email" placeholder="Email" required />
				<input type="password" id="reg-password" placeholder="Mot de passe" required />
				<input type="tel" id="reg-phone" placeholder="Téléphone (optionnel)" />
				<small style="display:block;margin:6px 0;color:var(--text-secondary)">
				  Le mot de passe doit contenir au moins 8 caractères,
				  dont une majuscule, une minuscule et un chiffre.
				</small>
				<button type="submit" id="register-submit">Créer un compte</button>
			  </form>
			  <div id="register-error" style="color: red; display: none; margin-top: 1rem;"></div>
			  <p>Déjà un compte ? <a href="/login">Se connecter</a></p>
			</div>
		  </div>
		`);

		const form = document.getElementById("register-form");
		const firstInput = document.getElementById("reg-first") as HTMLInputElement;
		const lastInput = document.getElementById("reg-last") as HTMLInputElement;
		const emailInput = document.getElementById("reg-email") as HTMLInputElement;
		const passInput = document.getElementById("reg-password") as HTMLInputElement;
		const phoneInput = document.getElementById("reg-phone") as HTMLInputElement;
		const submitBtn = document.getElementById("register-submit") as HTMLButtonElement;

		form?.addEventListener("submit", async (e) => {
		  e.preventDefault();
		  const firstName = firstInput.value.trim();
		  const lastName = lastInput.value.trim();
		  const email = emailInput.value.trim();
		  const password = passInput.value;
		  const phone = phoneInput.value.trim();

		  if (!firstName || !lastName || !email || !password) {
			this.showRegisterError("Veuillez remplir tous les champs obligatoires");
			return;
		  }

		  submitBtn.disabled = true;
		  submitBtn.textContent = "Création...";
		  this.hideRegisterError();

		  try {
			await AuthService.register({ email, password, firstName, lastName, phone: phone || undefined });
			this.router.navigate("/menu");
		  } catch (error: any) {
			this.showRegisterError(error.message || "Échec de l'inscription");
		  } finally {
			submitBtn.disabled = false;
			submitBtn.textContent = "Créer un compte";
		  }
		});
	}

	private showRegisterError(message: string) {
		const el = document.getElementById("register-error");
		if (el) { el.textContent = message; el.style.display = "block"; }
	}

	private hideRegisterError() {
		const el = document.getElementById("register-error");
		if (el) { el.style.display = "none"; }
	}

	private showLoginError(message: string) {
		const errorDiv = document.getElementById("login-error");
		if (errorDiv) {
			errorDiv.textContent = message;
			errorDiv.style.display = "block";
		}
	}

	private hideLoginError() {
		const errorDiv = document.getElementById("login-error");
		if (errorDiv) {
			errorDiv.style.display = "none";
		}
	}

	private renderAdminLoginPage() {
		// Hide header and bottom nav for admin pages
		this.hideMainNavigation();

		import("./pages/AdminLoginPage").then(({ AdminLoginPage }) => {
			const adminLoginPage = new AdminLoginPage();
			this.renderPage(adminLoginPage.render());
		});
	}

	private async renderAdminDashboard() {
		// Hide header and bottom nav for admin pages
		this.hideMainNavigation();

		const { AdminDashboardPage } = await import("./pages/AdminDashboardPage");
		const adminDashboardPage = new AdminDashboardPage();
		this.renderPage(await adminDashboardPage.render());
	}

	private async renderAdminMenuPage() {
		// Hide header and bottom nav for admin pages
		this.hideMainNavigation();

		const { AdminMenuPage } = await import("./pages/AdminMenuPage");
		const adminMenuPage = new AdminMenuPage();
		this.renderPage(await adminMenuPage.render());
	}

	private async renderAdminOrdersPage() {
		// Hide header and bottom nav for admin pages
		this.hideMainNavigation();

		const { AdminOrdersPage } = await import("./pages/AdminOrdersPage");
		const adminOrdersPage = new AdminOrdersPage();
		this.renderPage(await adminOrdersPage.render());
	}


	private async renderAdminAnalyticsPage() {
		// Hide header and bottom nav for admin pages
		this.hideMainNavigation();

		const { AdminAnalyticsPage } = await import("./pages/AdminAnalyticsPage");
		const adminAnalyticsPage = new AdminAnalyticsPage();
		this.renderPage(await adminAnalyticsPage.render());
	}

	private isAdminAuthenticated(): boolean {
		const token = localStorage.getItem("adminToken");
		return !!token;
	}

	private hideMainNavigation() {
		const header = document.querySelector('.app-header') as HTMLElement;
		const bottomNav = document.querySelector('.bottom-nav') as HTMLElement;
		const appMain = document.querySelector('.app-main') as HTMLElement;
		
		if (header) header.style.display = 'none';
		if (bottomNav) bottomNav.style.display = 'none';
		if (appMain) {
			appMain.style.paddingTop = '0';
			appMain.style.paddingBottom = '0';
		}
	}

	private showMainNavigation() {
		const header = document.querySelector('.app-header') as HTMLElement;
		const bottomNav = document.querySelector('.bottom-nav') as HTMLElement;
		const appMain = document.querySelector('.app-main') as HTMLElement;
		
		if (header) header.style.display = 'flex';
		if (bottomNav) bottomNav.style.display = 'flex';
		if (appMain) {
			appMain.style.paddingTop = 'var(--header-height)';
			appMain.style.paddingBottom = 'var(--bottom-nav-height)';
		}
	}

	private render404Page() {
		this.renderPage(`
      <div class="error-page">
        <h1>404</h1>
        <p>Page not found</p>
        <button onclick="window.history.back()">Go Back</button>
      </div>
    `);
	}
}
