import { Page } from "../types/index";
import { brandingService } from "../services/branding";

export class AdminDashboardPage implements Page {
	private element: HTMLElement;
	private dashboardData: any = null;

	constructor() {
		this.element = document.createElement("div");
		this.element.className = "admin-dashboard-page";
	}

	async render(): Promise<HTMLElement> {
		await this.loadDashboardData();
		this.element.innerHTML = `
			<div class="admin-dashboard-container">
				<div class="admin-header">
					<div class="admin-header-content">
						<h1 class="admin-title">Tableau de Bord Administrateur</h1>
						<div class="admin-user-info">
							<button class="logout-btn" id="logoutBtn">Déconnexion</button>
						</div>
					</div>
				</div>

				<div class="admin-content">
					<div class="admin-stats-grid">
						<div class="stat-card">
							<div class="stat-icon">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
									<circle cx="8.5" cy="7" r="4"></circle>
									<line x1="20" y1="8" x2="20" y2="14"></line>
									<line x1="23" y1="11" x2="17" y2="11"></line>
								</svg>
							</div>
							<div class="stat-content">
								<h3 class="stat-number">${this.dashboardData?.stats?.today?.orders || 0}</h3>
								<p class="stat-label">Commandes Aujourd'hui</p>
							</div>
						</div>

						<div class="stat-card">
							<div class="stat-icon">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M3 3v18h18"/>
									<rect x="6" y="14" width="3" height="4"/>
									<rect x="11" y="10" width="3" height="8"/>
									<rect x="16" y="6" width="3" height="12"/>
								</svg>
							</div>
							<div class="stat-content">
								<h3 class="stat-number">${brandingService.formatPrice(this.dashboardData?.stats?.today?.revenue || 0)}</h3>
								<p class="stat-label">Revenus Aujourd'hui</p>
							</div>
						</div>

						<div class="stat-card">
							<div class="stat-icon">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<circle cx="12" cy="12" r="10"></circle>
									<polyline points="12,6 12,12 16,14"></polyline>
								</svg>
							</div>
							<div class="stat-content">
								<h3 class="stat-number">${brandingService.formatPrice(this.dashboardData?.stats?.today?.averageOrderValue || 0)}</h3>
								<p class="stat-label">Panier Moyen</p>
							</div>
						</div>

						<div class="stat-card">
							<div class="stat-icon">
								<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"></path>
									<rect x="9" y="11" width="6" height="9"></rect>
								</svg>
							</div>
							<div class="stat-content">
								<h3 class="stat-number">${this.dashboardData?.stats?.pending_orders || 0}</h3>
								<p class="stat-label">Commandes en Attente</p>
							</div>
						</div>
					</div>

					<div class="admin-actions-grid">
						<div class="action-section">
							<h2 class="section-title">Horaires d'ouverture</h2>
							<div class="action-buttons">
								<button class="action-btn primary" id="editHoursBtn">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<circle cx="12" cy="12" r="10"></circle>
										<polyline points="12,6 12,12 16,14"></polyline>
									</svg>
									Gérer les horaires
								</button>
							</div>
						</div>
						<div class="action-section">
							<h2 class="section-title">Gestion du Menu</h2>
							<div class="action-buttons">
								<button class="action-btn primary" id="manageMenuBtn">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M4 4h16v16H4z"></path>
										<path d="M9 9h6v6H9z"></path>
									</svg>
									Modifier le Menu
								</button>
								<!-- Bouton catégories supprimé -->
							</div>
						</div>

						<div class="action-section">
							<h2 class="section-title">Commandes</h2>
							<div class="action-buttons">
								<button class="action-btn primary" id="viewOrdersBtn">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
										<polyline points="14 2 14 8 20 8"></polyline>
									</svg>
									Voir les Commandes
								</button>
								<!-- Bouton historique supprimé -->
							</div>
						</div>

							<!-- Section Inventaire supprimée -->

						<div class="action-section">
							<h2 class="section-title">Rapports</h2>
							<div class="action-buttons">
								<button class="action-btn primary" id="analyticsBtn">
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M3 3v18h18M9 17V9l8 8"></path>
									</svg>
									Voir les rapports
								</button>
							</div>
						</div>
					</div>

					<div class="recent-orders">
						<h2 class="section-title">Commandes Récentes</h2>
						<div class="orders-table">
							<div class="order-row header">
								<div class="order-id">#ID</div>
								<div class="order-customer">Client</div>
								<div class="order-items">Articles</div>
								<div class="order-total">Total</div>
								<div class="order-status">Statut</div>
								<div class="order-time">Heure</div>
							</div>
							${this.renderRecentOrders()}
						</div>
					</div>
				</div>

				<!-- Modal Horaires -->
				<div class="address-modal" id="hoursModal">
					<div class="modal-content">
						<div class="modal-header">
							<h2>Horaires d'ouverture</h2>
							<button class="modal-close" id="closeHoursModal">×</button>
						</div>
          <div class="modal-body">
            <form id="hoursForm" class="hours-form">
                ${['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((k) => `
                  <div class=\"hours-row\" data-day=\"${k}\">
                    <label class=\"hours-day\">${{monday:'Lundi',tuesday:'Mardi',wednesday:'Mercredi',thursday:'Jeudi',friday:'Vendredi',saturday:'Samedi',sunday:'Dimanche'}[k]}</label>
                    <div class=\"intervals\" data-intervals=\"${k}\"></div>
                    <div class=\"row-actions\">
                      <button type=\"button\" class=\"btn small secondary add-interval\" data-day=\"${k}\">+ Ajouter un créneau</button>
                      <label class=\"closed-toggle\"><input type=\"checkbox\" name=\"${k}_closed\"> Fermé</label>
                    </div>
                  </div>
                `).join('')}
                <div class="form-actions" style="margin-top:12px;">
                  <button type="submit" class="btn primary">Enregistrer</button>
                </div>
            </form>
          </div>
					</div>
				</div>
			</div>
		`;

		this.setupEventListeners();
		return this.element;
	}

