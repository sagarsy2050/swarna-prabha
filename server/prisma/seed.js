import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const env = (k, d) => process.env[k] || d;

// Seed-account passwords are NEVER hard-coded — set them in server/.env
// (SEED_ADMIN_PASSWORD / SEED_JEWELLER_PASSWORD / SEED_CUSTOMER_PASSWORD).
// server/.env.example ships placeholders so the standard `cp .env.example .env`
// flow still produces a working login.
function seedPassword(key) {
  const v = process.env[key];
  if (!v) {
    console.error(
      `\n${key} is not set. Set it in server/.env before running the seed ` +
        `(server/.env.example has a placeholder). No default password is committed.\n`,
    );
    process.exit(1);
  }
  return v;
}

const IMAGES_ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'jewellery-images');
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;

function folderImages(folder) {
  try {
    return fs
      .readdirSync(path.join(IMAGES_ROOT, folder))
      .filter((f) => IMAGE_RE.test(f))
      .sort();
  } catch {
    return [];
  }
}

async function upsertUser({ email, password, role, fullName, phone }) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: { role, fullName, phone },
    create: { email, passwordHash, role, fullName, phone },
  });
}

const CATEGORIES = [
  { code: 'RING', name: 'Rings', slug: 'rings', folder: 'rings', sortOrder: 10, description: 'Engagement, wedding and everyday rings.' },
  { code: 'EARRING', name: 'Earrings', slug: 'earrings', folder: 'earrings', sortOrder: 20, description: 'Studs, drops, hoops and jhumkas.' },
  { code: 'NECKLACE', name: 'Necklaces', slug: 'necklaces', folder: 'necklaces', sortOrder: 30, description: 'Chains, pendants and statement necklaces.' },
  { code: 'BANGLE', name: 'Bangles', slug: 'bangles', folder: 'bangles', sortOrder: 40, description: 'Traditional and contemporary bangles.' },
  { code: 'BRACELET', name: 'Bracelets', slug: 'bracelets', folder: 'bracelets', sortOrder: 50, description: 'Tennis, chain and charm bracelets.' },
  { code: 'BRIDAL', name: 'Bridal Jewellery', slug: 'bridal-jewellery', folder: 'bridal', sortOrder: 60, description: 'Complete bridal sets and heirloom pieces.' },
];

const METALS = [
  { metal: 'Yellow Gold', purity: '22K' },
  { metal: 'Yellow Gold', purity: '18K' },
  { metal: 'White Gold', purity: '18K' },
  { metal: 'Rose Gold', purity: '18K' },
  { metal: 'Platinum', purity: 'PT950' },
  { metal: 'Silver', purity: '925' },
];
const STONES = ['None', 'Diamond', 'Ruby', 'Emerald', 'Sapphire', 'Pearl'];
const NAME_PREFIX = {
  rings: ['Aurelia', 'Solace', 'Meridian', 'Halo', 'Verona', 'Iris'],
  earrings: ['Lumen', 'Cascade', 'Petal', 'Dewdrop', 'Marigold', 'Aria'],
  necklaces: ['Riviera', 'Aroha', 'Celeste', 'Harbour', 'Rani', 'Lyra'],
  bangles: ['Kada', 'Chandra', 'Vaya', 'Ember', 'Surya', 'Lotus'],
  bracelets: ['Meridian', 'Linea', 'Tennis', 'Charmé', 'Anvi', 'Cuff'],
  bridal: ['Vivaha', 'Zaria', 'Anokhi', 'Rajmahal', 'Noor', 'Kalyani'],
};
const NAME_SUFFIX = {
  rings: 'Ring', earrings: 'Earrings', necklaces: 'Necklace', bangles: 'Bangle', bracelets: 'Bracelet', bridal: 'Bridal Set',
};

// deterministic pseudo-random from an integer
const pick = (arr, n) => arr[n % arr.length];

