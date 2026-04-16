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
const OUTPUT_PATH = new URL('../shopify-import/rolang-launch-report.json', import.meta.url);
const INVENTORY_SETTINGS = Object.freeze({
  tracked: false,
  inventoryPolicy: 'CONTINUE',
  requiresShipping: true,
});
let publicationAccessWarningShown = false;

// Rounded MYR launch pricing based on current April 2026 market checks.
const LAUNCH_PRODUCTS = [
  {
    title: 'SKIN1004 Madagascar Centella Ampoule',
    price: 79,
    collections: ['launch-edit', 'calming-hydration'],
  },
  {
    title: 'SKIN1004 Centella Light Cleansing Oil',
    price: 89,
    collections: ['launch-edit', 'cleansers'],
  },
  {
    title: 'SKIN1004 Hyalu-Cica Water-Fit Sun Serum',
    price: 85,
    collections: ['launch-edit', 'daily-sunscreen'],
  },
  {
    title: 'COSRX Advanced Snail 96 Mucin Essence',
    price: 85,
    collections: ['launch-edit', 'calming-hydration'],
  },
  {
    title: 'COSRX Low pH Good Morning Gel Cleanser',
    price: 59,
    collections: ['launch-edit', 'cleansers'],
  },
  {
    title: 'COSRX Acne Pimple Master Patch',
    price: 25,
    collections: ['launch-edit', 'targeted-treatment'],
  },
  {
    title: 'Isntree Hyaluronic Acid Watery Sun Gel',
    price: 79,
    collections: ['launch-edit', 'daily-sunscreen'],
  },
  {
    title: 'ANUA Heartleaf 77% Soothing Toner',
    price: 89,
    collections: ['launch-edit', 'calming-hydration'],
  },
  {
    title: 'ANUA Peach 70% Niacinamide Serum',
    price: 79,
    collections: ['launch-edit', 'targeted-treatment'],
  },
  {
    title: 'Medicube Collagen Niacinamide Jelly Cream',
    price: 89,
    collections: ['launch-edit', 'targeted-treatment'],
  },
  {
    title: 'Medicube Zero Pore Pad 2.0',
    price: 99,
    collections: ['launch-edit', 'targeted-treatment'],
  },
];

const COLLECTIONS = {
  'launch-edit': {
    title: 'Rolang Edit',
    descriptionHtml:
      '<p>A focused edit of everyday Korean skincare for cleansing, soothing hydration, daily SPF, and targeted treatment.</p>',
    imageSrc: 'src/assets/products/skin1004/centella-ampoule.png',
  },
  cleansers: {
    title: 'Cleansers',
    descriptionHtml:
      '<p>Gentle oil and gel cleansers chosen to remove sunscreen, makeup, and daily buildup without making skin feel stripped.</p>',
    imageSrc: 'src/assets/products/skin1004/centella-light-cleansing-oil.png',
  },
  'daily-sunscreen': {
    title: 'Daily Sunscreen',
    descriptionHtml:
      '<p>Comfortable Korean SPF picks for daily protection, easy layering, and finishes that stay light through the day.</p>',
    imageSrc: 'src/assets/products/isntree/hyaluronic-acid-watery-sun-gel.png',
  },
  'calming-hydration': {
    title: 'Calming Hydration',
    descriptionHtml:
      '<p>Centella, snail mucin, and heartleaf-led products that help keep skin calm, hydrated, and comfortably supported.</p>',
    imageSrc: 'src/assets/products/anua/heartleaf-77-soothing-toner.png',
  },
  'targeted-treatment': {
    title: 'Targeted Treatment',
    descriptionHtml:
      '<p>Focused products for breakouts, visible pores, texture, and tone when the routine needs a more targeted step.</p>',
    imageSrc: 'src/assets/products/medicube/zero-pore-pad-2.0-clean.png',
  },
};

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
    .map((detail) => `<li><strong>${escapeHtml(detail.label)}:</strong> ${escapeHtml(detail.value)}</li>`)
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
      'Rolang Edit',
      product.brand,
      product.category,
      ...(product.stack ?? []).slice(0, 2),
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

async function deleteProductByHandle(handle) {
  const existing = await findProductByHandle(handle);
  if (!existing) return null;

  const data = await adminFetch(
    `
      mutation DeleteProduct($input: ProductDeleteInput!, $synchronous: Boolean!) {
        productDelete(input: $input, synchronous: $synchronous) {
          deletedProductId
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      input: { id: existing.id },
      synchronous: true,
    },
  );

  assertNoUserErrors('productDelete', data.productDelete.userErrors);
  return data.productDelete.deletedProductId;
}

async function upsertProduct(product, launchConfig) {
  const handle = slugify(product.title);
  const existing = await findProductByHandle(handle);
  const media = [
    {
      originalSource: `${RAW_BASE}${product.image}`,
      alt: product.imageAlt ?? product.title,
      mediaContentType: 'IMAGE',
    },
  ];
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
          price: launchConfig.price.toFixed(2),
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
    price: launchConfig.price,
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
            products(first: 100) {
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
    ...(config.imageSrc
      ? {
          image: {
            altText: `${config.title} collection image`,
            src: `${RAW_BASE}${config.imageSrc}`,
          },
        }
      : {}),
    seo: {
      title: `${config.title} | ROLANG BEAUTY`,
      description: config.descriptionHtml.replace(/<[^>]+>/g, '').slice(0, 320),
    },
  };

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

    await publishToOnlineStore(existing.id);

    return {
      id: existing.id,
      title: config.title,
      handle,
      productCount: productIds.length,
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
  };
}

async function main() {
  const productLookup = new Map(siteData.projects.map((product) => [product.title, product]));
  const savedProducts = [];

  await deleteProductByHandle('rolang-publish-test');

  for (const launchProduct of LAUNCH_PRODUCTS) {
    const product = productLookup.get(launchProduct.title);

    if (!product) {
      throw new Error(`Missing product in siteData.projects: ${launchProduct.title}`);
    }

    const saved = await upsertProduct(product, launchProduct);
    savedProducts.push(saved);
  }

  const collectionEntries = [];

  for (const [handle, config] of Object.entries(COLLECTIONS)) {
    const productIds = savedProducts
      .filter((item) => LAUNCH_PRODUCTS.find((product) => product.title === item.title)?.collections.includes(handle))
      .map((item) => item.id);

    if (productIds.length === 0) continue;

    const savedCollection = await upsertCollection(handle, config, productIds);
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
    products: savedProducts,
    collections: collectionEntries,
  };

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`Synced ${savedProducts.length} launch products to ${STORE_DOMAIN}`);
  console.log(`Prepared ${collectionEntries.length} collections`);
  console.log(
    `Inventory mode: tracked=${INVENTORY_SETTINGS.tracked}, inventoryPolicy=${INVENTORY_SETTINGS.inventoryPolicy}, requiresShipping=${INVENTORY_SETTINGS.requiresShipping}`,
  );
  console.log(`Wrote report to ${OUTPUT_PATH.pathname}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
