import { isOpenNow } from "../services/hours";

export class FooterBar {
  private element: HTMLElement;

  constructor() {
    this.element = document.createElement("footer");
    this.element.className = "app-footer";
  }

  async render(): Promise<HTMLElement> {
    const open = await isOpenNow();
    const statusClass = open.open ? 'open' : 'closed';
    const statusText = open.open ? 'Ouvert' : 'Fermé';
    this.element.innerHTML = `
      <div class="footer-phone-row">
        <a href="tel:0444XXXXXXXX" class="footer-phone" aria-label="Téléphone">
          <span class="phone-icon">📞</span>
          <span class="phone-number">04.44.XX.XX.XX</span>
        </a>
        <span class="status-dot ${statusClass}" title="${statusText}"></span>
      </div>
      <div class="footer-legal-row">
        <a href="/mentions" class="footer-legal-link" data-link>Mentions légales</a>
      </div>
    `;

    // SPA navigation for mentions
    const link = this.element.querySelector('[data-link]') as HTMLAnchorElement;
    link?.addEventListener('click', (e) => {
      e.preventDefault();
      window.history.pushState({}, "", "/mentions");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    return this.element;
  }
}
