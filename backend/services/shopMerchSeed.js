const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');

const MERCH_IMAGES = {
  tee: '/shop/fx-logo-tee.png',
  mug: '/shop/fx-logo-mug.png',
  hoodie: '/shop/fx-logo-hoodie.png',
  cap: '/shop/fx-logo-cap.png',
  tote: '/shop/fx-logo-tote.png'
};

const MERCH_CATEGORY = {
  name: 'Merchandise',
  slug: 'merchandise',
  description: 'Branded apparel and accessories with TheFX Navigators logo.',
  sortOrder: 1,
  isActive: true
};

const MERCH_PRODUCTS = [
  {
    productId: 'fx-logo-tee',
    name: 'Logo Imprint T-Shirt',
    status: 'published',
    shortDescription: 'Premium cotton tee with the FX Navigators logo front print.',
    longDescription:
      'Soft, everyday cotton tee featuring our signature FN mark in full color on the chest. ' +
      'Unisex fit. Machine washable. A clean way to rep the community on session days or casual wear.',
    outcomePromise: 'Show your navigator pride in comfort.',
    category: 'Merchandise',
    tags: ['apparel', 't-shirt', 'logo', 'merch'],
    requirements: 'Allow 5–10 business days for production and shipping after payment confirmation.',
    currentVersion: 'v1.0',
    price: 28,
    primaryImage: MERCH_IMAGES.tee
  },
  {
    productId: 'fx-logo-mug',
    name: 'Logo Imprint Mug',
    status: 'published',
    shortDescription: 'Ceramic mug with FX Navigators logo — perfect for pre-market coffee.',
    longDescription:
      '11oz ceramic mug with a durable full-wrap style logo imprint. Microwave and dishwasher safe. ' +
      'Start your trading morning with a branded cup built for daily use.',
    outcomePromise: 'Your morning chart review, upgraded.',
    category: 'Merchandise',
    tags: ['drinkware', 'mug', 'logo', 'merch'],
    requirements: 'Allow 5–10 business days for production and shipping after payment confirmation.',
    currentVersion: 'v1.0',
    price: 16,
    primaryImage: MERCH_IMAGES.mug
  },
  {
    productId: 'fx-logo-hoodie',
    name: 'Logo Imprint Hoodie',
    status: 'published',
    shortDescription: 'Mid-weight hoodie with embroidered-style FX Navigators logo.',
    longDescription:
      'Cozy fleece-lined hoodie with our logo on the chest and a subtle mark on the sleeve. ' +
      'Ideal for late sessions, travel, and community meetups. Unisex sizing.',
    outcomePromise: 'Stay warm while you navigate the markets.',
    category: 'Merchandise',
    tags: ['apparel', 'hoodie', 'logo', 'merch'],
    requirements: 'Allow 7–14 business days for production and shipping after payment confirmation.',
    currentVersion: 'v1.0',
    price: 55,
    primaryImage: MERCH_IMAGES.hoodie
  },
  {
    productId: 'fx-logo-cap',
    name: 'Logo Imprint Cap',
    status: 'published',
    shortDescription: 'Adjustable cap with FX Navigators logo on the front panel.',
    longDescription:
      'Structured cap with embroidered logo, adjustable strap, and breathable panels. ' +
      'Lightweight for desk days or outdoor events.',
    outcomePromise: 'Low-profile brand visibility.',
    category: 'Merchandise',
    tags: ['apparel', 'cap', 'hat', 'logo', 'merch'],
    requirements: 'Allow 5–10 business days for production and shipping after payment confirmation.',
    currentVersion: 'v1.0',
    price: 22,
    primaryImage: MERCH_IMAGES.cap
  },
  {
    productId: 'fx-logo-tote',
    name: 'Logo Imprint Tote Bag',
    status: 'published',
    shortDescription: 'Canvas tote with bold FX Navigators logo print.',
    longDescription:
      'Sturdy canvas tote for notebooks, gear, or event swag. Reinforced handles and a spacious main compartment ' +
      'with centered logo imprint.',
    outcomePromise: 'Carry the brand wherever you go.',
    category: 'Merchandise',
    tags: ['accessories', 'tote', 'bag', 'logo', 'merch'],
    requirements: 'Allow 5–10 business days for production and shipping after payment confirmation.',
    currentVersion: 'v1.0',
    price: 24,
    primaryImage: MERCH_IMAGES.tote
  }
];

function ensureMerchAssets() {
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'products');
  const publicShopDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'shop');
  const mobileLogo = path.join(__dirname, '..', '..', 'mobile_app', 'assets', 'images', 'logo.png');

  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const merchFiles = Object.values(MERCH_IMAGES).map((url) => path.basename(url));
  for (const file of merchFiles) {
    const destUpload = path.join(uploadsDir, file);
    if (fs.existsSync(destUpload)) continue;
    const srcPublic = path.join(publicShopDir, file);
    if (fs.existsSync(srcPublic)) fs.copyFileSync(srcPublic, destUpload);
  }

  const logoUpload = path.join(uploadsDir, 'fx-navigators-logo-imprint.png');
  if (!fs.existsSync(logoUpload) && fs.existsSync(mobileLogo)) {
    fs.copyFileSync(mobileLogo, logoUpload);
  }
}

/**
 * Idempotent seed for shop merchandise (categories + published products).
 */
async function ensureShopMerchDefaults() {
  ensureMerchAssets();

  await ProductCategory.updateOne(
    { slug: MERCH_CATEGORY.slug },
    { $setOnInsert: MERCH_CATEGORY },
    { upsert: true }
  );

  for (const def of MERCH_PRODUCTS) {
    const { primaryImage, ...rest } = def;
    const insertFields = {
      ...rest,
      galleryImages: def.galleryImages || [],
      seoTitle: def.seoTitle || `${def.name} | TheFX Navigators Shop`,
      seoMetaDescription:
        def.seoMetaDescription ||
        def.shortDescription ||
        `Official FX Navigators merchandise — ${def.name}.`
    };
    await Product.updateOne(
      { productId: def.productId },
      {
        $set: { primaryImage },
        $setOnInsert: insertFields
      },
      { upsert: true }
    );
  }
}

module.exports = { ensureShopMerchDefaults, MERCH_PRODUCTS, MERCH_CATEGORY };
