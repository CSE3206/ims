/**
 * Seed the database with demo data so a fresh clone has something to look at.
 *
 *   npm run db:seed
 *
 * The script is destructive: it clears the tables it owns first, so it can be
 * run repeatedly without piling up duplicates.
 */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from './index.js';
import {
  users,
  categories,
  suppliers,
  products,
  purchaseOrders,
  purchaseOrderItems,
  salesOrders,
  salesOrderItems,
  stockMovements,
} from './schema.js';

const password = 'password123';

async function seed() {
  console.log('Clearing existing data...');
  // Child tables first — foreign keys are RESTRICT in places.
  await db.delete(salesOrderItems);
  await db.delete(salesOrders);
  await db.delete(purchaseOrderItems);
  await db.delete(purchaseOrders);
  await db.delete(stockMovements);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(suppliers);
  await db.delete(users);

  console.log('Seeding users...');
  const passwordHash = await bcrypt.hash(password, 10);
  const [admin, manager, staff] = await db
    .insert(users)
    .values([
      { name: 'Evan', email: 'evan@ims.local', passwordHash, role: 'admin' },
      { name: 'Najmul', email: 'najmul@ims.local', passwordHash, role: 'manager' },
      { name: 'Rukaiya', email: 'rukaiya@ims.local', passwordHash, role: 'staff' },
    ])
    .returning();

  console.log('Seeding categories...');
  const categoryRows = await db
    .insert(categories)
    .values([
      { name: 'Laptops', description: 'Portable computers and notebooks' },
      { name: 'Peripherals', description: 'Keyboards, mice, webcams and docks' },
      { name: 'Networking', description: 'Routers, switches and cabling' },
      { name: 'Storage', description: 'SSDs, hard drives and memory cards' },
      { name: 'Accessories', description: 'Bags, cables, adapters and stands' },
    ])
    .returning();
  const cat = Object.fromEntries(categoryRows.map((c) => [c.name, c.id]));

  console.log('Seeding suppliers...');
  const supplierRows = await db
    .insert(suppliers)
    .values([
      {
        name: 'Northern Tech Distribution',
        contactPerson: 'Sadia Rahman',
        email: 'sales@northerntech.example',
        phone: '+880 1711 000111',
        address: 'Plot 14, Banani, Dhaka',
      },
      {
        name: 'Bay Components Ltd',
        contactPerson: 'Imran Hossain',
        email: 'orders@baycomponents.example',
        phone: '+880 1811 222333',
        address: 'Agrabad C/A, Chattogram',
      },
      {
        name: 'GlobalLink Imports',
        contactPerson: 'Farhana Akter',
        email: 'hello@globallink.example',
        phone: '+880 1911 444555',
        address: 'Gulshan 2, Dhaka',
      },
    ])
    .returning();
  const sup = Object.fromEntries(supplierRows.map((s) => [s.name, s.id]));

  console.log('Seeding products...');
  const productRows = await db
    .insert(products)
    .values([
      { sku: 'LAP-1001', name: 'ProBook 14 i5', categoryId: cat.Laptops, supplierId: sup['Northern Tech Distribution'], costPrice: '58000.00', sellingPrice: '69500.00', quantity: 24, reorderLevel: 8 },
      { sku: 'LAP-1002', name: 'ProBook 15 i7', categoryId: cat.Laptops, supplierId: sup['Northern Tech Distribution'], costPrice: '84000.00', sellingPrice: '98000.00', quantity: 11, reorderLevel: 6 },
      { sku: 'LAP-1003', name: 'UltraSlim 13 Ryzen 5', categoryId: cat.Laptops, supplierId: sup['GlobalLink Imports'], costPrice: '61000.00', sellingPrice: '74000.00', quantity: 4, reorderLevel: 6 },
      { sku: 'PER-2001', name: 'Mechanical Keyboard TKL', categoryId: cat.Peripherals, supplierId: sup['Bay Components Ltd'], costPrice: '3200.00', sellingPrice: '4600.00', quantity: 78, reorderLevel: 25 },
      { sku: 'PER-2002', name: 'Wireless Mouse Silent', categoryId: cat.Peripherals, supplierId: sup['Bay Components Ltd'], costPrice: '850.00', sellingPrice: '1450.00', quantity: 160, reorderLevel: 40 },
      { sku: 'PER-2003', name: '1080p Webcam', categoryId: cat.Peripherals, supplierId: sup['GlobalLink Imports'], costPrice: '2100.00', sellingPrice: '3200.00', quantity: 9, reorderLevel: 15 },
      { sku: 'PER-2004', name: 'USB-C Docking Station', categoryId: cat.Peripherals, supplierId: sup['GlobalLink Imports'], costPrice: '6400.00', sellingPrice: '8900.00', quantity: 18, reorderLevel: 10 },
      { sku: 'NET-3001', name: 'Dual-band Router AC1200', categoryId: cat.Networking, supplierId: sup['Northern Tech Distribution'], costPrice: '2900.00', sellingPrice: '4200.00', quantity: 32, reorderLevel: 12 },
      { sku: 'NET-3002', name: '8-Port Gigabit Switch', categoryId: cat.Networking, supplierId: sup['Northern Tech Distribution'], costPrice: '1900.00', sellingPrice: '2900.00', quantity: 21, reorderLevel: 10 },
      { sku: 'NET-3003', name: 'Cat6 Cable 305m Box', categoryId: cat.Networking, supplierId: sup['Bay Components Ltd'], unit: 'box', costPrice: '7800.00', sellingPrice: '9900.00', quantity: 3, reorderLevel: 5 },
      { sku: 'STO-4001', name: 'NVMe SSD 1TB', categoryId: cat.Storage, supplierId: sup['Bay Components Ltd'], costPrice: '7200.00', sellingPrice: '9400.00', quantity: 46, reorderLevel: 20 },
      { sku: 'STO-4002', name: 'Portable HDD 2TB', categoryId: cat.Storage, supplierId: sup['GlobalLink Imports'], costPrice: '5400.00', sellingPrice: '7200.00', quantity: 27, reorderLevel: 15 },
      { sku: 'STO-4003', name: 'microSD 128GB', categoryId: cat.Storage, supplierId: sup['Bay Components Ltd'], costPrice: '900.00', sellingPrice: '1500.00', quantity: 0, reorderLevel: 30 },
      { sku: 'ACC-5001', name: 'Laptop Backpack 15"', categoryId: cat.Accessories, supplierId: sup['GlobalLink Imports'], costPrice: '1400.00', sellingPrice: '2400.00', quantity: 64, reorderLevel: 20 },
      { sku: 'ACC-5002', name: 'HDMI Cable 2m', categoryId: cat.Accessories, supplierId: sup['Bay Components Ltd'], costPrice: '260.00', sellingPrice: '550.00', quantity: 210, reorderLevel: 50 },
      { sku: 'ACC-5003', name: 'Adjustable Laptop Stand', categoryId: cat.Accessories, supplierId: sup['Northern Tech Distribution'], costPrice: '1100.00', sellingPrice: '1950.00', quantity: 7, reorderLevel: 12 },
    ])
    .returning();
  const bySku = Object.fromEntries(productRows.map((p) => [p.sku, p]));

  console.log('Seeding opening-stock movements...');
  await db.insert(stockMovements).values(
    productRows
      .filter((p) => p.quantity > 0)
      .map((p) => ({
        productId: p.id,
        type: 'in',
        quantity: p.quantity,
        quantityAfter: p.quantity,
        reason: 'Opening stock',
        reference: 'INIT',
        userId: admin.id,
      })),
  );

  console.log('Seeding purchase orders...');
  const year = new Date().getFullYear();
  const [po1, po2] = await db
    .insert(purchaseOrders)
    .values([
      {
        poNumber: `PO-${year}-0001`,
        supplierId: sup['Bay Components Ltd'],
        status: 'received',
        receivedAt: new Date(Date.now() - 6 * 864e5),
        total: '96000.00',
        notes: 'Quarterly peripherals restock',
        createdBy: manager.id,
      },
      {
        poNumber: `PO-${year}-0002`,
        supplierId: sup['GlobalLink Imports'],
        status: 'ordered',
        expectedAt: new Date(Date.now() + 9 * 864e5),
        total: '63000.00',
        notes: 'Webcams and docks — running low',
        createdBy: manager.id,
      },
    ])
    .returning();

  await db.insert(purchaseOrderItems).values([
    { purchaseOrderId: po1.id, productId: bySku['PER-2001'].id, quantity: 20, unitCost: '3200.00' },
    { purchaseOrderId: po1.id, productId: bySku['PER-2002'].id, quantity: 40, unitCost: '850.00' },
    { purchaseOrderId: po2.id, productId: bySku['PER-2003'].id, quantity: 20, unitCost: '2100.00' },
    { purchaseOrderId: po2.id, productId: bySku['PER-2004'].id, quantity: 3, unitCost: '6400.00' },
  ]);

  console.log('Seeding sales orders...');
  const [so1, so2, so3] = await db
    .insert(salesOrders)
    .values([
      {
        soNumber: `SO-${year}-0001`,
        customerName: 'Meridian Corporate Services',
        customerEmail: 'procurement@meridian.example',
        status: 'fulfilled',
        fulfilledAt: new Date(Date.now() - 3 * 864e5),
        total: '208500.00',
        createdBy: staff.id,
      },
      {
        soNumber: `SO-${year}-0002`,
        customerName: 'Ashfield School IT',
        customerEmail: 'it@ashfield.example',
        status: 'confirmed',
        total: '47000.00',
        createdBy: staff.id,
      },
      {
        soNumber: `SO-${year}-0003`,
        customerName: 'Walk-in — Rafiq',
        status: 'draft',
        total: '9400.00',
        createdBy: staff.id,
      },
    ])
    .returning();

  await db.insert(salesOrderItems).values([
    { salesOrderId: so1.id, productId: bySku['LAP-1001'].id, quantity: 3, unitPrice: '69500.00' },
    { salesOrderId: so2.id, productId: bySku['PER-2001'].id, quantity: 5, unitPrice: '4600.00' },
    { salesOrderId: so2.id, productId: bySku['NET-3001'].id, quantity: 4, unitPrice: '4200.00' },
    { salesOrderId: so2.id, productId: bySku['STO-4001'].id, quantity: 2, unitPrice: '9400.00' },
    { salesOrderId: so3.id, productId: bySku['STO-4001'].id, quantity: 1, unitPrice: '9400.00' },
  ]);

  // The fulfilled order already shipped, so mirror it in the ledger.
  const lap = bySku['LAP-1001'];
  await db.insert(stockMovements).values({
    productId: lap.id,
    type: 'out',
    quantity: -3,
    quantityAfter: lap.quantity - 3,
    reason: `Sold on ${so1.soNumber}`,
    reference: so1.soNumber,
    userId: staff.id,
  });
  await db
    .update(products)
    .set({ quantity: lap.quantity - 3 })
    .where(eq(products.id, lap.id));

  console.log('\nSeed complete.');
  console.log('  Login with any of:');
  console.log(`    evan@ims.local     / ${password}   (admin)`);
  console.log(`    najmul@ims.local   / ${password}   (manager)`);
  console.log(`    rukaiya@ims.local  / ${password}   (staff)\n`);
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
