import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate, requireRole } from '../middleware/auth.js';
const router = Router();
// GET /api/products (List, search, filter low stock, pagination)
router.get('/', authenticate, async (req, res) => {
    try {
        const { query = '', category = '', alertOnly = '', page = '1', limit = '50' } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 50));
        const offset = (pageNum - 1) * limitNum;
        const db = await getDb();
        let whereClauses = [];
        let params = [];
        if (query) {
            const qStr = `%${query.trim()}%`;
            whereClauses.push('(name LIKE ? OR sku LIKE ? OR category LIKE ? OR warehouse_location LIKE ?)');
            params.push(qStr, qStr, qStr, qStr);
        }
        if (category) {
            whereClauses.push('category = ?');
            params.push(category);
        }
        if (alertOnly === 'true' || alertOnly === '1') {
            whereClauses.push('current_stock <= min_stock_alert');
        }
        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const countRes = await db.get(`SELECT COUNT(*) as total FROM products ${whereSql}`, params);
        const total = countRes?.total || 0;
        const products = await db.all(`SELECT * FROM products ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`, [...params, limitNum, offset]);
        const formatted = products.map((p) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            unitPrice: p.unit_price,
            currentStock: p.current_stock,
            minStockAlert: p.min_stock_alert,
            warehouseLocation: p.warehouse_location,
            createdAt: p.created_at
        }));
        return res.json({
            data: formatted,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Failed to retrieve inventory products.' });
    }
});
// GET /api/products/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const db = await getDb();
        const p = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!p) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        return res.json({
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            unitPrice: p.unit_price,
            currentStock: p.current_stock,
            minStockAlert: p.min_stock_alert,
            warehouseLocation: p.warehouse_location,
            createdAt: p.created_at
        });
    }
    catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ error: 'Failed to fetch product details.' });
    }
});
// POST /api/products (Add product)
router.post('/', authenticate, requireRole(['Admin', 'Warehouse']), async (req, res) => {
    try {
        const { name, sku, category, unitPrice, currentStock, minStockAlert, warehouseLocation } = req.body;
        if (!name || !sku || !category || unitPrice === undefined || currentStock === undefined || minStockAlert === undefined || !warehouseLocation) {
            return res.status(400).json({ error: 'Name, SKU, category, unit price, stock, min stock alert, and warehouse location are required.' });
        }
        const db = await getDb();
        // Check SKU duplicate
        const existingSku = await db.get('SELECT id FROM products WHERE UPPER(sku) = UPPER(?)', [sku.trim()]);
        if (existingSku) {
            return res.status(400).json({ error: `Product SKU '${sku}' already exists.` });
        }
        const countRes = await db.get('SELECT COUNT(*) as count FROM products');
        const newId = `P${String((countRes?.count || 0) + 1).padStart(3, '0')}`;
        const now = new Date().toISOString();
        await db.run(`INSERT INTO products (id, name, sku, category, unit_price, current_stock, min_stock_alert, warehouse_location, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            newId,
            name.trim(),
            sku.trim().toUpperCase(),
            category.trim(),
            Number(unitPrice),
            Math.max(0, parseInt(currentStock, 10) || 0),
            Math.max(0, parseInt(minStockAlert, 10) || 0),
            warehouseLocation.trim(),
            now
        ]);
        // Initial stock movement log if stock > 0
        const initialStock = Math.max(0, parseInt(currentStock, 10) || 0);
        if (initialStock > 0) {
            const smId = `SM_${Date.now()}`;
            const timeStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            await db.run(`INSERT INTO stock_movements (id, product_id, product_name, product_sku, qty_changed, type, reason, created_by, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                smId,
                newId,
                name.trim(),
                sku.trim().toUpperCase(),
                initialStock,
                'IN',
                'Initial Inventory Setup',
                req.user?.name || 'System',
                timeStr
            ]);
        }
        const created = await db.get('SELECT * FROM products WHERE id = ?', [newId]);
        return res.status(201).json({
            id: created.id,
            name: created.name,
            sku: created.sku,
            category: created.category,
            unitPrice: created.unit_price,
            currentStock: created.current_stock,
            minStockAlert: created.min_stock_alert,
            warehouseLocation: created.warehouse_location,
            createdAt: created.created_at
        });
    }
    catch (error) {
        console.error('Error adding product:', error);
        return res.status(500).json({ error: 'Failed to create product.' });
    }
});
// PUT /api/products/:id (Edit product)
router.put('/:id', authenticate, requireRole(['Admin', 'Warehouse']), async (req, res) => {
    try {
        const { name, sku, category, unitPrice, minStockAlert, warehouseLocation } = req.body;
        const db = await getDb();
        const existing = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!existing) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        if (sku && sku.trim().toUpperCase() !== existing.sku) {
            const dup = await db.get('SELECT id FROM products WHERE UPPER(sku) = UPPER(?) AND id != ?', [sku.trim(), req.params.id]);
            if (dup) {
                return res.status(400).json({ error: `SKU '${sku}' is already assigned to another product.` });
            }
        }
        await db.run(`UPDATE products SET
        name = ?, sku = ?, category = ?, unit_price = ?,
        min_stock_alert = ?, warehouse_location = ?
       WHERE id = ?`, [
            name ?? existing.name,
            sku ? sku.trim().toUpperCase() : existing.sku,
            category ?? existing.category,
            unitPrice !== undefined ? Number(unitPrice) : existing.unit_price,
            minStockAlert !== undefined ? Number(minStockAlert) : existing.min_stock_alert,
            warehouseLocation ?? existing.warehouse_location,
            req.params.id
        ]);
        const updated = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        return res.json({
            id: updated.id,
            name: updated.name,
            sku: updated.sku,
            category: updated.category,
            unitPrice: updated.unit_price,
            currentStock: updated.current_stock,
            minStockAlert: updated.min_stock_alert,
            warehouseLocation: updated.warehouse_location,
            createdAt: updated.created_at
        });
    }
    catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Failed to update product details.' });
    }
});
// POST /api/products/:id/adjust-stock (Manual stock IN / OUT adjustment)
router.post('/:id/adjust-stock', authenticate, requireRole(['Admin', 'Warehouse']), async (req, res) => {
    try {
        const { qtyChanged, type, reason } = req.body;
        const qty = parseInt(qtyChanged, 10);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Quantity changed must be a positive integer.' });
        }
        if (type !== 'IN' && type !== 'OUT') {
            return res.status(400).json({ error: 'Movement type must be IN or OUT.' });
        }
        if (!reason || !reason.trim()) {
            return res.status(400).json({ error: 'Reason for stock adjustment is required.' });
        }
        const db = await getDb();
        const p = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!p) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        if (type === 'OUT' && p.current_stock < qty) {
            return res.status(400).json({
                error: `Insufficient stock for '${p.name}'. Current stock: ${p.current_stock}, attempted OUT: ${qty}`
            });
        }
        const newStock = type === 'IN' ? p.current_stock + qty : p.current_stock - qty;
        await db.run('UPDATE products SET current_stock = ? WHERE id = ?', [newStock, p.id]);
        const smId = `SM_${Date.now()}`;
        const timeStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        await db.run(`INSERT INTO stock_movements (id, product_id, product_name, product_sku, qty_changed, type, reason, created_by, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            smId,
            p.id,
            p.name,
            p.sku,
            qty,
            type,
            reason.trim(),
            req.user?.name || 'Warehouse Staff',
            timeStr
        ]);
        return res.json({
            message: `Stock successfully adjusted ${type} by ${qty}.`,
            productId: p.id,
            previousStock: p.current_stock,
            newStock
        });
    }
    catch (error) {
        console.error('Error adjusting stock:', error);
        return res.status(500).json({ error: 'Failed to process stock adjustment.' });
    }
});
export default router;
