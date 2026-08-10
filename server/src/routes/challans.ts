import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper to format Challan response object
async function getChallanFormatted(db: any, id: string) {
  const c = await db.get('SELECT * FROM challans WHERE id = ?', [id]);
  if (!c) return null;

  const items = await db.all(
    `SELECT product_id as productId, product_name as productName, sku, unit_price as unitPrice, qty, subtotal
     FROM challan_items WHERE challan_id = ?`,
    [id]
  );

  return {
    id: c.id,
    number: c.number,
    customerId: c.customer_id,
    customerName: c.customer_name,
    customerBusiness: c.customer_business,
    items,
    totalQty: c.total_qty,
    totalAmount: c.total_amount,
    status: c.status,
    createdBy: c.created_by,
    createdDate: c.created_date
  };
}

// GET /api/challans (List, search, filter by status, pagination)
router.get('/', authenticate, async (req, res) => {
  try {
    const { query = '', status = '', page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const db = await getDb();
    let whereClauses: string[] = [];
    let params: any[] = [];

    if (query) {
      const qStr = `%${(query as string).trim()}%`;
      whereClauses.push('(number LIKE ? OR customer_name LIKE ? OR customer_business LIKE ? OR created_by LIKE ?)');
      params.push(qStr, qStr, qStr, qStr);
    }

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM challans ${whereSql}`,
      params
    );
    const total = countRes?.total || 0;

    const rows = await db.all<any[]>(
      `SELECT id FROM challans ${whereSql} ORDER BY created_date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const formatted = await Promise.all(rows.map((r) => getChallanFormatted(db, r.id)));

    return res.json({
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching challans:', error);
    return res.status(500).json({ error: 'Failed to retrieve sales challans.' });
  }
});

// GET /api/challans/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const id = req.params.id as string;
    const challan = await getChallanFormatted(db, id);
    if (!challan) {
      return res.status(404).json({ error: 'Sales challan not found.' });
    }
    return res.json(challan);
  } catch (error) {
    console.error('Error fetching challan detail:', error);
    return res.status(500).json({ error: 'Failed to retrieve sales challan details.' });
  }
});

// POST /api/challans (Create Challan - Draft or Confirmed)
router.post('/', authenticate, requireRole(['Admin', 'Sales']), async (req: AuthRequest, res) => {
  try {
    const { customerId, items, status = 'Draft' } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer is required for creating a challan.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one product item is required.' });
    }
    if (status !== 'Draft' && status !== 'Confirmed') {
      return res.status(400).json({ error: 'Challan initial status must be Draft or Confirmed.' });
    }

    const db = await getDb();

    // Verify customer
    const cust = await db.get<any>('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (!cust) {
      return res.status(404).json({ error: 'Selected customer does not exist.' });
    }

    // Verify products & quantities, build snapshot data
    let totalQty = 0;
    let totalAmount = 0;
    const validatedItems: Array<{
      productId: string;
      productName: string;
      sku: string;
      unitPrice: number;
      qty: number;
      subtotal: number;
    }> = [];

    for (const item of items) {
      const p = await db.get<any>('SELECT * FROM products WHERE id = ?', [item.productId]);
      if (!p) {
        return res.status(400).json({ error: `Product ID '${item.productId}' not found.` });
      }

      const qty = parseInt(item.qty, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity for product '${p.name}'.` });
      }

      // Check stock sufficiency IF confirming immediately
      if (status === 'Confirmed' && p.current_stock < qty) {
        return res.status(400).json({
          error: `Insufficient stock for product '${p.name}'. Available: ${p.current_stock}, Requested: ${qty}`
        });
      }

      const subtotal = p.unit_price * qty;
      totalQty += qty;
      totalAmount += subtotal;

      validatedItems.push({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        unitPrice: p.unit_price,
        qty,
        subtotal
      });
    }

    // Auto-generate Challan number
    const countRes = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM challans');
    const seq = (countRes?.count || 0) + 1;
    const currentYear = new Date().getFullYear();
    const challanNumber = `CH-${currentYear}-${String(seq).padStart(4, '0')}`;
    const newId = `CH_${Date.now()}`;
    const createdDate = new Date().toISOString().split('T')[0];
    const createdBy = req.user?.name || 'Sales Staff';

    // Insert Challan
    await db.run(
      `INSERT INTO challans (id, number, customer_id, customer_name, customer_business, total_qty, total_amount, status, created_by, created_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        challanNumber,
        cust.id,
        cust.name,
        cust.business_name,
        totalQty,
        totalAmount,
        status,
        createdBy,
        createdDate
      ]
    );

    // Insert Challan Items & Reduce stock if Confirmed
    const timeStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      const itemId = `CHI_${Date.now()}_${i}`;

      await db.run(
        `INSERT INTO challan_items (id, challan_id, product_id, product_name, sku, unit_price, qty, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [itemId, newId, item.productId, item.productName, item.sku, item.unitPrice, item.qty, item.subtotal]
      );

      if (status === 'Confirmed') {
        // Stock reduction
        await db.run(
          `UPDATE products SET current_stock = current_stock - ? WHERE id = ?`,
          [item.qty, item.productId]
        );

        // Stock movement log (OUT)
        const smId = `SM_${Date.now()}_${i}`;
        await db.run(
          `INSERT INTO stock_movements (id, product_id, product_name, product_sku, qty_changed, type, reason, created_by, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            smId,
            item.productId,
            item.productName,
            item.sku,
            item.qty,
            'OUT',
            `Sales Challan #${challanNumber}`,
            createdBy,
            timeStr
          ]
        );
      }
    }

    const createdChallan = await getChallanFormatted(db, newId);
    return res.status(201).json(createdChallan);
  } catch (error) {
    console.error('Error creating challan:', error);
    return res.status(500).json({ error: 'Failed to create sales challan.' });
  }
});

