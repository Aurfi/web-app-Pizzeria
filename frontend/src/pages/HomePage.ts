import { CartService } from "../services/cart";
import { MenuService } from "../services/menu";
import { brandingService } from "../services/branding";
import { PLACEHOLDER_IMAGE } from "../utils/constants";
import { t } from "../services/i18n";
import { isOpenNow } from "../services/hours";

export class HomePage {
  private categories: any[] = [];
  private featuredItems: any[] = [];
  private businessHours: any | null = null;

	render(): HTMLElement {
		const container = document.createElement("div");
		container.className = "home-page";

		container.innerHTML = `
      <div class="hero-section">
        <div class="hero-content">
          <h1>${t("home.hero.title")}</h1>
          <p>${t("home.hero.subtitle")}</p>
          <button class="cta-button" data-action="browse-menu">${t("home.hero.cta")}</button>
        </div>
        <div class="hero-image">
          <img src="/images/hero-food.jpg" alt="${t('home.hero.alt')}" loading="lazy">
        </div>
      </div>
      
      <section class="promo-section">
        <div class="promo-card">
          <span class="promo-badge">${t("home.promo.newUser")}</span>
          <h3>${t("home.promo.discount", { percent: "20" })}</h3>
          <p>${t("home.promo.useCode", { code: "WELCOME20" })}</p>
        </div>
      </section>
      
      <section class="categories-section">
        <h2>${t("home.sections.categories")}</h2>
        <div class="categories-grid" id="categories-grid">
          <div class="loading">${t("menu.loadingCategories")}</div>
        </div>
      </section>
      
      
      
      <section class="about-section">
        <div class="about-media">
          <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=900&q=80&auto=format&fit=crop" alt="Mario en train de préparer une pizza" loading="lazy" />
        </div>
        <div class="about-content">
          <h2>L'histoire de Mario</h2>
          <p>
            Depuis plus de 15 ans, Mario pétrit sa pâte avec patience, choisit
            des tomates mûries au soleil, et cuit chaque pizza au feu de bois.
            Ici, pas de secrets — seulement des ingrédients frais, une passion
            intacte et un amour pour les choses bien faites.
          </p>
          <p>
            Chaque pizza raconte une histoire: une croûte fine et croustillante,
            une sauce généreuse, une mozzarella qui fond délicatement… Une
            simplicité assumée, un goût authentique.
          </p>
          <div class="about-cta">
            <button class="cta-button" data-action="browse-menu">Nos Pizzas</button>
          </div>
        </div>
      </section>
    `;

		this.setupEventListeners(container);
		this.loadData(container);

		return container;
	}

	private setupEventListeners(container: HTMLElement) {
		const browseBtn = container.querySelector('[data-action="browse-menu"]');
		if (browseBtn) {
			browseBtn.addEventListener("click", () => {
				window.history.pushState({}, "", "/menu");
				window.dispatchEvent(new PopStateEvent("popstate"));
			});
		}
	}

  private async loadData(container: HTMLElement) {
    try {
      const [categories, hours] = await Promise.all([
        MenuService.getCategories(),
        fetch('/api/restaurant/hours').then(r => r.json()).catch(() => ({ hours: null }))
      ]);

      this.categories = categories;
      this.businessHours = hours?.hours || null;

      this.renderCategories(container);
      this.renderBusinessHours(container);
    } catch (error) {
      console.error("Failed to load home page data:", error);
      this.renderOfflineContent(container);
    }
  }

  private renderBusinessHours(container: HTMLElement) {
    if (!this.businessHours) return;
    const section = document.createElement('section');
    section.className = 'hours-section';

    const dayNamesFull: Record<string,string> = {
      monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche'
    };
    const dayNamesShort: Record<string,string> = {
      monday: 'Lun', tuesday: 'Mar', wednesday: 'Mer', thursday: 'Jeu', friday: 'Ven', saturday: 'Sam', sunday: 'Dim'
    };

    const now = new Date();
    const jsDay = now.getDay(); // 0 Sun..6 Sat
    const keyOrder = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
    const todayKey = keyOrder[(jsDay + 6) % 7];

    const to24 = (v:string) => {
      if (!v) return '';
      const m = v.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
      if (!m) return v;
      let h = parseInt(m[1], 10);
      const min = m[2] ? parseInt(m[2], 10) : 0;
      const ap = m[3]?.toLowerCase();
      if (ap === 'pm' && h < 12) h += 12;
      if (ap === 'am' && h === 12) h = 0;
      return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    };
    const fmt = (v:string) => {
      const t = to24(v);
      const [hh,mm] = (t || '').split(':');
      if (!hh) return '';
      return mm && mm !== '00' ? `${hh}h${mm}` : `${hh}h`;
    };
    const renderIntervals = (d:any) => {
      if (!d || d.closed) return 'Fermé';
      const intervals = Array.isArray(d.intervals) ? d.intervals : (d.open && d.close ? [{open:d.open, close:d.close}] : []);
      if (!intervals.length) return 'Fermé';
      return intervals.map((i:any) => `${fmt(i.open)}-${fmt(i.close)}`).join(' • ');
    };

    // Build compact list items with short day names
    const items = keyOrder.map(k => {
      const d = this.businessHours[k];
      const active = (k === todayKey) ? 'today' : '';
      const label = dayNamesShort[k] || k;
      const value = renderIntervals(d);
      return `<li class="hours-item ${active}"><span class="day">${label}</span><span class="time">${value}</span></li>`;
    }).join('');

    // Collapsible: show today + next 2 by default
    const todayIndex = keyOrder.indexOf(todayKey);
    const orderForPreview = [0,1,2].map(i => (todayIndex + i) % 7);
    const previewSet = new Set(orderForPreview);
    const previewItems = keyOrder
      .map((k, idx) => ({ k, idx }))
      .filter(({idx}) => previewSet.has(idx))
      .map(({k}) => {
        const d = this.businessHours[k];
        const label = dayNamesShort[k] || k;
        const value = renderIntervals(d);
        return `<li class="hours-item ${k===todayKey?'today':''}"><span class="day">${label}</span><span class="time">${value}</span></li>`;
      }).join('');

    section.innerHTML = `
      <h2>Horaires d'ouverture</h2>
      <div class="hours-toggle-wrap"><button class="btn secondary hours-toggle" type="button">Afficher tous les horaires</button></div>
      <ul class="hours-list compact" data-state="collapsed">
        ${previewItems}
      </ul>
      <ul class="hours-list full" style="display:none;">
        ${items}
      </ul>
    `;

    const toggleBtn = section.querySelector('.hours-toggle') as HTMLButtonElement;
    const listCompact = section.querySelector('.hours-list.compact') as HTMLElement;
    const listFull = section.querySelector('.hours-list.full') as HTMLElement;
    toggleBtn?.addEventListener('click', () => {
      const expanded = listFull.style.display !== 'none';
      if (expanded) {
        listFull.style.display = 'none';
        listCompact.style.display = '';
        toggleBtn.textContent = 'Afficher tous les horaires';
      } else {
        listFull.style.display = '';
        listCompact.style.display = 'none';
        toggleBtn.textContent = 'Réduire';
      }
    });

    container.appendChild(section);
  }

