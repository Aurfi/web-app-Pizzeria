import axios from "axios";
import { AuthService } from "../services/auth";
import { t } from "../services/i18n";

export class ProfilePage {
	private addresses: any[] = [];

	async render(): Promise<HTMLElement> {
		const container = document.createElement("div");
		container.className = "profile-page";

		const user = AuthService.getUser();

		if (!user) {
			container.innerHTML = this.renderNotLoggedIn();
			this.setupEventListeners(container);
			return container;
		}

		container.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">
          <span>${user.firstName[0]}${user.lastName[0]}</span>
        </div>
        <h1>${user.firstName} ${user.lastName}</h1>
        <p>${user.email}</p>
      </div>
      
      <div class="profile-sections">
        <div class="profile-section">
          <h2>${t('profile.sections.personalInfo')}</h2>
          <form id="profile-form">
            <div class="form-group">
              <label>${t('profile.form.firstName')}</label>
              <input type="text" name="firstName" value="${user.firstName}" required>
            </div>
            <div class="form-group">
              <label>${t('profile.form.lastName')}</label>
              <input type="text" name="lastName" value="${user.lastName}" required>
            </div>
            <div class="form-group">
              <label>${t('profile.form.email')}</label>
              <input type="email" value="${user.email}" disabled>
            </div>
            <div class="form-group">
              <label>${t('profile.form.phone')}</label>
              <input type="tel" name="phone" value="${user.phone || ""}" placeholder="${t('profile.form.phone')}">
            </div>
            <button type="submit" class="save-btn">${t('profile.form.saveChanges')}</button>
          </form>
        </div>
        
        <div class="profile-section">
          <h2>${t('profile.sections.addresses')}</h2>
          <div class="addresses-list" id="addresses-list">
            <div class="loading">${t('common.loading')}</div>
          </div>
          <button class="add-address-btn">${t('profile.addresses.addNew')}</button>
        </div>
        
        <div class="profile-section">
          <h2>${t('profile.sections.security')}</h2>
          <button class="change-password-btn">${t('profile.password.change')}</button>
        </div>
        
        <div class="profile-section">
          <h2>${t('profile.sections.preferences')}</h2>
          <div class="preferences">
            <label class="preference-item">
              <input type="checkbox" checked>
              <span>${t('profile.preferences.emailNotifications')}</span>
            </label>
            <label class="preference-item">
              <input type="checkbox" checked>
              <span>${t('profile.preferences.pushNotifications')}</span>
            </label>
            <label class="preference-item">
              <input type="checkbox">
              <span>${t('profile.preferences.smsNotifications')}</span>
            </label>
          </div>
        </div>
        
        <div class="profile-section">
          <button class="logout-btn">${t('navigation.signOut')}</button>
        </div>
      </div>
    `;

		this.setupEventListeners(container);
		await this.loadAddresses(container);

		return container;
	}

	private renderNotLoggedIn(): string {
    return `
      <div class="not-logged-in">
        <h2>${t('profile.notLoggedIn.title')}</h2>
        <p>${t('profile.notLoggedIn.subtitle')}</p>
        <button class="login-btn" data-action="login">${t('profile.notLoggedIn.cta')}</button>
      </div>
    `;
	}

	private setupEventListeners(container: HTMLElement) {
		container.querySelector('[data-action="login"]')?.addEventListener("click", () => {
			window.history.pushState({}, "", "/login");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		const profileForm = container.querySelector("#profile-form");
		if (profileForm) {
			profileForm.addEventListener("submit", async (e) => {
				e.preventDefault();
				await this.updateProfile(profileForm as HTMLFormElement);
			});
		}

		container.querySelector(".add-address-btn")?.addEventListener("click", () => {
			this.showAddAddressModal();
		});

		container.querySelector(".change-password-btn")?.addEventListener("click", () => {
			this.showChangePasswordModal();
		});

		container.querySelector(".logout-btn")?.addEventListener("click", async () => {
    if (confirm(t('profile.signOutConfirm'))) {
				await AuthService.logout();
				window.history.pushState({}, "", "/");
				window.dispatchEvent(new PopStateEvent("popstate"));
			}
		});
	}

	private async updateProfile(form: HTMLFormElement) {
		try {
			const formData = new FormData(form);
			const updates = {
				firstName: formData.get("firstName") as string,
				lastName: formData.get("lastName") as string,
				phone: formData.get("phone") as string,
			};

			await AuthService.updateProfile(updates);

			const btn = form.querySelector(".save-btn") as HTMLButtonElement;
      if (btn) {
        btn.textContent = t('profile.form.saved');
        btn.classList.add("success");
        setTimeout(() => {
          btn.textContent = t('profile.form.saveChanges');
          btn.classList.remove("success");
        }, 2000);
      }
		} catch (_error) {
			alert("Échec de la mise à jour du profil");
		}
	}

	private async loadAddresses(container: HTMLElement) {
		try {
			const response = await axios.get("/api/users/addresses");
			this.addresses = response.data;
			this.renderAddresses(container);
		} catch (error) {
        console.error("Échec du chargement des adresses:", error);
			const listContainer = container.querySelector("#addresses-list");
			if (listContainer) {
          listContainer.innerHTML = "<p>Échec du chargement des adresses</p>";
			}
		}
	}

	private renderAddresses(container: HTMLElement) {
		const listContainer = container.querySelector("#addresses-list");
		if (!listContainer) return;

		if (this.addresses.length === 0) {
      listContainer.innerHTML = `<p>${t('profile.addresses.noAddresses')}</p>`;
			return;
		}

		listContainer.innerHTML = this.addresses
			.map(
				(address) => `
      <div class="address-card ${address.isDefault ? "default" : ""}">
        ${address.isDefault ? `<span class="default-badge">${t('profile.addresses.default')}</span>` : ""}
        ${address.label ? `<h4>${address.label}</h4>` : ""}
        <p>${address.streetAddress}</p>
        <p>${address.city}, ${address.state} ${address.postalCode}</p>
        <div class="address-actions">
          <button class="edit-address-btn" data-address-id="${address.id}">${t('profile.addresses.edit')}</button>
          <button class="delete-address-btn" data-address-id="${address.id}">${t('profile.addresses.delete')}</button>
        </div>
      </div>
    `,
			)
			.join("");

		listContainer.querySelectorAll(".edit-address-btn").forEach((btn) => {
			btn.addEventListener("click", () => {
				const addressId = btn.getAttribute("data-address-id");
				const address = this.addresses.find((a) => a.id === addressId);
				if (address) {
					this.showEditAddressModal(address);
				}
			});
		});

		listContainer.querySelectorAll(".delete-address-btn").forEach((btn) => {
			btn.addEventListener("click", async () => {
				const addressId = btn.getAttribute("data-address-id");
    if (confirm(t('profile.addresses.deleteConfirm'))) {
					await this.deleteAddress(addressId!);
				}
			});
		});
	}

	private showAddAddressModal() {
		const modal = document.createElement("div");
		modal.className = "address-modal";
		modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>Add New Address</h2>
          <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
          <form id="address-form">
            <div class="form-group">
              <label>Label (Optional)</label>
              <input type="text" name="label" placeholder="${t('profile.addresses.labelPlaceholder')}">
            </div>
            <div class="form-group">
              <label>Street Address</label>
              <input type="text" name="streetAddress" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>City</label>
                <input type="text" name="city" required>
              </div>
              <div class="form-group">
                <label>State</label>
                <input type="text" name="state" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>ZIP Code</label>
                <input type="text" name="postalCode" required>
              </div>
              <div class="form-group">
                <label>Country</label>
                <input type="text" name="country" value="US" required>
              </div>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="isDefault">
                Set as default address
              </label>
            </div>
            <button type="submit" class="save-address-btn">Save Address</button>
          </form>
        </div>
      </div>
    `;

		document.body.appendChild(modal);

		const closeModal = () => modal.remove();

		modal.querySelector(".modal-overlay")?.addEventListener("click", closeModal);
		modal.querySelector(".close-modal")?.addEventListener("click", closeModal);

		const form = modal.querySelector("#address-form");
		if (form) {
			form.addEventListener("submit", async (e) => {
				e.preventDefault();
				await this.saveAddress(form as HTMLFormElement);
				closeModal();
			});
		}

		requestAnimationFrame(() => {
			modal.classList.add("active");
		});
	}

