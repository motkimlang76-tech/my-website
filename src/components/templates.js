export function renderNavigation(items) {
  return items
    .map(
      (item) => `
        <a class="nav-link" href="${item.href}">
          <span>${item.label}</span>
        </a>
      `
    )
    .join("");
}

export function renderStats(items) {
  return items
    .map(
      (item) => `
        <article class="stat-card reveal">
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </article>
      `
    )
    .join("");
}

export function renderPrinciples(items) {
  return items
    .map(
      (item) => `
        <article class="principle-card reveal">
          <p class="eyebrow">${item.eyebrow ?? "Benefit"}</p>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");
}

export function renderProjects(items) {
  return items
    .map(
      (item) => `
        <article class="project-card reveal">
          <div class="project-header">
            <p class="eyebrow">${item.category}</p>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
          </div>
          <ul class="project-outcomes">
            ${item.outcomes.map((outcome) => `<li>${outcome}</li>`).join("")}
          </ul>
          <div class="tag-row">
            ${item.stack.map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
          <div class="product-footer">
            <strong class="product-price">${item.meta ?? ""}</strong>
            <button
              class="button button-primary add-to-cart-button"
              type="button"
              data-product-id="${item.id}"
            >
              Add to cart
            </button>
          </div>
        </article>
      `
    )
    .join("");
}

export function renderToolbox(items) {
  return items
    .map(
      (group) => `
        <article class="toolbox-card reveal">
          <p class="eyebrow">${group.title}</p>
          ${group.description ? `<p>${group.description}</p>` : ""}
          <div class="tag-row">
            ${group.items.map((item) => `<span class="tag tag-soft">${item}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

export function renderSocialLinks(items) {
  return items
    .map(
      (item) =>
        item.href
          ? `
        <a class="social-link" href="${item.href}"${item.external ? ' target="_blank" rel="noreferrer"' : ""}>
          ${item.label}
        </a>
      `
          : `
        <span class="social-link social-link-muted">
          ${item.label}
        </span>
      `
    )
    .join("");
}
