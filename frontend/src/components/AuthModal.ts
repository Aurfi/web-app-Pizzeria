export class AuthModal {
	private modal: HTMLElement | null = null;
	private isLogin = true;

	constructor() {
		this.createModal();
	}

	private createModal() {
		const modalHTML = `
      <div id="auth-modal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modal-title">Sign In</h2>
            <button class="modal-close">&times;</button>
          </div>
          <form id="auth-form">
            <div id="name-field" class="form-group" style="display: none;">
              <label for="name">Full Name</label>
              <input type="text" id="name" name="name" placeholder="John Doe">
              <span class="error-message" id="name-error"></span>
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" name="email" placeholder="email@example.com" required>
              <span class="error-message" id="email-error"></span>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <input type="password" id="password" name="password" placeholder="••••••••" required>
              <span class="error-message" id="password-error"></span>
            </div>
            <div id="confirm-password-field" class="form-group" style="display: none;">
              <label for="confirm-password">Confirm Password</label>
              <input type="password" id="confirm-password" name="confirmPassword" placeholder="••••••••">
              <span class="error-message" id="confirm-password-error"></span>
            </div>
            <button type="submit" class="btn btn-primary btn-block" id="submit-btn">Sign In</button>
            <div class="form-footer">
              <p id="toggle-text">
                Don't have an account? 
                <a href="#" id="toggle-mode">Sign Up</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    `;

		// Add modal to DOM
		const modalContainer = document.createElement("div");
		modalContainer.innerHTML = modalHTML;
		document.body.appendChild(modalContainer.firstElementChild as HTMLElement);

		this.modal = document.getElementById("auth-modal");
		this.attachEventListeners();
		this.addStyles();
	}

	private attachEventListeners() {
		const closeBtn = this.modal?.querySelector(".modal-close");
		const toggleBtn = document.getElementById("toggle-mode");
		const form = document.getElementById("auth-form");

		closeBtn?.addEventListener("click", () => this.close());

		this.modal?.addEventListener("click", (e) => {
			if (e.target === this.modal) {
				this.close();
			}
		});

		toggleBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			this.toggleMode();
		});

		form?.addEventListener("submit", (e) => this.handleSubmit(e));
	}

	private toggleMode() {
		this.isLogin = !this.isLogin;

		const title = document.getElementById("modal-title");
		const nameField = document.getElementById("name-field");
		const confirmPasswordField = document.getElementById("confirm-password-field");
		const submitBtn = document.getElementById("submit-btn");
		const toggleText = document.getElementById("toggle-text");

		if (this.isLogin) {
			if (title) title.textContent = "Sign In";
			if (nameField) nameField.style.display = "none";
			if (confirmPasswordField) confirmPasswordField.style.display = "none";
			if (submitBtn) submitBtn.textContent = "Sign In";
			if (toggleText) {
				toggleText.innerHTML = `Don't have an account? <a href="#" id="toggle-mode">Sign Up</a>`;
			}
		} else {
			if (title) title.textContent = "Sign Up";
			if (nameField) nameField.style.display = "block";
			if (confirmPasswordField) confirmPasswordField.style.display = "block";
			if (submitBtn) submitBtn.textContent = "Sign Up";
			if (toggleText) {
				toggleText.innerHTML = `Already have an account? <a href="#" id="toggle-mode">Sign In</a>`;
			}
		}

		// Re-attach toggle listener
		const newToggle = document.getElementById("toggle-mode");
		newToggle?.addEventListener("click", (e) => {
			e.preventDefault();
			this.toggleMode();
		});

		// Clear errors
		this.clearErrors();
	}

	private async handleSubmit(e: Event) {
		e.preventDefault();

		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);

		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const name = formData.get("name") as string;
		const confirmPassword = formData.get("confirmPassword") as string;

		// Clear previous errors
		this.clearErrors();

		// Validate
		let hasError = false;

		if (!email || !this.validateEmail(email)) {
			this.showError("email", "Please enter a valid email");
			hasError = true;
		}

		if (!password || password.length < 8) {
			this.showError("password", "Password must be at least 8 characters");
			hasError = true;
		}

		if (!this.isLogin) {
			if (!name || name.length < 2) {
				this.showError("name", "Please enter your full name");
				hasError = true;
			}

			if (password !== confirmPassword) {
				this.showError("confirm-password", "Passwords do not match");
				hasError = true;
			}
		}

		if (hasError) return;

		// Show loading state
		const submitBtn = document.getElementById("submit-btn") as HTMLButtonElement;
		const originalText = submitBtn.textContent;
		submitBtn.disabled = true;
		submitBtn.textContent = "Loading...";

		try {
			if (this.isLogin) {
				await this.login(email, password);
			} else {
				await this.register(email, password, name);
			}
			this.close();
			window.location.reload();
		} catch (error: any) {
			this.showError("email", error.message || "An error occurred");
		} finally {
			submitBtn.disabled = false;
			submitBtn.textContent = originalText;
		}
	}

	private async login(email: string, password: string) {
		const response = await fetch("/api/auth/login", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email, password }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Login failed");
		}

		const data = await response.json();

		// Store tokens and user data
		localStorage.setItem("accessToken", data.accessToken);
		localStorage.setItem("refreshToken", data.refreshToken);
		localStorage.setItem("user", JSON.stringify(data.user));
	}

	private async register(email: string, password: string, name: string) {
		const response = await fetch("/api/auth/register", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ email, password, name }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Registration failed");
		}

		const data = await response.json();

		// Store tokens and user data
		localStorage.setItem("accessToken", data.accessToken);
		localStorage.setItem("refreshToken", data.refreshToken);
		localStorage.setItem("user", JSON.stringify(data.user));
	}

	private validateEmail(email: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	private showError(field: string, message: string) {
		const errorElement = document.getElementById(`${field}-error`);
		const inputElement = document.getElementById(field);

		if (errorElement) {
			errorElement.textContent = message;
			errorElement.style.display = "block";
		}

		if (inputElement) {
			inputElement.classList.add("error");
		}
	}

	private clearErrors() {
		const errorMessages = this.modal?.querySelectorAll(".error-message");
		errorMessages?.forEach((el) => {
			(el as HTMLElement).style.display = "none";
			(el as HTMLElement).textContent = "";
		});

		const inputs = this.modal?.querySelectorAll("input");
		inputs?.forEach((input) => {
			input.classList.remove("error");
		});
	}

	public open() {
		if (this.modal) {
			this.modal.style.display = "flex";
			// Reset to login mode
			this.isLogin = true;
			this.toggleMode();
			this.toggleMode();
		}
	}

	public close() {
		if (this.modal) {
			this.modal.style.display = "none";
			this.clearErrors();
			// Reset form
			const form = document.getElementById("auth-form") as HTMLFormElement;
			form?.reset();
		}
	}

	private addStyles() {
		const style = document.createElement("style");
		style.textContent = `
      .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        align-items: center;
        justify-content: center;
      }

      .modal-content {
        background-color: white;
        padding: 0;
        border-radius: 12px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #111827;
      }

      .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background-color 0.2s;
      }

      .modal-close:hover {
        background-color: #f3f4f6;
      }

      #auth-form {
        padding: 1.5rem;
      }

      .form-group {
        margin-bottom: 1.5rem;
      }

      .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #374151;
      }

      .form-group input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.2s;
      }

      .form-group input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .form-group input.error {
        border-color: #ef4444;
      }

      .error-message {
        display: none;
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.25rem;
      }

      .btn-block {
        width: 100%;
      }

      .form-footer {
        margin-top: 1.5rem;
        text-align: center;
      }

      .form-footer p {
        color: #6b7280;
        margin: 0;
      }

      .form-footer a {
        color: #3b82f6;
        text-decoration: none;
        font-weight: 500;
      }

      .form-footer a:hover {
        text-decoration: underline;
      }
    `;
		document.head.appendChild(style);
	}
}

// Export singleton instance
export const authModal = new AuthModal();
