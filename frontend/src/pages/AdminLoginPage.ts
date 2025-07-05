import { Page } from "../types/index";
import { i18n } from "../services/i18n";

export class AdminLoginPage implements Page {
	private element: HTMLElement;
	private isLoading = false;

	constructor() {
		this.element = document.createElement("div");
		this.element.className = "admin-login-page";
	}

	render(): HTMLElement {
		this.element.innerHTML = `
			<div class="admin-login-container">
				<div class="admin-login-card">
					<div class="admin-login-header">
						<div class="admin-logo">
							<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<circle cx="12" cy="7" r="4"></circle>
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
								<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
								<path d="M8 3.13a4 4 0 0 0 0 7.75"></path>
							</svg>
						</div>
						<h1 class="admin-title">Accès Propriétaire</h1>
						<p class="admin-subtitle">Connectez-vous au panneau d'administration de Mario's Pizzeria</p>
					</div>

					<form class="admin-login-form" id="adminLoginForm">
						<div class="error-message hidden" id="errorMessage"></div>

						<div class="form-group">
							<label for="email" class="form-label">Adresse email</label>
							<input 
								type="email" 
								id="email" 
								name="email" 
								class="form-input" 
								placeholder="admin@mariospizzeria.com"
								required
								autocomplete="email"
							>
							<div class="field-error hidden" id="emailError"></div>
						</div>

						<div class="form-group">
							<label for="password" class="form-label">Mot de passe</label>
							<div class="password-input-wrapper">
								<input 
									type="password" 
									id="password" 
									name="password" 
									class="form-input" 
									placeholder="Entrez votre mot de passe"
									required
									autocomplete="current-password"
								>
								<button type="button" class="password-toggle" id="passwordToggle">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
										<circle cx="12" cy="12" r="3"></circle>
									</svg>
								</button>
							</div>
							<div class="field-error hidden" id="passwordError"></div>
						</div>

						<button type="submit" class="admin-login-btn" id="loginBtn">
							<span class="btn-text">Se connecter</span>
							<div class="btn-spinner hidden">
								<div class="spinner"></div>
								Connexion...
							</div>
						</button>
					</form>

					<div class="demo-credentials">
						<div class="demo-title">Identifiants de démonstration:</div>
						<div class="demo-info">
							<div><strong>Email:</strong> admin@mariospizzeria.com</div>
							<div><strong>Mot de passe:</strong> admin123</div>
						</div>
					</div>

					<div class="back-to-site">
						<button class="back-btn" id="backBtn">← Retour au site</button>
					</div>
				</div>
			</div>
		`;

		this.setupEventListeners();
		return this.element;
	}

	private setupEventListeners() {
		const form = this.element.querySelector("#adminLoginForm") as HTMLFormElement;
		const passwordToggle = this.element.querySelector("#passwordToggle") as HTMLButtonElement;
		const passwordInput = this.element.querySelector("#password") as HTMLInputElement;
		const backBtn = this.element.querySelector("#backBtn") as HTMLButtonElement;

		// Form submission
		form?.addEventListener("submit", (e) => this.handleSubmit(e));

		// Password visibility toggle
		passwordToggle?.addEventListener("click", () => {
			const isPassword = passwordInput.type === "password";
			passwordInput.type = isPassword ? "text" : "password";
			
			passwordToggle.innerHTML = isPassword 
				? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94L6.06 6.06"></path>
						<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19l-3.15-3.15a3 3 0 0 0-4.24-4.24L9.9 4.24z"></path>
						<line x1="1" y1="1" x2="23" y2="23"></line>
					</svg>`
				: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
						<circle cx="12" cy="12" r="3"></circle>
					</svg>`;
		});

		// Back to site button
		backBtn?.addEventListener("click", () => {
			window.history.pushState({}, "", "/");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});
	}

	private async handleSubmit(e: Event) {
		e.preventDefault();
		
		if (this.isLoading) return;

		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		// Clear previous errors
		this.clearErrors();

		// Basic validation
		if (!email || !password) {
			this.showError("Veuillez remplir tous les champs requis");
			return;
		}

		if (!this.isValidEmail(email)) {
			this.showError("Veuillez entrer une adresse email valide");
			return;
		}

		this.setLoading(true);

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ email, password }),
			});

			const data = await response.json();

			if (response.ok) {
				// Store admin token
				localStorage.setItem("adminToken", data.accessToken);
				localStorage.setItem("adminUser", JSON.stringify(data.user));
				
				// Redirect to admin dashboard
				window.history.pushState({}, "", "/admin/dashboard");
				window.dispatchEvent(new PopStateEvent("popstate"));
			} else {
				this.showError(data.error || "Échec de la connexion. Vérifiez vos identifiants.");
			}
		} catch (error) {
			console.error("Login error:", error);
			this.showError("Erreur de connexion. Veuillez réessayer.");
		} finally {
			this.setLoading(false);
		}
	}

	private isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}

	private showError(message: string) {
		const errorElement = this.element.querySelector("#errorMessage") as HTMLElement;
		if (errorElement) {
			errorElement.textContent = message;
			errorElement.classList.remove("hidden");
		}
	}

	private clearErrors() {
		const errorElement = this.element.querySelector("#errorMessage") as HTMLElement;
		if (errorElement) {
			errorElement.classList.add("hidden");
		}
	}

	private setLoading(loading: boolean) {
		this.isLoading = loading;
		const loginBtn = this.element.querySelector("#loginBtn") as HTMLButtonElement;
		const btnText = loginBtn?.querySelector(".btn-text") as HTMLElement;
		const btnSpinner = loginBtn?.querySelector(".btn-spinner") as HTMLElement;

		if (loginBtn && btnText && btnSpinner) {
			loginBtn.disabled = loading;
			
			if (loading) {
				btnText.classList.add("hidden");
				btnSpinner.classList.remove("hidden");
			} else {
				btnText.classList.remove("hidden");
				btnSpinner.classList.add("hidden");
			}
		}
	}

	destroy() {
		// Cleanup if needed
	}
}