// POST /api/challans/:id/confirm (Confirm a draft challan)
router.post('/:id/confirm', authenticate, requireRole(['Admin', 'Sales']), async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const challan = await db.get<any>('SELECT * FROM challans WHERE id = ?', [req.params.id]);

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found.' });
    }
    if (challan.status === 'Confirmed') {
      return res.status(400).json({ error: 'Challan is already confirmed.' });
    }
    if (challan.status === 'Cancelled') {
      return res.status(400).json({ error: 'Cancelled challan cannot be confirmed.' });
    }

    const items = await db.all<any[]>(
      `SELECT * FROM challan_items WHERE challan_id = ?`,
      [req.params.id]
    );

    // Verify stock for all items BEFORE performing changes
    for (const item of items) {
      const p = await db.get<any>('SELECT current_stock, name FROM products WHERE id = ?', [item.product_id]);
      if (!p) {
        return res.status(400).json({ error: `Product '${item.product_name}' no longer exists.` });
      }
      if (p.current_stock < item.qty) {
        return res.status(400).json({
          error: `Insufficient stock for product '${p.name}'. Available: ${p.current_stock}, Requested in Challan: ${item.qty}`
        });
      }
    }

    // Apply stock deduction & stock movement logs
    const timeStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const userStr = req.user?.name || 'Sales Staff';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      await db.run(
        `UPDATE products SET current_stock = current_stock - ? WHERE id = ?`,
        [item.qty, item.product_id]
      );

      const smId = `SM_${Date.now()}_${i}`;
      await db.run(
        `INSERT INTO stock_movements (id, product_id, product_name, product_sku, qty_changed, type, reason, created_by, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          smId,
          item.product_id,
          item.product_name,
          item.sku,
          item.qty,
          'OUT',
          `Sales Challan #${challan.number}`,
          userStr,
          timeStr
        ]
      );
    }

    // Update status
    const id = req.params.id as string;
    await db.run(`UPDATE challans SET status = 'Confirmed' WHERE id = ?`, [id]);

    const updated = await getChallanFormatted(db, id);
    return res.json(updated);
  } catch (error) {
    console.error('Error confirming challan:', error);
    return res.status(500).json({ error: 'Failed to confirm sales challan.' });
  }
});

// POST /api/challans/:id/cancel (Cancel a draft or confirmed challan)
router.post('/:id/cancel', authenticate, requireRole(['Admin', 'Sales']), async (req: AuthRequest, res) => {
  try {
    const db = await getDb();
    const challan = await db.get<any>('SELECT * FROM challans WHERE id = ?', [req.params.id]);

    if (!challan) {
      return res.status(404).json({ error: 'Challan not found.' });
    }
    if (challan.status === 'Cancelled') {
      return res.status(400).json({ error: 'Challan is already cancelled.' });
    }

    // If confirmed previously, restore stock!
    if (challan.status === 'Confirmed') {
      const items = await db.all<any[]>(
        `SELECT * FROM challan_items WHERE challan_id = ?`,
        [req.params.id]
      );

      const timeStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      const userStr = req.user?.name || 'Sales Staff';

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        await db.run(
          `UPDATE products SET current_stock = current_stock + ? WHERE id = ?`,
          [item.qty, item.product_id]
        );

        const smId = `SM_${Date.now()}_${i}`;
        await db.run(
          `INSERT INTO stock_movements (id, product_id, product_name, product_sku, qty_changed, type, reason, created_by, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            smId,
            item.product_id,
            item.product_name,
            item.sku,
            item.qty,
            'IN',
            `Restocked from Cancelled Challan #${challan.number}`,
            userStr,
            timeStr
          ]
        );
      }
    }

    const id = req.params.id as string;
    await db.run(`UPDATE challans SET status = 'Cancelled' WHERE id = ?`, [id]);

    const updated = await getChallanFormatted(db, id);
    return res.json(updated);
  } catch (error) {
    console.error('Error cancelling challan:', error);
    return res.status(500).json({ error: 'Failed to cancel sales challan.' });
  }
});

export default router;
