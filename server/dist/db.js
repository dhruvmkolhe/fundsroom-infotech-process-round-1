import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../erp_crm.db');
let dbInstance = null;
export async function getDb() {
    if (dbInstance)
        return dbInstance;
    dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    await dbInstance.exec('PRAGMA foreign_keys = ON;');
    await initSchema(dbInstance);
    await seedData(dbInstance);
    return dbInstance;
}
async function initSchema(db) {
    await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      business_name TEXT NOT NULL,
      gst TEXT DEFAULT '',
      type TEXT NOT NULL,
      address TEXT NOT NULL,
      status TEXT NOT NULL,
      follow_up_date TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_notes (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      text TEXT NOT NULL,
      by_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      unit_price REAL NOT NULL,
      current_stock INTEGER NOT NULL DEFAULT 0,
      min_stock_alert INTEGER NOT NULL DEFAULT 0,
      warehouse_location TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      product_sku TEXT NOT NULL,
      qty_changed INTEGER NOT NULL,
      type TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_by TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challans (
      id TEXT PRIMARY KEY,
      number TEXT UNIQUE NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_business TEXT NOT NULL,
      total_qty INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challan_items (
      id TEXT PRIMARY KEY,
      challan_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      unit_price REAL NOT NULL,
      qty INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (challan_id) REFERENCES challans(id) ON DELETE CASCADE
    );
  `);
}
async function seedData(db) {
    // Seed default users if empty
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount && userCount.count === 0) {
        const adminPassword = await bcrypt.hash('admin123', 10);
        const salesPassword = await bcrypt.hash('sales123', 10);
        const whPassword = await bcrypt.hash('warehouse123', 10);
        const accPassword = await bcrypt.hash('accounts123', 10);
        const now = new Date().toISOString();
        await db.run(`INSERT INTO users (id, name, email, password, role, created_at) VALUES
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?)`, [
            'U001', 'Arjun Mehta', 'admin@distroerp.com', adminPassword, 'Admin', now,
            'U002', 'Priya Singh', 'sales@distroerp.com', salesPassword, 'Sales', now,
            'U003', 'Rajan Kumar', 'warehouse@distroerp.com', whPassword, 'Warehouse', now,
            'U004', 'Deepak Verma', 'accounts@distroerp.com', accPassword, 'Accounts', now,
        ]);
    }
    // Seed customers if empty
    const custCount = await db.get('SELECT COUNT(*) as count FROM customers');
    if (custCount && custCount.count === 0) {
        await db.run(`INSERT INTO customers (id, name, mobile, email, business_name, gst, type, address, status, follow_up_date, created_at) VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            'C001', 'Vikram Patel', '9876543210', 'vikram@pateltraders.com', 'Patel Traders Pvt Ltd', '27AABCP1234F1Z5', 'Wholesale', '45 MG Road, Industrial Area, Mumbai, MH 400001', 'Active', '2026-08-15', '2025-01-10',
            'C002', 'Sunita Agarwal', '9812345678', 'sunita@agarwalwholesale.com', 'Agarwal Wholesale Hub', '07AAACA9876E1Z9', 'Distributor', '12 Ring Road, Lajpat Nagar, New Delhi 110024', 'Active', '2026-08-20', '2024-01-15',
            'C003', 'Ramesh Gupta', '9765432109', 'ramesh@guptamart.in', 'Gupta General Mart', '', 'Retail', '78 Gandhi Road, Jaipur, Rajasthan 302001', 'Lead', '2026-08-12', '2026-07-28',
            'C004', 'Kavitha Reddy', '9654321098', 'kavitha@reddysupplies.com', 'Reddy Supplies Co', '36AABCR5678G1Z1', 'Wholesale', '23 Banjara Hills, Hyderabad, Telangana 500034', 'Active', '2026-09-01', '2025-03-10'
        ]);
        await db.run(`INSERT INTO customer_notes (id, customer_id, text, by_name, created_at) VALUES
      (?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?)`, [
            'CN001', 'C001', 'Requested bulk discount on basmati rice order for next month.', 'Priya Singh', '10 Aug 2026, 14:30',
            'CN002', 'C002', 'Established distributor, 3-year relationship. Always pays on time.', 'Arjun Mehta', '15 May 2026, 09:00'
        ]);
    }
    // Seed products if empty
    const prodCount = await db.get('SELECT COUNT(*) as count FROM products');
    if (prodCount && prodCount.count === 0) {
        const now = new Date().toISOString();
        await db.run(`INSERT INTO products (id, name, sku, category, unit_price, current_stock, min_stock_alert, warehouse_location, created_at) VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            'P001', 'Basmati Rice Premium 25kg', 'RICE-BAS-25K', 'Grains & Cereals', 1850, 245, 50, 'A-01-R1', now,
            'P002', 'Refined Sunflower Oil 15L', 'OIL-SUN-15L', 'Edible Oils', 1620, 18, 30, 'B-02-R3', now,
            'P003', 'Whole Wheat Atta 10kg', 'ATTA-WW-10K', 'Grains & Cereals', 395, 320, 80, 'A-03-R2', now,
            'P004', 'Refined Sugar 50kg', 'SUGAR-REF-50', 'Sugar & Sweeteners', 2100, 12, 25, 'C-01-R1', now,
            'P005', 'Iodized Salt 1kg (Case/50)', 'SALT-IOD-1K50', 'Salt & Spices', 875, 180, 40, 'C-02-R4', now,
            'P006', 'Parle-G Biscuits Case/48', 'BISC-PG-C48', 'Biscuits & Snacks', 1440, 95, 20, 'D-01-R1', now
        ]);
    }
    // Seed stock movements if empty
    const smCount = await db.get('SELECT COUNT(*) as count FROM stock_movements');
    if (smCount && smCount.count === 0) {
        await db.run(`INSERT INTO stock_movements (id, product_id, product_name, product_sku, qty_changed, type, reason, created_by, timestamp) VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            'SM001', 'P001', 'Basmati Rice Premium 25kg', 'RICE-BAS-25K', 100, 'IN', 'Purchase Order #PO-2026-041', 'Rajan Kumar', '10 Jul 2026, 09:15',
            'SM002', 'P002', 'Refined Sunflower Oil 15L', 'OIL-SUN-15L', 50, 'IN', 'Purchase Order #PO-2026-038', 'Rajan Kumar', '8 Jul 2026, 11:00',
            'SM003', 'P002', 'Refined Sunflower Oil 15L', 'OIL-SUN-15L', 32, 'OUT', 'Sales Challan #CH-2026-0118', 'Priya Singh', '15 Jul 2026, 14:30'
        ]);
    }
    // Seed challans if empty
    const chCount = await db.get('SELECT COUNT(*) as count FROM challans');
    if (chCount && chCount.count === 0) {
        await db.run(`INSERT INTO challans (id, number, customer_id, customer_name, customer_business, total_qty, total_amount, status, created_by, created_date) VALUES
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            'CH001', 'CH-2026-0118', 'C001', 'Vikram Patel', 'Patel Traders Pvt Ltd', 42, 70340, 'Confirmed', 'Priya Singh', '2026-07-15',
            'CH002', 'CH-2026-0119', 'C002', 'Sunita Agarwal', 'Agarwal Wholesale Hub', 32, 79920, 'Confirmed', 'Priya Singh', '2026-07-22'
        ]);
        await db.run(`INSERT INTO challan_items (id, challan_id, product_id, product_name, sku, unit_price, qty, subtotal) VALUES
      (?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?),
      (?, ?, ?, ?, ?, ?, ?, ?)`, [
            'CHI001', 'CH001', 'P001', 'Basmati Rice Premium 25kg', 'RICE-BAS-25K', 1850, 10, 18500,
            'CHI002', 'CH001', 'P002', 'Refined Sunflower Oil 15L', 'OIL-SUN-15L', 1620, 32, 51840,
            'CHI003', 'CH002', 'P006', 'Parle-G Biscuits Case/48', 'BISC-PG-C48', 1440, 32, 46080
        ]);
    }
}