  private setupEventListeners() {
		// Logout button
		const logoutBtn = this.element.querySelector("#logoutBtn");
		logoutBtn?.addEventListener("click", () => {
			localStorage.removeItem("adminToken");
			localStorage.removeItem("adminUser");
			window.history.pushState({}, "", "/");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		// Menu management button - functional
		const manageMenuBtn = this.element.querySelector("#manageMenuBtn");
		manageMenuBtn?.addEventListener("click", () => {
			window.history.pushState({}, "", "/admin/menu");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		// Orders management button - functional
		const viewOrdersBtn = this.element.querySelector("#viewOrdersBtn");
		viewOrdersBtn?.addEventListener("click", () => {
			window.history.pushState({}, "", "/admin/orders");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		// Inventory actions supprimées

		// Analytics and reports buttons - functional
		// Bouton rapports consolidé sur analyticsBtn

		const analyticsBtn = this.element.querySelector("#analyticsBtn");
		analyticsBtn?.addEventListener("click", () => {
			window.history.pushState({}, "", "/admin/analytics");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		// Hours modal
		const hoursBtn = this.element.querySelector('#editHoursBtn');
		hoursBtn?.addEventListener('click', async () => {
			await this.openHoursModal();
		});

		// Action buttons - placeholder functionality for other buttons
		const actionButtons: Array<{id: string; message: string}> = [];

		actionButtons.forEach(({ id, message }) => {
			const btn = this.element.querySelector(`#${id}`);
			btn?.addEventListener("click", () => {
				alert(message);
			});
		});
  }

  private async openHoursModal() {
    const modal = this.element.querySelector('#hoursModal') as HTMLElement;
    const closeBtn = this.element.querySelector('#closeHoursModal') as HTMLElement;
    const form = this.element.querySelector('#hoursForm') as HTMLFormElement;

    // helpers for intervals UI
    const isValidTime = (v:string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.trim());
    const toMinutes = (v:string) => { const [h,m] = v.split(':').map(Number); return h*60 + m; };
    const setRowError = (row:HTMLElement, msg:string) => {
      let err = row.querySelector('.row-error') as HTMLElement | null;
      if (!err) {
        err = document.createElement('div');
        err.className = 'row-error';
        row.appendChild(err);
      }
      err.textContent = msg;
      err.style.display = msg ? 'block' : 'none';
    };
    const markInvalid = (el:HTMLInputElement, invalid:boolean) => {
      el.classList.toggle('invalid', invalid);
    };
    const validateRow = (row:HTMLElement): boolean => {
      const closed = (row.querySelector('input[type="checkbox"]') as HTMLInputElement)?.checked;
      if (closed) { setRowError(row, ''); row.querySelectorAll('input.hours-open, input.hours-close').forEach((i)=>i.classList.remove('invalid')); return true; }
      let ok = true;
      let message = '';
      const intervals = Array.from(row.querySelectorAll('.interval')) as HTMLElement[];
      for (const it of intervals) {
        const openI = it.querySelector('.hours-open') as HTMLInputElement;
        const closeI = it.querySelector('.hours-close') as HTMLInputElement;
        const openV = openI.value.trim();
        const closeV = closeI.value.trim();
        // If one is filled and the other not
        if ((openV && !closeV) || (!openV && closeV)) {
          markInvalid(openI, !closeV);
          markInvalid(closeI, !openV);
          ok = false; message = 'Complétez chaque créneau (début et fin).';
          break;
        }
        if (!openV && !closeV) { markInvalid(openI, false); markInvalid(closeI, false); continue; }
        if (!isValidTime(openV) || !isValidTime(closeV)) {
          markInvalid(openI, !isValidTime(openV));
          markInvalid(closeI, !isValidTime(closeV));
          ok = false; message = 'Format horaire invalide (HH:MM).';
          break;
        }
        if (toMinutes(openV) >= toMinutes(closeV)) {
          markInvalid(openI, true); markInvalid(closeI, true);
          ok = false; message = 'L\'heure de fin doit être après l\'heure de début.';
          break;
        }
        markInvalid(openI, false); markInvalid(closeI, false);
      }
      setRowError(row, message);
      return ok;
    };
    const validateAll = (): boolean => {
      const rows = Array.from(form.querySelectorAll('.hours-row')) as HTMLElement[];
      return rows.every(validateRow);
    };
    const to24 = (v:string) => {
      if (!v) return '' as any;
      const m = v.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
      if (!m) return v;
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const ap = m[3]?.toLowerCase();
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    };

    const createIntervalEl = (day:string, idx:number, open='', close='') => {
      const wrap = document.createElement('div');
      wrap.className = 'interval';
      wrap.innerHTML = `
        <input type="text" inputmode="numeric" pattern="^\\d{2}:\\d{2}$" placeholder="HH:MM" name="${day}_open_${idx}" class="hours-open" value="${to24(open)}">
        <span class="sep">-</span>
        <input type="text" inputmode="numeric" pattern="^\\d{2}:\\d{2}$" placeholder="HH:MM" name="${day}_close_${idx}" class="hours-close" value="${to24(close)}">
        <button type="button" class="btn tiny danger remove-interval" data-day="${day}" data-index="${idx}">×</button>
      `;
      return wrap;
    };

    const renderIntervals = (day:string, intervals:any[]) => {
      const container = form.querySelector(`.intervals[data-intervals="${day}"]`) as HTMLElement;
      container.innerHTML = '';
      intervals.forEach((it, idx) => container.appendChild(createIntervalEl(day, idx, it.open || '', it.close || '')));
      // attach validation listeners
      container.querySelectorAll('input.hours-open, input.hours-close').forEach((inp) => {
        inp.addEventListener('input', () => {
          validateRow(container.closest('.hours-row') as HTMLElement);
          (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = !validateAll();
        });
      });
    };

    // Load current hours
    try {
      const token = localStorage.getItem('adminToken');
      const resp = await fetch('/api/admin/settings/hours', { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const data = await resp.json();
        const hours = data.hours || {};
        const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
        days.forEach((k) => {
          const row = form.querySelector(`.hours-row[data-day="${k}"]`) as HTMLElement;
          const closed = row.querySelector('input[type="checkbox"]') as HTMLInputElement;
          const intervals = Array.isArray(hours[k]?.intervals) ? hours[k].intervals : (hours[k]?.open && hours[k]?.close ? [{open:hours[k].open, close:hours[k].close}] : []);
          closed.checked = !!hours[k]?.closed;
          renderIntervals(k, intervals);
          const addBtn = row.querySelector('.add-interval') as HTMLButtonElement;
          addBtn.addEventListener('click', () => {
            const container = row.querySelector(`.intervals[data-intervals="${k}"]`) as HTMLElement;
            const idx = container.querySelectorAll('.interval').length;
            container.appendChild(createIntervalEl(k, idx));
            // bind listeners for new inputs
            container.querySelectorAll('.interval:last-child input').forEach((el) => {
              el.addEventListener('input', () => {
                validateRow(row);
                (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = !validateAll();
              });
            });
          });
          row.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('remove-interval')) {
              const container = row.querySelector(`.intervals[data-intervals="${k}"]`) as HTMLElement;
              const intervalEl = target.closest('.interval') as HTMLElement;
              intervalEl?.remove();
              // re-index names
              container.querySelectorAll('.interval').forEach((el, idx2) => {
                const openI = el.querySelector('.hours-open') as HTMLInputElement;
                const closeI = el.querySelector('.hours-close') as HTMLInputElement;
                openI.name = `${k}_open_${idx2}`;
                closeI.name = `${k}_close_${idx2}`;
                const btn = el.querySelector('.remove-interval') as HTMLElement;
                btn.setAttribute('data-index', String(idx2));
              });
            }
          });
          const toggle = () => {
            const disabled = closed.checked;
            row.querySelectorAll('.hours-open, .hours-close, .add-interval, .remove-interval').forEach((el: any) => {
              (el as HTMLInputElement).disabled = disabled;
            });
          };
          closed.addEventListener('change', toggle);
          toggle();
          // initial validation bind
          row.addEventListener('input', () => {
            validateRow(row);
            (form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled = !validateAll();
          });
          validateRow(row);
        });
      }
    } catch (e) {
      console.error('Failed to load hours', e);
    }

    modal.classList.add('active');
    const close = () => { modal.classList.remove('active'); };
    closeBtn?.addEventListener('click', close, { once: true });

    // Close on overlay click
    modal.addEventListener('click', (evt) => {
      if (evt.target === modal) close();
    }, { once: true });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateAll()) { this.showToast('Corrigez les horaires invalides'); return; }
      const fd = new FormData(form);
      const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
      const hours:any = {};
      days.forEach((d) => {
        const row = form.querySelector(`.hours-row[data-day="${d}"]`) as HTMLElement;
        const closed = (row.querySelector(`input[name="${d}_closed"]`) as HTMLInputElement).checked;
        const container = row.querySelector(`.intervals[data-intervals="${d}"]`) as HTMLElement;
        const intervals: Array<{open:string,close:string}> = [];
        container.querySelectorAll('.interval').forEach((el, idx) => {
          const openI = (el.querySelector('.hours-open') as HTMLInputElement).value;
          const closeI = (el.querySelector('.hours-close') as HTMLInputElement).value;
          if (openI && closeI) intervals.push({ open: openI, close: closeI });
        });
        hours[d] = { closed, intervals };
      });
      try {
        const token = localStorage.getItem('adminToken');
        const resp = await fetch('/api/admin/settings/hours', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ hours })
        });
        if (resp.ok) {
          this.showToast('Horaires mis à jour');
          close();
        } else {
          const err = await resp.json().catch(() => ({}));
          alert(err.error || 'Échec de la mise à jour');
        }
      } catch (e:any) {
        alert('Erreur: ' + (e?.message || 'inconnue'));
      }
    }, { once: true });
  }

  private showToast(message: string) {
    const div = document.createElement('div');
    div.className = 'toast';
    div.textContent = message;
    this.element.appendChild(div);
    setTimeout(() => div.remove(), 2500);
  }

  private async loadDashboardData() {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch("/api/admin/dashboard", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        this.dashboardData = await response.json();
      } else {
        console.error("Failed to load dashboard data:", response.status);
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('adminToken');
          window.history.pushState({}, "", "/admin/login");
          window.dispatchEvent(new PopStateEvent("popstate"));
          return;
        }
        this.dashboardData = null;
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      this.dashboardData = null;
    }
  }

	private renderRecentOrders(): string {
		if (!this.dashboardData?.recentOrders?.length) {
			return `
				<div class="order-row">
					<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-secondary);">
						Aucune commande récente
					</div>
				</div>
			`;
		}

		return this.dashboardData.recentOrders.map((order: any) => {
			const statusClass = order.status === 'completed' ? 'completed' : 
							   order.status === 'preparing' ? 'processing' : 'pending';
			const statusText = order.status === 'completed' ? 'Terminé' :
							  order.status === 'preparing' ? 'En préparation' :
							  order.status === 'confirmed' ? 'Confirmé' : 'En attente';

			return `
				<div class="order-row">
					<div class="order-id">#${order.id}</div>
					<div class="order-customer">${order.customerName}</div>
					<div class="order-items">${order.itemCount} article(s)</div>
					<div class="order-total">€${order.total.toFixed(2)}</div>
					<div class="order-status ${statusClass}">${statusText}</div>
					<div class="order-time">${new Date(order.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
				</div>
			`;
		}).join('');
	}

	destroy() {
		// Cleanup if needed
	}
}
