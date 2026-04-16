import { readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { siteData } from '../src/data/site-data.js';

const STORE_DOMAIN = process.env.SHOPIFY_STORE ?? 'rolangbeauty.myshopify.com';
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2026-01';
const ONLINE_STORE_PUBLICATION_ID =
  process.env.SHOPIFY_ONLINE_STORE_PUBLICATION_ID ?? 'gid://shopify/Publication/337153851761';
const RAW_BASE = 'https://raw.githubusercontent.com/motkimlang76-tech/rolang-beauty/main/';
const STORE_CONFIG_PATH =
  process.env.SHOPIFY_STORE_CONFIG_PATH ??
  path.join(os.homedir(), 'Library/Preferences/shopify-cli-store-nodejs/config.json');
const OUTPUT_PATH = new URL('../shopify-import/rolang-live-catalog-report.json', import.meta.url);
const INVENTORY_SETTINGS = Object.freeze({
  tracked: false,
  inventoryPolicy: 'CONTINUE',
  requiresShipping: true,
});

const PRODUCT_PRICING = Object.freeze({
  'SKIN1004 Madagascar Centella Ampoule': 79,
  'SKIN1004 Hyalu-Cica Water-Fit Sun Serum': 85,
  'SKIN1004 Poremizing Fresh Ampoule': 79,
  'SKIN1004 Tea-Trica Relief Ampoule': 82,
  'SKIN1004 Tone Brightening Capsule Ampoule': 89,
  'SKIN1004 Centella Light Cleansing Oil': 89,
  'SKIN1004 Madagascar Centella Toning Toner': 69,
  'SKIN1004 Probio-Cica Intensive Ampoule': 89,
  'SKIN1004 Madagascar Centella Soothing Cream': 69,
  'SKIN1004 Tea-Trica B5 Cream': 79,
  'COSRX Advanced Snail 96 Mucin Essence': 85,
  'COSRX Advanced Snail 92 All In One Cream': 85,
  'COSRX Full Fit Propolis Synergy Toner': 79,
  'COSRX Low pH Good Morning Gel Cleanser': 59,
  'COSRX Aloe Soothing Sun Cream': 65,
  'COSRX BHA Blackhead Power Liquid': 79,
  'COSRX The Niacinamide 15 Serum': 79,
  'COSRX Advanced Snail Peptide Eye Cream': 99,
  'COSRX The Vitamin C 23 Serum': 89,
  'COSRX Acne Pimple Master Patch': 25,
  'COSRX Ultimate Nourishing Rice Overnight Spa Mask': 75,
  'Isntree Hyaluronic Acid Watery Sun Gel': 79,
  'Isntree Green Tea Fresh Toner': 69,
  'Isntree Onion Newpair Sun Cream': 89,
  'Isntree Yam Root Vegan Milk Cleanser': 69,
  'ANUA Heartleaf Pore Control Cleansing Oil': 89,
  'ANUA Heartleaf Quercetinol Pore Deep Cleansing Foam': 59,
  'ANUA Heartleaf 77% Soothing Toner': 89,
  'ANUA Heartleaf 77% Clear Pad': 89,
  'ANUA Heartleaf 80% Moisture Ampoule': 89,
  'ANUA Heartleaf 70% Daily Lotion': 72,
  'ANUA 3 Ceramide Panthenol Moisture Barrier Cream': 89,
  'ANUA Niacinamide 10% + TXA 4% Dark Spot Corrector Serum': 95,
  'ANUA Heartleaf Centella Red Spot Cream': 79,
  'ANUA Peach 70% Niacinamide Serum': 79,
  'ANUA Peach 77% Niacin Enriched Cream': 89,
  'ANUA Nano Retinol 0.3% + Niacin': 99,
  'ANUA Rice 70% Glow Milky Toner': 79,
  'ANUA Birch Moisture Boosting Serum': 89,
  'ANUA Green Lemon Vita C Serum': 95,
  'Medicube Collagen Night Wrapping Mask': 109,
  'Medicube Collagen Niacinamide Jelly Cream': 89,
  'Medicube PDRN Pink Peptide Serum': 99,
  'Medicube PDRN Pink Peptide Eye Cream': 89,
  'Medicube PDRN Pink Peptide Cream': 99,
  'Medicube Collagen Glow Sunscreen': 79,
  'Medicube Triple Collagen Cream': 99,
  'Medicube Triple Collagen Serum': 95,
  'Medicube PDRN Pink Collagen Capsule Cream': 99,
  'Medicube PDRN Pink Collagen Gel Toner Pad': 99,
  'Medicube PDRN Pink Niacinamide Toner': 89,
  'Medicube Zero Pore Pad 2.0': 99,
  'Medicube Deep Vita C Pads': 95,
  'Medicube Deep Vita C Ampoule': 95,
  'Medicube Zero Pore Serum': 89,
  'Medicube Red Succinic Acid Serum': 85,
  'Medicube Super Cica Ampoule': 89,
  'APLB Glutathione Niacinamide Ampoule': 79,
  'APLB Amino Acid Peptide Ampoule': 85,
  'APLB Spicule Collagen Shot 300': 109,
  'APLB Retinol Vitamin C Vitamin E Ampoule': 89,
  'APLB Salicylic Acid BHA Arbutin Ampoule': 79,
  'APLB Spicule Collagen Shot 300 Cream': 99,
  'APLB Glutathione Niacinamide Cream': 75,
  'APLB Retinol Vitamin C Vitamin E Cream': 79,
  'APLB Hyaluronic Acid Ceramide Cream': 72,
});

const LAUNCH_TITLES = new Set([
  'SKIN1004 Madagascar Centella Ampoule',
  'SKIN1004 Centella Light Cleansing Oil',
  'SKIN1004 Hyalu-Cica Water-Fit Sun Serum',
  'COSRX Advanced Snail 96 Mucin Essence',
  'COSRX Low pH Good Morning Gel Cleanser',
  'COSRX Acne Pimple Master Patch',
  'Isntree Hyaluronic Acid Watery Sun Gel',
  'ANUA Heartleaf Pore Control Cleansing Oil',
  'ANUA Heartleaf 77% Soothing Toner',
  'ANUA Peach 70% Niacinamide Serum',
  'Medicube Collagen Niacinamide Jelly Cream',
  'Medicube Zero Pore Pad 2.0',
]);

const COLLECTIONS = Object.freeze({
  'launch-edit': {
    title: 'Launch Edit',
    descriptionHtml:
      '<p>A tighter edit of first-pick products for calming care, glow support, daily cleansing, and easy SPF.</p>',
  },
  cleansers: {
    title: 'Cleansers',
    descriptionHtml:
      '<p>First-step oil, gel, and cream cleansers chosen to remove sunscreen, oil, and daily buildup without making routines feel harsh.</p>',
  },
  'daily-sunscreen': {
    title: 'Daily Sunscreen',
    descriptionHtml:
      '<p>Korean SPF picks for comfortable everyday protection, easier morning routines, and lightweight finishes that stay easy to rewear.</p>',
  },
  'toners-and-pads': {
    title: 'Toners & Pads',
    descriptionHtml:
      '<p>Prep, calm, or reset the routine with toners and pad formats that support hydration, balancing, glow, and gentle resurfacing.</p>',
  },
  'serums-and-ampoules': {
    title: 'Serums & Ampoules',
    descriptionHtml:
      '<p>Targeted ampoules, essences, liquids, and serums for calm skin, hydration, brightening, pore care, texture, and treatment-led results.</p>',
  },
  'creams-and-masks': {
    title: 'Creams & Masks',
    descriptionHtml:
      '<p>Finish the routine with creams, lotions, and masks built for barrier support, glow, texture care, and overnight comfort.</p>',
  },
  'calming-hydration': {
    title: 'Calming Hydration',
    descriptionHtml:
      '<p>Centella, heartleaf, cica, hyaluronic acid, snail, and barrier-first products for soft, calmer, better-supported skin.</p>',
  },
  'brightening-and-glow': {
    title: 'Brightening & Glow',
    descriptionHtml:
      '<p>Vitamin C, niacinamide, peach, rice, glutathione, and collagen-led picks for glow, clearer tone, and a brighter-looking routine.</p>',
  },
  'targeted-treatment': {
    title: 'Targeted Treatment',
    descriptionHtml:
      '<p>Focused options for pores, active breakouts, texture, retinol, exfoliating care, and more treatment-driven routines.</p>',
  },
});

let publicationAccessWarningShown = false;

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDescription(product) {
  const detailItems = (product.details ?? [])
    .map((detail) => {
      let label = detail.label;

      if (/^key ingredient/i.test(label)) {
        label = 'Best Ingredients';
      } else if (/^best skin type/i.test(label)) {
        label = 'Best For';
      }

      return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(detail.value)}</li>`;
    })
    .join('');

  return [
    `<p>${escapeHtml(product.description)}</p>`,
    detailItems ? `<ul>${detailItems}</ul>` : '',
  ].join('');
}

function buildSeoDescription(product) {
  const detailSummary = (product.details ?? [])
    .map((detail) => `${detail.label}: ${detail.value}`)
    .join(' ');

  return `${product.description} ${detailSummary}`.trim().slice(0, 320);
}

function buildTags(product) {
  const skinTypeTags = (product.skinTypes ?? []).map((item) => `${item[0].toUpperCase()}${item.slice(1)} Skin`);

  return Array.from(
    new Set([
      LAUNCH_TITLES.has(product.title) ? 'Launch Edit' : 'Full Catalog',
      product.brand,
      product.category,
      ...(product.stack ?? []).slice(0, 3),
      ...skinTypeTags,
    ].filter(Boolean)),
  );
}

function buildSku(product) {
  return `RB-${slugify(product.title).toUpperCase().replace(/-/g, '-')}`;
}

function buildInventoryMode(overrides = {}) {
  const inventoryMode = { ...INVENTORY_SETTINGS, ...overrides };

  return {
    ...inventoryMode,
    sellWhenOutOfStock: inventoryMode.inventoryPolicy === 'CONTINUE',
  };
}

function serializeReport(report) {
  return JSON.stringify(report, null, 2);
}

function normalizeReport(report) {
  const { generatedAt: _generatedAt, ...rest } = report;
  return serializeReport(rest);
}

function writeReportIfChanged(report) {
  try {
    const existingReport = JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'));

    if (normalizeReport(existingReport) === normalizeReport(report)) {
      return false;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT' && !(error instanceof SyntaxError)) {
      throw error;
    }
  }

  writeFileSync(OUTPUT_PATH, `${serializeReport(report)}\n`, 'utf8');
  return true;
}

function buildCollectionCoverage(products) {
  const unassignedProducts = products
    .filter((product) => product.collections.length === 0)
    .map(({ id, title, handle }) => ({
      id,
      title,
      handle,
    }));

  return {
    totalProductCount: products.length,
    assignedProductCount: products.length - unassignedProducts.length,
    unassignedProductCount: unassignedProducts.length,
    unassignedProducts,
  };
}

function loadStoreToken(storeDomain) {
  const config = JSON.parse(readFileSync(STORE_CONFIG_PATH, 'utf8'));
  const candidates = [];

  for (const entry of Object.values(config)) {
    const sessionsByUserId = entry?.myshopify?.com?.sessionsByUserId;
    if (!sessionsByUserId) continue;

    for (const session of Object.values(sessionsByUserId)) {
      if (!(session.scopes ?? []).includes('write_products')) continue;

      if (session?.store === storeDomain) {
        return session.accessToken;
      }

      candidates.push(session);
    }
  }

  if (candidates.length === 1) {
    return candidates[0].accessToken;
  }

  const candidateStores = candidates.map((session) => session.store).filter(Boolean);

  throw new Error(
    `No Shopify CLI store token with write_products scope found for ${storeDomain}. Available token stores: ${candidateStores.join(', ') || 'none'}.`,
  );
}

async function adminFetch(query, variables = {}) {
  const response = await fetch(`https://${STORE_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': loadStoreToken(STORE_DOMAIN),
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Shopify Admin API request failed (${response.status}): ${JSON.stringify(data)}`);
  }

  if (data.errors?.length) {
    throw new Error(`Shopify Admin API GraphQL errors: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

function assertNoUserErrors(action, userErrors) {
  if (!userErrors?.length) return;
  throw new Error(`${action} failed: ${JSON.stringify(userErrors)}`);
}

function buildCollectionHandles(product) {
  const keywordHaystack = [
    product.title,
    product.category,
    ...(product.stack ?? []),
  ]
    .join(' ')
    .toLowerCase();

  const detailHaystack = [
    product.description,
    ...(product.details ?? []).map((detail) => `${detail.label} ${detail.value}`),
  ]
    .join(' ')
    .toLowerCase();

  const haystack = `${keywordHaystack} ${detailHaystack}`.trim();

  const handles = new Set();

  if (LAUNCH_TITLES.has(product.title)) {
    handles.add('launch-edit');
  }

  if (/(cleanser|cleansing oil)/.test(keywordHaystack)) {
    handles.add('cleansers');
  }

  if (/(sun serum|sun gel|sun cream|sunscreen|spf|uv)/.test(keywordHaystack)) {
    handles.add('daily-sunscreen');
  }

  if (/(toner|pad)/.test(keywordHaystack)) {
    handles.add('toners-and-pads');
  }

  if (/(ampoule|serum|essence|liquid)/.test(keywordHaystack)) {
    handles.add('serums-and-ampoules');
  }

  if (/(cream|lotion|mask)/.test(keywordHaystack)) {
    handles.add('creams-and-masks');
  }

  if (
    /(centella|heartleaf|snail|cica|birch|yam root|ceramide|barrier|sooth|calm|repair|hydrating|hydration|dehydrated)/.test(
      haystack,
    )
  ) {
    handles.add('calming-hydration');
  }

  if (
    /(bright|vitamin c|glow|niacinamide|rice|peach|glutathione|tone|collagen|dark spot|pigment|hyperpigmentation)/.test(
      haystack,
    )
  ) {
    handles.add('brightening-and-glow');
  }

  if (/(pore|blackhead|acne|breakout|spot|bha|salicylic|tea-trica|retinol|texture|renew)/.test(haystack)) {
    handles.add('targeted-treatment');
  }

  return Array.from(handles);
}

async function publishToOnlineStore(id) {
  try {
    const data = await adminFetch(
      `
        mutation PublishToOnlineStore($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) {
            publishable {
              ... on Product {
                id
              }
              ... on Collection {
                id
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        id,
        input: [{ publicationId: ONLINE_STORE_PUBLICATION_ID }],
      },
    );

    assertNoUserErrors('publishablePublish', data.publishablePublish.userErrors);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('write_publications') || message.includes('publishablePublish field')) {
      if (!publicationAccessWarningShown) {
        console.warn(
          'Skipping Online Store publication because the current Shopify CLI token lacks write_publications. Products stay synced, but channel publishing still needs Shopify admin access.',
        );
        publicationAccessWarningShown = true;
      }

      return false;
    }

    throw error;
  }
}

async function findProductByHandle(handle) {
  const data = await adminFetch(
    `
      query FindProduct($query: String!) {
        products(first: 1, query: $query) {
          nodes {
            id
            title
            handle
            status
            featuredImage {
              url
            }
            variants(first: 1) {
              nodes {
                id
                price
              }
            }
          }
        }
      }
    `,
    { query: `handle:${handle}` },
  );

  return data.products.nodes[0] ?? null;
}

async function upsertProduct(product) {
  const handle = slugify(product.title);
  const existing = await findProductByHandle(handle);
  const media = [
    {
      originalSource: `${RAW_BASE}${product.image}`,
      alt: product.imageAlt ?? product.title,
      mediaContentType: 'IMAGE',
    },
  ];
  const price = PRODUCT_PRICING[product.title];

  if (typeof price !== 'number') {
    throw new Error(`Missing live price for ${product.title}.`);
  }

  const sharedInput = {
    title: product.title,
    handle,
    descriptionHtml: buildDescription(product),
    vendor: product.brand,
    productType: product.category,
    tags: buildTags(product),
    status: 'ACTIVE',
    seo: {
      title: product.title,
      description: buildSeoDescription(product),
    },
  };

  let savedProduct;

  if (existing) {
    const data = await adminFetch(
      `
        mutation UpdateProduct($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
          productUpdate(product: $product, media: $media) {
            product {
              id
              handle
              status
              featuredImage {
                url
              }
              variants(first: 1) {
                nodes {
                  id
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        product: {
          id: existing.id,
          ...sharedInput,
        },
        media: existing.featuredImage ? [] : media,
      },
    );

    assertNoUserErrors('productUpdate', data.productUpdate.userErrors);
    savedProduct = data.productUpdate.product;
  } else {
    const data = await adminFetch(
      `
        mutation CreateProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
          productCreate(product: $product, media: $media) {
            product {
              id
              handle
              status
              featuredImage {
                url
              }
              variants(first: 1) {
                nodes {
                  id
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        product: sharedInput,
        media,
      },
    );

    assertNoUserErrors('productCreate', data.productCreate.userErrors);
    savedProduct = data.productCreate.product;
  }

  const variantId = savedProduct?.variants?.nodes?.[0]?.id;

  if (!variantId) {
    throw new Error(`No default variant returned for ${product.title}.`);
  }

  const inventoryMode = buildInventoryMode({
    sku: buildSku(product),
  });
  const variantData = await adminFetch(
    `
      mutation UpdateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(
          productId: $productId
          variants: $variants
          allowPartialUpdates: false
        ) {
          productVariants {
            id
            price
            inventoryItem {
              tracked
              requiresShipping
              sku
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      productId: savedProduct.id,
      variants: [
        {
          id: variantId,
          price: price.toFixed(2),
          inventoryPolicy: inventoryMode.inventoryPolicy,
          taxable: true,
          inventoryItem: {
            sku: inventoryMode.sku,
            tracked: inventoryMode.tracked,
            requiresShipping: inventoryMode.requiresShipping,
          },
        },
      ],
    },
  );

  assertNoUserErrors('productVariantsBulkUpdate', variantData.productVariantsBulkUpdate.userErrors);
  await publishToOnlineStore(savedProduct.id);

  return {
    id: savedProduct.id,
    title: product.title,
    handle,
    price,
    collections: buildCollectionHandles(product),
    inventory: inventoryMode,
  };
}

async function findCollectionByHandle(handle) {
  const data = await adminFetch(
    `
      query FindCollection($query: String!) {
        collections(first: 1, query: $query) {
          nodes {
            id
            title
            handle
            products(first: 250) {
              nodes {
                id
              }
            }
          }
        }
      }
    `,
    { query: `handle:${handle}` },
  );

  return data.collections.nodes[0] ?? null;
}

async function upsertCollection(handle, config, productIds) {
  const existing = await findCollectionByHandle(handle);
  const collectionInput = {
    title: config.title,
    handle,
    descriptionHtml: config.descriptionHtml,
    sortOrder: 'MANUAL',
    seo: {
      title: `${config.title} | ROLANG BEAUTY`,
      description: config.descriptionHtml.replace(/<[^>]+>/g, '').slice(0, 320),
    },
  };

  if (productIds.length === 0) {
    return {
      id: existing?.id ?? null,
      title: config.title,
      handle,
      productCount: 0,
      skipped: true,
      reason: existing
        ? 'no_matching_products_existing_collection_left_unchanged'
        : 'no_matching_products_new_collection_not_created',
    };
  }

  if (existing) {
    const updateData = await adminFetch(
      `
        mutation UpdateCollection($input: CollectionInput!) {
          collectionUpdate(input: $input) {
            collection {
              id
              title
              handle
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        input: {
          id: existing.id,
          ...collectionInput,
        },
      },
    );

    assertNoUserErrors('collectionUpdate', updateData.collectionUpdate.userErrors);

    const currentProductIds = new Set(existing.products.nodes.map((product) => product.id));
    const missingProductIds = productIds.filter((id) => !currentProductIds.has(id));
    const removableProductIds = existing.products.nodes
      .map((product) => product.id)
      .filter((id) => !productIds.includes(id));

    if (missingProductIds.length > 0) {
      const addData = await adminFetch(
        `
          mutation AddProductsToCollection($id: ID!, $productIds: [ID!]!) {
            collectionAddProducts(id: $id, productIds: $productIds) {
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          id: existing.id,
          productIds: missingProductIds,
        },
      );

      assertNoUserErrors('collectionAddProducts', addData.collectionAddProducts.userErrors);
    }

    if (removableProductIds.length > 0) {
      const removeData = await adminFetch(
        `
          mutation RemoveProductsFromCollection($id: ID!, $productIds: [ID!]!) {
            collectionRemoveProducts(id: $id, productIds: $productIds) {
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          id: existing.id,
          productIds: removableProductIds,
        },
      );

      assertNoUserErrors('collectionRemoveProducts', removeData.collectionRemoveProducts.userErrors);
    }

    await publishToOnlineStore(existing.id);

    return {
      id: existing.id,
      title: config.title,
      handle,
      productCount: productIds.length,
      skipped: false,
    };
  }

  const createData = await adminFetch(
    `
      mutation CreateCollection($input: CollectionInput!) {
        collectionCreate(input: $input) {
          collection {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      input: {
        ...collectionInput,
        products: productIds,
      },
    },
  );

  assertNoUserErrors('collectionCreate', createData.collectionCreate.userErrors);
  await publishToOnlineStore(createData.collectionCreate.collection.id);

  return {
    id: createData.collectionCreate.collection.id,
    title: config.title,
    handle,
    productCount: productIds.length,
    skipped: false,
  };
}

async function main() {
  const savedProducts = [];

  for (const product of siteData.projects) {
    const saved = await upsertProduct(product);
    savedProducts.push(saved);
  }

  const collectionCoverage = buildCollectionCoverage(savedProducts);
  const collectionEntries = [];
  const skippedCollections = [];

  for (const [handle, config] of Object.entries(COLLECTIONS)) {
    const productIds = savedProducts
      .filter((product) => product.collections.includes(handle))
      .map((product) => product.id);

    const savedCollection = await upsertCollection(handle, config, productIds);
    if (savedCollection.skipped) {
      skippedCollections.push(savedCollection);

      const scope = savedCollection.id ? 'left the existing collection unchanged' : 'did not create a new collection';
      console.warn(`Skipping collection ${handle}: no matching products; ${scope}.`);
      continue;
    }

    collectionEntries.push(savedCollection);
  }

  const report = {
    store: STORE_DOMAIN,
    generatedAt: new Date().toISOString(),
    onlineStorePublication:
      publicationAccessWarningShown ? 'skipped_missing_write_publications_scope' : 'published',
    inventoryMode: {
      ...buildInventoryMode(),
      productCount: savedProducts.length,
    },
    collectionCoverage,
    products: savedProducts,
    collections: collectionEntries,
    skippedCollections,
  };

  const reportWritten = writeReportIfChanged(report);

  console.log(`Synced ${savedProducts.length} live catalog products to ${STORE_DOMAIN}`);
  console.log(`Prepared ${collectionEntries.length} collections`);
  console.log(`Skipped ${skippedCollections.length} empty collections without mutating Shopify`);
  if (collectionCoverage.unassignedProductCount > 0) {
    const previewTitles = collectionCoverage.unassignedProducts
      .slice(0, 5)
      .map((product) => product.title)
      .join(', ');
    const remainingCount = collectionCoverage.unassignedProductCount - Math.min(collectionCoverage.unassignedProductCount, 5);
    const remainingLabel = remainingCount > 0 ? `, plus ${remainingCount} more` : '';
    console.warn(`Products without a derived collection assignment: ${previewTitles}${remainingLabel}.`);
  }
  console.log(
    `Inventory mode: tracked=${INVENTORY_SETTINGS.tracked}, inventoryPolicy=${INVENTORY_SETTINGS.inventoryPolicy}, requiresShipping=${INVENTORY_SETTINGS.requiresShipping}`,
  );
  if (reportWritten) {
    console.log(`Wrote report to ${OUTPUT_PATH.pathname}`);
  } else {
    console.log(`Report contents unchanged; left ${OUTPUT_PATH.pathname} untouched`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
