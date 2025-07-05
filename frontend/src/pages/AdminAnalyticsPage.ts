import { Page } from "../types/index";
import { brandingService } from "../services/branding";

interface DailySale {
	date: string;
	orders: number;
	revenue: number;
	averageOrderValue: number;
}

interface StatusBreakdown {
	status: string;
	count: number;
	revenue: number;
}

interface TopItem {
	id: string;
	name: string;
	quantitySold: number;
	revenue: number;
}

interface HourlySale {
	hour: number;
	orders: number;
	revenue: number;
}

interface AnalyticsData {
  dailySales: DailySale[];
  statusBreakdown: StatusBreakdown[];
  topItems: Array<{ id: string; name: string; quantitySold: number; revenue: number }>;
  hourlyDistribution: Array<{ hour: number; orders: number; revenue: number }>;
  summary: { totalOrders: number; totalRevenue: number; averageOrderValue: number };
}

interface DashboardData {
	stats: {
		today: {
			orders: number;
			revenue: number;
			averageOrderValue: number;
		};
		week: {
			orders: number;
			revenue: number;
		};
		month: {
			orders: number;
			revenue: number;
		};
	};
	topItems: TopItem[];
	hourlySales: HourlySale[];
}

export class AdminAnalyticsPage implements Page {
	private element: HTMLElement;
	private analyticsData: AnalyticsData | null = null;
	private dashboardData: DashboardData | null = null;
	private currentPeriod = '7days';

	constructor() {
		this.element = document.createElement("div");
		this.element.className = "admin-analytics-page";
	}

	async render(): Promise<HTMLElement> {
		await this.loadAnalyticsData();
		
		this.element.innerHTML = `
			<div class="admin-analytics-container">
				<div class="admin-header">
					<h1 class="admin-title">Analyses et Rapports</h1>
					<div class="admin-actions">
						<button class="btn primary" id="refreshBtn">
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

				<div class="analytics-filters">
					<div class="filter-group">
						<label for="periodSelect">Période:</label>
						<select id="periodSelect">
							<option value="1day">Aujourd'hui</option>
							<option value="7days" selected>7 derniers jours</option>
							<option value="30days">30 derniers jours</option>
							<option value="custom">Période personnalisée</option>
						</select>
					</div>

					<div class="custom-date-range" id="customDateRange" style="display: none;">
						<div class="filter-group">
							<label for="startDate">Du:</label>
							<input type="date" id="startDate" />
						</div>
						<div class="filter-group">
							<label for="endDate">Au:</label>
							<input type="date" id="endDate" />
						</div>
					</div>

					<button class="btn primary" id="applyPeriodBtn">Appliquer</button>
				</div>

				<div class="analytics-content">
					<!-- Summary Cards -->
					<div class="analytics-summary">
						<h2 class="section-title">Résumé des Performances</h2>
						<div class="summary-cards">
							${this.renderSummaryCards()}
						</div>
					</div>

					<!-- Sales Chart -->
					<div class="analytics-section">
						<h2 class="section-title">Évolution des Ventes</h2>
						<div class="chart-container">
							${this.renderSalesChart()}
						</div>
					</div>

					<!-- Daily Breakdown -->
					<div class="analytics-section">
						<h2 class="section-title">Détail Journalier</h2>
						<div class="daily-breakdown">
							${this.renderDailyBreakdown()}
						</div>
					</div>

					<!-- Status Breakdown -->
					<div class="analytics-section">
						<h2 class="section-title">Répartition par Statut</h2>
						<div class="status-breakdown">
							${this.renderStatusBreakdown()}
						</div>
					</div>

					<!-- Top Items -->
					<div class="analytics-section">
        <h2 class="section-title">Articles les Plus Vendus (Période)</h2>
						<div class="top-items">
							${this.renderTopItems()}
						</div>
					</div>

					<!-- Hourly Performance -->
					<div class="analytics-section">
        <h2 class="section-title">Distribution horaire (Période)</h2>
						<div class="hourly-chart">
							${this.renderHourlyChart()}
						</div>
					</div>
				</div>
			</div>
		`;

		this.setupEventListeners();
		return this.element;
	}