async function main() {
  const admin = await upsertUser({
    email: env('SEED_ADMIN_EMAIL', 'admin@swarnaprabha.local'),
    password: seedPassword('SEED_ADMIN_PASSWORD'),
    role: 'ADMIN',
    fullName: 'Swarna Prabha Admin',
  });

  const jewellerDefs = [
    {
      email: env('SEED_JEWELLER_EMAIL', 'jeweller@swarnaprabha.local'),
      password: seedPassword('SEED_JEWELLER_PASSWORD'),
      fullName: 'Amara Sen',
      shop: {
        shopName: 'Amara Fine Jewellery',
        slug: 'amara-fine-jewellery',
        description: 'Handcrafted gold and diamond jewellery since 1978.',
        addressLine1: '14 Residency Road',
        city: 'Bengaluru',
        region: 'Karnataka',
        postalCode: '560025',
        country: 'India',
        phone: '+91 80 2222 1010',
        email: 'hello@amarajewellery.example',
        openingHours: { mon: '10:30-19:30', tue: '10:30-19:30', wed: '10:30-19:30', thu: '10:30-19:30', fri: '10:30-19:30', sat: '10:30-20:00', sun: 'closed' },
        appointmentSlots: { mon: ['11:00', '12:00', '15:00', '16:00', '17:00'], tue: ['11:00', '12:00', '15:00', '16:00', '17:00'], wed: ['11:00', '12:00', '15:00', '16:00', '17:00'], thu: ['11:00', '12:00', '15:00', '16:00', '17:00'], fri: ['11:00', '12:00', '15:00', '16:00', '17:00'], sat: ['11:00', '12:00', '13:00', '16:00', '17:00', '18:00'] },
      },
    },
    {
      email: 'jeweller2@swarnaprabha.local',
      password: seedPassword('SEED_JEWELLER_PASSWORD'),
      fullName: 'Rohan Mehta',
      shop: {
        shopName: 'Mehta & Sons',
        slug: 'mehta-and-sons',
        description: 'Contemporary platinum and diamond studio.',
        addressLine1: 'Shop 7, Linking Road',
        city: 'Mumbai',
        region: 'Maharashtra',
        postalCode: '400050',
        country: 'India',
        phone: '+91 22 2600 4545',
        email: 'care@mehtaandsons.example',
        openingHours: { mon: '11:00-20:00', tue: '11:00-20:00', wed: '11:00-20:00', thu: '11:00-20:00', fri: '11:00-20:00', sat: '11:00-20:30', sun: '12:00-18:00' },
        appointmentSlots: { mon: ['11:30', '12:30', '14:30', '16:30', '18:00'], tue: ['11:30', '12:30', '14:30', '16:30', '18:00'], wed: ['11:30', '12:30', '14:30', '16:30', '18:00'], thu: ['11:30', '12:30', '14:30', '16:30', '18:00'], fri: ['11:30', '12:30', '14:30', '16:30', '18:00'], sat: ['11:30', '12:30', '13:30', '15:30', '17:30'], sun: ['13:00', '14:00', '15:00', '16:00'] },
      },
    },
  ];

  const jewellers = [];
  for (const def of jewellerDefs) {
    const user = await upsertUser({ email: def.email, password: def.password, role: 'JEWELLER', fullName: def.fullName, phone: def.shop.phone });
    await prisma.jewellerProfile.upsert({
      where: { userId: user.id },
      update: { ...def.shop, verified: true, active: true },
      create: { userId: user.id, ...def.shop, verified: true, active: true },
    });
    jewellers.push(user);
  }

  const customer = await upsertUser({
    email: env('SEED_CUSTOMER_EMAIL', 'customer@swarnaprabha.local'),
    password: seedPassword('SEED_CUSTOMER_PASSWORD'),
    role: 'CUSTOMER',
    fullName: 'Riya Kapoor',
  });
  await prisma.customerProfile.upsert({
    where: { userId: customer.id },
    update: {},
    create: { userId: customer.id, address: '22 Palm Grove, Chennai 600028, India' },
  });

  // Categories
  for (const c of CATEGORIES) {
    await prisma.jewelleryCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, slug: c.slug, folder: c.folder, sortOrder: c.sortOrder, description: c.description, active: true },
      create: { ...c, active: true },
    });
  }

  // Products — built only from real files in each category's folder.
  let created = 0;
  let n = 0;
  for (const c of CATEGORIES) {
    const files = folderImages(c.folder);
    if (files.length === 0) {
      console.log(`  ${c.folder}: no images — category left empty`);
      continue;
    }
    const category = await prisma.jewelleryCategory.findUnique({ where: { code: c.code } });
    // One product per available image in the folder — use the whole curated set.
    const perCat = files.length;
    const pool = files.length;
    for (let i = 0; i < perCat; i += 1) {
      n += 1;
      const jeweller = jewellers[i % jewellers.length];
      const mp = pick(METALS, n);
      const stone = pick(STONES, n + 2);
      const gen = Math.floor(i / NAME_PREFIX[c.folder].length);
      const name = `${pick(NAME_PREFIX[c.folder], i)} ${NAME_SUFFIX[c.folder]}${gen ? ` ${['', 'II', 'III', 'IV'][gen]}` : ''}`;
      const externalId = `${c.code}-${String(i + 1).padStart(2, '0')}`;
      const basePrice = 4500 + ((n * 971) % 90) * 500; // ₹4,500 – ₹49,500, deterministic
      const weight = 2 + ((n * 37) % 220) / 10; // 2.0 – 24.0 g
      // 2–3 distinct images per product, spread across the folder.
      const step = Math.max(1, Math.floor(pool / 3));
      const imgs = [i, i + step, i + 2 * step]
        .map((k) => files[k % pool])
        .filter((v, idx, a) => a.indexOf(v) === idx);

      const existing = await prisma.product.findFirst({ where: { name, jewellerId: jeweller.id, categoryId: category.id } });
      const data = {
        name,
        categoryId: category.id,
        jewellerId: jeweller.id,
        description: `${mp.purity} ${mp.metal.toLowerCase()} ${NAME_SUFFIX[c.folder].toLowerCase()}${stone !== 'None' ? ` set with ${stone.toLowerCase()}` : ''}. Hallmarked. Ref ${externalId}.`,
        metal: mp.metal,
        purity: mp.purity,
        weightGrams: weight,
        stone: stone === 'None' ? null : stone,
        price: basePrice,
        currency: 'INR',
        stock: (n % 4 === 0) ? 0 : 3 + (n % 6),
        availability: n % 7 === 0 ? 'MADE_TO_ORDER' : 'IN_STOCK',
        isPublished: true,
      };
      const imageRows = imgs.map((f, idx) => ({ folder: c.folder, path: f, sortOrder: idx, isPrimary: idx === 0 }));

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { ...data, images: { deleteMany: {}, create: imageRows } },
        });
      } else {
        await prisma.product.create({ data: { ...data, images: { create: imageRows } } });
        created += 1;
      }
    }
    console.log(`  ${c.folder}: ${perCat} products from ${files.length} images`);
  }

  // Inventory for jeweller 1
  const inventory = [
    { sku: 'AU22-GRAIN', name: '22K Gold Grain', category: 'metal', material: 'gold', quantity: 40, unitCost: 6200, reorderLevel: 10 },
    { sku: 'DIA-RB-050', name: 'Round Brilliant 0.5ct', category: 'stone', material: 'diamond', quantity: 12, unitCost: 85000, reorderLevel: 3 },
    { sku: 'PT950-SHEET', name: 'Platinum Sheet 2mm', category: 'metal', material: 'platinum', quantity: 8, unitCost: 14000, reorderLevel: 4 },
  ];
  for (const item of inventory) {
    await prisma.inventoryItem.upsert({
      where: { sku: item.sku },
      update: { quantity: item.quantity },
      create: { ...item, jewellerId: jewellers[0].id },
    });
  }

  console.log(`Seed complete — ${created} new products.`);
  console.table([
    { role: 'ADMIN', email: admin.email },
    ...jewellers.map((j) => ({ role: 'JEWELLER', email: j.email })),
    { role: 'CUSTOMER', email: customer.email },
  ]);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