	private renderCategories(container: HTMLElement) {
		const grid = container.querySelector("#categories-grid");
		if (!grid) return;

    if (this.categories.length === 0) {
      grid.innerHTML = "<p>Aucune catégorie disponible</p>";
      return;
    }

		grid.innerHTML = this.categories
			.map(
				(category) => `
      <div class="category-card" data-category-id="${category.id}" data-category-name="${category.name}">
        <div class="category-image">
          <img src="${category.imageUrl || PLACEHOLDER_IMAGE}" alt="${category.name}" loading="lazy">
        </div>
        <h3>${category.name}</h3>
        ${category.description ? `<p>${category.description}</p>` : ""}
      </div>
    `,
			)
			.join("");

      grid.querySelectorAll(".category-card").forEach((card) => {
        card.addEventListener("click", () => {
          const categoryId = card.getAttribute("data-category-id");
          const categoryName = encodeURIComponent(card.getAttribute("data-category-name") || "");
          const url = `/menu?category=${categoryId}${categoryName ? `&categoryName=${categoryName}` : ''}`;
          window.history.pushState({}, "", url);
          window.dispatchEvent(new PopStateEvent("popstate"));
        });
      });
	}

	private renderFeaturedItems(container: HTMLElement) {
		const itemsContainer = container.querySelector("#featured-items");
		if (!itemsContainer) return;

		if (this.featuredItems.length === 0) {
			itemsContainer.innerHTML = "<p>Aucun article vedette disponible</p>";
			return;
		}

		itemsContainer.innerHTML = `
      <div class="items-scroll">
        ${this.featuredItems
					.map(
						(item) => `
          <div class="featured-item-card" data-item-id="${item.id}">
            <div class="item-image">
              <img src="${item.imageUrl || PLACEHOLDER_IMAGE}" alt="${item.name}" loading="lazy">
            </div>
              <div class="item-details">
                <h3>${item.name}</h3>
                <p class="item-description">${item.description || ""}</p>
                <div class="item-footer">
                <span class="item-price">${brandingService.formatPrice(item.price)}</span>
                ${item.available === false || item.isAvailable === false
                  ? `<button class=\"add-to-cart-btn\" disabled>Indisponible</button>`
                  : `<button class=\"add-to-cart-btn\" data-item='${JSON.stringify(item).replace(/'/g, "&apos;")}'>Ajouter au Panier</button>`}
                </div>
              </div>
              </div>
        `,
					)
					.join("")}
      </div>
    `;

    itemsContainer.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const open = await isOpenNow();
        if (!open.open) {
          alert(`Le restaurant est fermé actuellement. Horaires aujourd'hui: ${open.window}`);
          return;
        }
        const itemData = JSON.parse(
          (btn.getAttribute("data-item") || "{}").replace(/&apos;/g, "'"),
        );
        await CartService.addItem(itemData, 1);

				btn.textContent = "Ajouté !";
				(btn as HTMLButtonElement).disabled = true;
				setTimeout(() => {
					btn.textContent = "Ajouter au Panier";
					(btn as HTMLButtonElement).disabled = false;
				}, 1500);
			});
		});
	}

	private renderOfflineContent(container: HTMLElement) {
		const categoriesGrid = container.querySelector("#categories-grid");
		const featuredItems = container.querySelector("#featured-items");

    if (categoriesGrid) {
      categoriesGrid.innerHTML =
        '<p class="offline-message">Les catégories seront disponibles lorsque vous serez de nouveau en ligne</p>';
    }

    if (featuredItems) {
      featuredItems.innerHTML =
        '<p class="offline-message">Les articles vedettes seront disponibles lorsque vous serez de nouveau en ligne</p>';
    }
	}
}
