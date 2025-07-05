export class MentionsPage {
  render(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'mentions-page';
    el.innerHTML = `
      <div class="container">
        <h1>Mentions légales</h1>
        <p>Ce site est une démonstration. Les informations fournies ici sont à titre indicatif uniquement.</p>
        <h2>Éditeur</h2>
        <p>Mario's Pizzeria — 123 Rue de la Pizza, 75000 Paris</p>
        <h2>Contact</h2>
        <p>Téléphone : 04.44.XX.XX.XX</p>
        <h2>Hébergement</h2>
        <p>Hébergé à des fins de démonstration.</p>
      </div>
    `;
    return el;
  }
}