	private async loadAnalyticsData() {
    try {
      const token = localStorage.getItem("adminToken");
      
      // Load analytics data
      const analyticsResponse = await fetch(`/api/admin/dashboard/analytics/sales?period=${this.currentPeriod}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (analyticsResponse.ok) {
        this.analyticsData = await analyticsResponse.json();
      } else {
        console.error("Failed to load analytics:", analyticsResponse.status);
        if (analyticsResponse.status === 401 || analyticsResponse.status === 403) {
          localStorage.removeItem('adminToken');
          window.history.pushState({}, "", "/admin/login");
          window.dispatchEvent(new PopStateEvent("popstate"));
          return;
        }
        this.analyticsData = null;
      }

			// Load dashboard data for additional insights
			const dashboardResponse = await fetch("/api/admin/dashboard", {
				headers: {
					"Authorization": `Bearer ${token}`
				}
			});

      if (dashboardResponse.ok) {
        this.dashboardData = await dashboardResponse.json();
      } else {
        console.error("Failed to load dashboard data:", dashboardResponse.status);
        if (dashboardResponse.status === 401 || dashboardResponse.status === 403) {
          localStorage.removeItem('adminToken');
          window.history.pushState({}, "", "/admin/login");
          window.dispatchEvent(new PopStateEvent("popstate"));
          return;
        }
        this.dashboardData = null;
      }
    } catch (error) {
      console.error("Error loading analytics data:", error);
      this.analyticsData = null;
      this.dashboardData = null;
    }
  }

  private renderSummaryCards(): string {
    if (!this.analyticsData?.summary) {
      return '<div class="no-data">Aucune donnée disponible</div>';
    }

    const summary = this.analyticsData.summary;
    const weekRevenue = this.dashboardData?.stats?.week?.revenue ?? 0;
    const monthRevenue = this.dashboardData?.stats?.month?.revenue ?? 0;
		
		return `
			<div class="summary-card">
				<div class="card-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="12" y1="1" x2="12" y2="23"></line>
						<path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
					</svg>
				</div>
				<div class="card-content">
          <h3>Revenus (Période)</h3>
          <div class="card-value">${brandingService.formatPrice(summary.totalRevenue)}</div>
          <div class="card-comparison">Panier moyen: ${brandingService.formatPrice(summary.averageOrderValue)}</div>
				</div>
			</div>

			<div class="summary-card">
				<div class="card-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
						<circle cx="8.5" cy="7" r="4"></circle>
						<line x1="20" y1="8" x2="20" y2="14"></line>
						<line x1="23" y1="11" x2="17" y2="11"></line>
					</svg>
				</div>
				<div class="card-content">
          <h3>Commandes (Période)</h3>
          <div class="card-value">${summary.totalOrders}</div>
          <div class="card-comparison">/ jour: ${ (this.analyticsData.dailySales.length ? (summary.totalOrders / this.analyticsData.dailySales.length) : 0).toFixed(1) }</div>
				</div>
			</div>

			<div class="summary-card">
				<div class="card-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M3 3v18h18"></path>
						<path d="M9 17V9l8 8"></path>
					</svg>
				</div>
				<div class="card-content">
					<h3>Revenus Hebdomadaires</h3>
					<div class="card-value">${brandingService.formatPrice(weekRevenue)}</div>
					<div class="card-comparison">
						Ce mois: ${brandingService.formatPrice(monthRevenue)}
					</div>
				</div>
			</div>

			<div class="summary-card">
				<div class="card-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="3"></circle>
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
					</svg>
				</div>
				<div class="card-content">
          <h3>Jours couverts</h3>
          <div class="card-value">${this.analyticsData.dailySales.length}</div>
          <div class="card-comparison">Période sélectionnée</div>
				</div>
			</div>
		`;
	}

	private renderSalesChart(): string {
		if (!this.analyticsData?.dailySales.length) {
			return '<div class="no-data">Aucune donnée disponible pour la période sélectionnée</div>';
		}

		const maxRevenue = Math.max(...this.analyticsData.dailySales.map(d => d.revenue));
		const chartHeight = 200;

		return `
			<div class="chart">
				<div class="chart-bars">
					${this.analyticsData.dailySales.map((day, index) => {
						const barHeight = maxRevenue > 0 ? (day.revenue / maxRevenue) * chartHeight : 0;
						return `
							<div class="chart-bar-container">
								<div class="chart-bar" style="height: ${barHeight}px" title="€${day.revenue.toFixed(2)}">
									<div class="bar-value">€${day.revenue.toFixed(0)}</div>
								</div>
            <div class="chart-label">
              ${new Date(day.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
            </div>
							</div>
						`;
					}).join('')}
				</div>
			</div>
		`;
	}

	private renderDailyBreakdown(): string {
		if (!this.analyticsData?.dailySales.length) {
			return '<div class="no-data">Aucune donnée disponible</div>';
		}

		return `
			<div class="table-responsive">
				<table class="analytics-table">
					<thead>
						<tr>
							<th>Date</th>
							<th>Commandes</th>
							<th>Revenus</th>
							<th>Panier Moyen</th>
						</tr>
					</thead>
					<tbody>
						${this.analyticsData.dailySales.map(day => `
							<tr>
								<td>${new Date(day.date).toLocaleDateString('fr-FR')}</td>
								<td>${day.orders}</td>
            <td>${brandingService.formatPrice(day.revenue)}</td>
            <td>${brandingService.formatPrice(day.averageOrderValue)}</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			</div>
		`;
	}

	private renderStatusBreakdown(): string {
		if (!this.analyticsData?.statusBreakdown.length) {
			return '<div class="no-data">Aucune donnée disponible</div>';
		}

		const totalOrders = this.analyticsData.statusBreakdown.reduce((sum, status) => sum + status.count, 0);

		return `
			<div class="status-grid">
				${this.analyticsData.statusBreakdown.map(status => {
					const percentage = totalOrders > 0 ? (status.count / totalOrders) * 100 : 0;
					return `
						<div class="status-card">
							<div class="status-header">
								<span class="status-name">${this.getStatusText(status.status)}</span>
								<span class="status-count">${status.count}</span>
							</div>
							<div class="status-bar">
								<div class="status-fill" style="width: ${percentage}%"></div>
							</div>
							<div class="status-details">
								<span class="status-percentage">${percentage.toFixed(1)}%</span>
								<span class="status-revenue">€${status.revenue.toFixed(2)}</span>
							</div>
						</div>
					`;
				}).join('')}
			</div>
		`;
	}

  private renderTopItems(): string {
    if (!this.analyticsData?.topItems?.length) {
      return '<div class="no-data">Aucun article vendu sur la période</div>';
    }

    const maxQuantity = Math.max(...this.analyticsData.topItems.map(item => item.quantitySold));

		return `
			<div class="top-items-list">
        ${this.analyticsData.topItems.map((item, index) => {
          const percentage = maxQuantity > 0 ? (item.quantitySold / maxQuantity) * 100 : 0;
          return `
            <div class="top-item">
              <div class="item-rank">${index + 1}</div>
              <div class="item-details">
                <div class="item-name">${item.name}</div>
                <div class="item-bar">
                  <div class="item-fill" style="width: ${percentage}%"></div>
                </div>
              </div>
              <div class="item-stats">
          <div class="item-quantity">${item.quantitySold} vendus</div>
          <div class="item-revenue">${brandingService.formatPrice(item.revenue)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderHourlyChart(): string {
    if (!this.analyticsData?.hourlyDistribution?.length) {
      return '<div class="no-data">Aucune donnée horaire disponible</div>';
    }

    const maxOrders = Math.max(...this.analyticsData.hourlyDistribution.map(h => h.orders));

		return `
			<div class="hourly-chart">
        ${Array.from({ length: 24 }, (_, hour) => {
          const hourData = this.analyticsData!.hourlyDistribution.find(h => h.hour === hour);
          const orders = hourData?.orders || 0;
          const revenue = hourData?.revenue || 0;
          const barHeight = maxOrders > 0 ? (orders / maxOrders) * 100 : 0;
					
					return `
						<div class="hour-bar">
            <div class="hour-fill" style="height: ${barHeight}%" title="${orders} commandes - ${brandingService.formatPrice(revenue)}">
								<span class="hour-value">${orders}</span>
							</div>
							<div class="hour-label">${hour}h</div>
						</div>
					`;
				}).join('')}
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
			this.refreshAnalytics();
		});

		// Period selection
		const periodSelect = this.element.querySelector("#periodSelect") as HTMLSelectElement;
		periodSelect?.addEventListener("change", () => {
			const customDateRange = this.element.querySelector("#customDateRange") as HTMLElement;
			if (periodSelect.value === 'custom') {
				customDateRange.style.display = 'flex';
			} else {
				customDateRange.style.display = 'none';
			}
		});

		// Apply period
		const applyPeriodBtn = this.element.querySelector("#applyPeriodBtn");
		applyPeriodBtn?.addEventListener("click", () => {
			this.applyPeriodFilter();
		});
	}

	private async refreshAnalytics() {
		const refreshBtn = this.element.querySelector("#refreshBtn") as HTMLButtonElement;
		refreshBtn.disabled = true;
		refreshBtn.textContent = "Actualisation...";

		await this.loadAnalyticsData();
		this.updateContent();

		refreshBtn.disabled = false;
		refreshBtn.innerHTML = `
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M3 2v6h6M21 12a9 9 0 01-9 9 9 9 0 01-9-9 9 9 0 019-9c2.39 0 4.68.94 6.4 2.6l2.6 2.6"/>
			</svg>
			Actualiser
		`;
	}

	private async applyPeriodFilter() {
		const periodSelect = this.element.querySelector("#periodSelect") as HTMLSelectElement;
		
		if (periodSelect.value === 'custom') {
			const startDate = (this.element.querySelector("#startDate") as HTMLInputElement).value;
			const endDate = (this.element.querySelector("#endDate") as HTMLInputElement).value;
			
			if (!startDate || !endDate) {
				alert("Veuillez sélectionner une date de début et de fin");
				return;
			}
			
			this.currentPeriod = `custom&startDate=${startDate}&endDate=${endDate}`;
		} else {
			this.currentPeriod = periodSelect.value;
		}

		await this.refreshAnalytics();
	}

  private updateContent() {
    // Update all sections
    const analyticsContent = this.element.querySelector(".analytics-content");
    if (analyticsContent) {
      analyticsContent.innerHTML = `
        <div class="analytics-summary">
          <h2 class="section-title">Résumé des Performances</h2>
          <div class="summary-cards">
            ${this.renderSummaryCards()}
          </div>
        </div>

        <div class="analytics-section">
          <h2 class="section-title">Aperçu</h2>
          <div class="insights">
            ${this.renderInsights()}
          </div>
        </div>

				<div class="analytics-section">
					<h2 class="section-title">Évolution des Ventes</h2>
					<div class="chart-container">
						${this.renderSalesChart()}
					</div>
				</div>

				<div class="analytics-section">
					<h2 class="section-title">Détail Journalier</h2>
					<div class="daily-breakdown">
						${this.renderDailyBreakdown()}
					</div>
				</div>

				<div class="analytics-section">
					<h2 class="section-title">Répartition par Statut</h2>
					<div class="status-breakdown">
						${this.renderStatusBreakdown()}
					</div>
				</div>

				<div class="analytics-section">
					<h2 class="section-title">Articles les Plus Vendus (Aujourd'hui)</h2>
					<div class="top-items">
						${this.renderTopItems()}
					</div>
				</div>

				<div class="analytics-section">
					<h2 class="section-title">Performance par Heure (Aujourd'hui)</h2>
					<div class="hourly-chart">
						${this.renderHourlyChart()}
					</div>
				</div>
      `;
    }
  }

  private renderInsights(): string {
    if (!this.analyticsData) return '';
    const peak = this.analyticsData.hourlyDistribution?.reduce((acc, h) => h.orders > acc.orders ? h : acc, { hour: 0, orders: 0, revenue: 0 });
    const top = this.analyticsData.topItems && this.analyticsData.topItems[0];
    const summary = this.analyticsData.summary;
    return `
      <ul class="insights-list">
        <li><strong>Heure de pointe:</strong> ${peak ? (('0'+peak.hour).slice(-2) + 'h') : '—'} (${peak?.orders || 0} commandes)</li>
        <li><strong>Produit top ventes:</strong> ${top ? top.name + ' (' + top.quantitySold + ' vendus)' : '—'}</li>
        <li><strong>Panier moyen:</strong> €${summary ? summary.averageOrderValue.toFixed(2) : '0.00'}</li>
        <li><strong>Commandes totales:</strong> ${summary ? summary.totalOrders : 0}</li>
        <li><strong>Revenus totaux:</strong> €${summary ? summary.totalRevenue.toFixed(2) : '0.00'}</li>
      </ul>
    `;
  }

	destroy() {
		// Cleanup if needed
	}
}
