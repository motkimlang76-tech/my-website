import { writeFileSync } from 'node:fs';
import { siteData } from '../src/data/site-data.js';

const RAW_BASE = 'https://raw.githubusercontent.com/motkimlang76-tech/rolang-beauty/main/';
const OUTPUT_PATH = new URL('../shopify-import/rolang-products.csv', import.meta.url);

const HEADERS = [
  'Title',
  'URL handle',
  'Description',
  'Vendor',
  'Type',
  'Tags',
  'Published on online store',
  'Status',
  'Option1 name',
  'Option1 value',
  'Price',
  'Charge tax',
  'Inventory tracker',
  'Inventory quantity',
  'Continue selling when out of stock',
  'Weight value (grams)',
  'Weight unit for display',
  'Requires shipping',
  'Fulfillment service',
  'Product image URL',
  'Image position',
  'Image alt text',
  'SEO title',
  'SEO description',
];

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

function csvCell(value) {
  const normalized = value == null ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
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

function buildTags(product) {
  const tagValues = [
    `brand-${slugify(product.brand)}`,
    `category-${slugify(product.category)}`,
    ...(product.skinTypes ?? []).map((item) => `skin-${slugify(item)}`),
    ...(product.stack ?? []).map((item) => slugify(item)),
    product.cardTag ? `card-${slugify(product.cardTag)}` : null,
    product.featured ? 'featured' : null,
  ].filter(Boolean);

  return Array.from(new Set(tagValues)).join(', ');
}

function buildSeoDescription(product) {
  const details = (product.details ?? []).map((detail) => `${detail.label}: ${detail.value}`).join(' ');
  const combined = `${product.description} ${details}`.trim();
  return combined.slice(0, 320);
}

const rows = siteData.projects.map((product) => {
  const handle = slugify(product.title);

  return [
    product.title,
    handle,
    buildDescription(product),
    product.brand,
    product.category,
    buildTags(product),
    'false',
    'draft',
    'Default Title',
    'Default Title',
    '',
    'true',
    '',
    '0',
    'deny',
    '0',
    'g',
    'true',
    'manual',
    `${RAW_BASE}${product.image}`,
    '1',
    product.imageAlt ?? product.title,
    product.title,
    buildSeoDescription(product),
  ];
});

const csv = [HEADERS, ...rows]
  .map((row) => row.map(csvCell).join(','))
  .join('\n');

writeFileSync(OUTPUT_PATH, `${csv}\n`, 'utf8');
console.log(`Wrote ${rows.length} products to ${OUTPUT_PATH.pathname}`);
