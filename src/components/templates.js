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
        <article class="stat-card">
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </article>
      `
    )
    .join("");
}

export function renderSteps(items) {
  return items
    .map(
      (item, index) => `
        <article class="journey-card">
          <span class="journey-index">${String(index + 1).padStart(2, "0")}</span>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");
}

export function renderPrinciples(items) {
  return items
    .map(
      (item) => `
        <article class="principle-card">
          <p class="eyebrow">${item.eyebrow ?? "Benefit"}</p>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join("");
}

export function renderCollections(items) {
  return items
    .map(
      (item) => `
        <article class="collection-card">
          <p class="eyebrow">${item.eyebrow ?? "Edit"}</p>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
          <div class="tag-row">
            ${item.tags.map((tag) => `<span class="tag tag-soft">${tag}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

export function renderProjects(items) {
  return items
    .map((item) => {
      const brandName = item.brand ?? "K-Beauty";
      const shortName =
        item.productName ??
        (item.title.startsWith(`${brandName} `) ? item.title.slice(brandName.length + 1) : item.title);
      const ingredient = item.details?.find((detail) => /ingredient/i.test(detail.label))?.value ?? "";
      const help = item.details?.find((detail) => /help/i.test(detail.label))?.value ?? "";
      const skinType =
        item.details?.find((detail) => /skin type|best for/i.test(detail.label))?.value ?? "All skin types";
      const skinTypes = (item.skinTypes ?? ["all"]).join(" ");
      const productMeta = item.meta && item.meta !== "Price by message" ? item.meta : "";

      return `
        <article class="product-card" data-skin-types="${skinTypes}" data-product-id="${item.id}">
          <div class="product-image-bg">
            <img src="${item.image}" alt="${item.imageAlt ?? item.title}" loading="lazy" />
          </div>
          <span class="tag">${item.cardTag ?? item.imageBadge ?? item.category}</span>
          <h3 class="product-name">${brandName}</h3>
          <div class="product-desc">${shortName}</div>
          <p class="product-details">
            <strong>Best ingredients:</strong> ${ingredient}<br />
            <strong>What it helps with:</strong> ${help}
          </p>
          <div class="product-footer">
            <span class="skin-type">Best for: ${skinType}</span>
            ${productMeta ? `<span class="product-meta">${productMeta}</span>` : ""}
          </div>
        </article>
      `;
    })
    .join("");
}

export function renderToolbox(items) {
  return items
    .map(
      (group) => `
        <article class="toolbox-card">
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