	private showEditAddressModal(address: any) {
		const modal = document.createElement("div");
		modal.className = "address-modal";
		modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>Edit Address</h2>
          <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
          <form id="address-form">
            <div class="form-group">
              <label>Label (Optional)</label>
              <input type="text" name="label" value="${address.label || ""}" placeholder="${t('profile.addresses.labelPlaceholder')}">
            </div>
            <div class="form-group">
              <label>Street Address</label>
              <input type="text" name="streetAddress" value="${address.streetAddress}" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>City</label>
                <input type="text" name="city" value="${address.city}" required>
              </div>
              <div class="form-group">
                <label>State</label>
                <input type="text" name="state" value="${address.state}" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>ZIP Code</label>
                <input type="text" name="postalCode" value="${address.postalCode}" required>
              </div>
              <div class="form-group">
                <label>Country</label>
                <input type="text" name="country" value="${address.country || "US"}" required>
              </div>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" name="isDefault" ${address.isDefault ? "checked" : ""}>
                Set as default address
              </label>
            </div>
            <button type="submit" class="save-address-btn">Update Address</button>
          </form>
        </div>
      </div>
    `;

		document.body.appendChild(modal);

		const closeModal = () => modal.remove();

		modal.querySelector(".modal-overlay")?.addEventListener("click", closeModal);
		modal.querySelector(".close-modal")?.addEventListener("click", closeModal);

		const form = modal.querySelector("#address-form");
		if (form) {
			form.addEventListener("submit", async (e) => {
				e.preventDefault();
				await this.updateAddress(address.id, form as HTMLFormElement);
				closeModal();
			});
		}

		requestAnimationFrame(() => {
			modal.classList.add("active");
		});
	}

	private async saveAddress(form: HTMLFormElement) {
		try {
			const formData = new FormData(form);
			const addressData = {
				label: formData.get("label") as string,
				streetAddress: formData.get("streetAddress") as string,
				city: formData.get("city") as string,
				state: formData.get("state") as string,
				postalCode: formData.get("postalCode") as string,
				country: formData.get("country") as string,
				isDefault: formData.get("isDefault") === "on",
			};

			const response = await axios.post("/api/users/addresses", addressData);
			this.addresses.push(response.data);
			this.renderAddresses(document.querySelector(".profile-page")!);
		} catch (_error) {
			alert("Échec de l'enregistrement de l'adresse");
		}
	}

	private async updateAddress(addressId: string, form: HTMLFormElement) {
		try {
			const formData = new FormData(form);
			const addressData = {
				label: formData.get("label") as string,
				streetAddress: formData.get("streetAddress") as string,
				city: formData.get("city") as string,
				state: formData.get("state") as string,
				postalCode: formData.get("postalCode") as string,
				country: formData.get("country") as string,
				isDefault: formData.get("isDefault") === "on",
			};

			const response = await axios.put(`/api/users/addresses/${addressId}`, addressData);
			const index = this.addresses.findIndex((a) => a.id === addressId);
			if (index >= 0) {
				this.addresses[index] = response.data;
			}
			this.renderAddresses(document.querySelector(".profile-page")!);
		} catch (_error) {
			alert("Échec de la mise à jour de l'adresse");
		}
	}

	private async deleteAddress(addressId: string) {
		try {
			await axios.delete(`/api/users/addresses/${addressId}`);
			this.addresses = this.addresses.filter((a) => a.id !== addressId);
			this.renderAddresses(document.querySelector(".profile-page")!);
		} catch (_error) {
			alert("Échec de la suppression de l'adresse");
		}
	}

	private showChangePasswordModal() {
		const modal = document.createElement("div");
		modal.className = "password-modal";
		modal.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h2>Change Password</h2>
          <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
          <form id="password-form">
            <div class="form-group">
              <label>Current Password</label>
              <input type="password" name="currentPassword" required>
            </div>
            <div class="form-group">
              <label>New Password</label>
              <input type="password" name="newPassword" required minlength="8">
            </div>
            <div class="form-group">
              <label>Confirm New Password</label>
              <input type="password" name="confirmPassword" required>
            </div>
            <button type="submit" class="change-password-submit-btn">Change Password</button>
          </form>
        </div>
      </div>
    `;

		document.body.appendChild(modal);

		const closeModal = () => modal.remove();

		modal.querySelector(".modal-overlay")?.addEventListener("click", closeModal);
		modal.querySelector(".close-modal")?.addEventListener("click", closeModal);

		const form = modal.querySelector("#password-form");
		if (form) {
			form.addEventListener("submit", async (e) => {
				e.preventDefault();
				const formData = new FormData(form as HTMLFormElement);
				const newPassword = formData.get("newPassword") as string;
				const confirmPassword = formData.get("confirmPassword") as string;

				if (newPassword !== confirmPassword) {
					alert("Les mots de passe ne correspondent pas");
					return;
				}

				try {
					await AuthService.changePassword(formData.get("currentPassword") as string, newPassword);
					alert("Mot de passe modifié avec succès");
					closeModal();
				} catch (_error) {
					alert("Échec de la modification du mot de passe");
				}
			});
		}

		requestAnimationFrame(() => {
			modal.classList.add("active");
		});
	}
}
