import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/customers (List with Pagination & Search/Filter)
router.get('/', authenticate, async (req, res) => {
  try {
    const { query = '', status = '', type = '', page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const db = await getDb();
    let whereClauses: string[] = [];
    let params: any[] = [];

    if (query) {
      const qStr = `%${(query as string).trim()}%`;
      whereClauses.push('(name LIKE ? OR business_name LIKE ? OR mobile LIKE ? OR email LIKE ? OR id LIKE ?)');
      params.push(qStr, qStr, qStr, qStr, qStr);
    }

    if (status) {
      whereClauses.push('status = ?');
      params.push(status);
    }

    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM customers ${whereSql}`,
      params
    );
    const total = countRes?.total || 0;

    const customers = await db.all<any[]>(
      `SELECT * FROM customers ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // Format response customers
    const formattedCustomers = await Promise.all(
      customers.map(async (c) => {
        const notes = await db.all<any[]>(
          `SELECT text, by_name as by, created_at as at FROM customer_notes WHERE customer_id = ? ORDER BY created_at DESC`,
          [c.id]
        );
        return {
          id: c.id,
          name: c.name,
          mobile: c.mobile,
          email: c.email,
          businessName: c.business_name,
          gst: c.gst || '',
          type: c.type,
          address: c.address,
          status: c.status,
          followUpDate: c.follow_up_date || '',
          notes,
          createdAt: c.created_at
        };
      })
    );

    return res.json({
      data: formattedCustomers,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return res.status(500).json({ error: 'Failed to retrieve customers.' });
  }
});

// GET /api/customers/:id (Detail page)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const c = await db.get<any>('SELECT * FROM customers WHERE id = ?', [req.params.id]);

    if (!c) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const notes = await db.all<any[]>(
      `SELECT text, by_name as by, created_at as at FROM customer_notes WHERE customer_id = ? ORDER BY created_at DESC`,
      [c.id]
    );

    return res.json({
      id: c.id,
      name: c.name,
      mobile: c.mobile,
      email: c.email,
      businessName: c.business_name,
      gst: c.gst || '',
      type: c.type,
      address: c.address,
      status: c.status,
      followUpDate: c.follow_up_date || '',
      notes,
      createdAt: c.created_at
    });
  } catch (error) {
    console.error('Error fetching customer detail:', error);
    return res.status(500).json({ error: 'Failed to retrieve customer details.' });
  }
});

// POST /api/customers (Add customer)
router.post('/', authenticate, requireRole(['Admin', 'Sales']), async (req: AuthRequest, res) => {
  try {
    const { name, mobile, email, businessName, gst, type, address, status, followUpDate, notesText } = req.body;

    if (!name || !mobile || !email || !businessName || !type || !address || !status) {
      return res.status(400).json({ error: 'Name, mobile, email, business name, customer type, address, and status are required.' });
    }

    const db = await getDb();
    const countRes = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    const newId = `C${String((countRes?.count || 0) + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO customers (id, name, mobile, email, business_name, gst, type, address, status, follow_up_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        name.trim(),
        mobile.trim(),
        email.trim(),
        businessName.trim(),
        (gst || '').trim(),
        type,
        address.trim(),
        status,
        followUpDate || '',
        now
      ]
    );

    if (notesText && notesText.trim()) {
      const noteId = `CN_${Date.now()}`;
      const formattedDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
      await db.run(
        `INSERT INTO customer_notes (id, customer_id, text, by_name, created_at) VALUES (?, ?, ?, ?, ?)`,
        [noteId, newId, notesText.trim(), req.user?.name || 'System', formattedDate]
      );
    }

    const created = await db.get<any>('SELECT * FROM customers WHERE id = ?', [newId]);
    const notes = await db.all<any[]>(
      `SELECT text, by_name as by, created_at as at FROM customer_notes WHERE customer_id = ?`,
      [newId]
    );

    return res.status(201).json({
      id: created.id,
      name: created.name,
      mobile: created.mobile,
      email: created.email,
      businessName: created.business_name,
      gst: created.gst || '',
      type: created.type,
      address: created.address,
      status: created.status,
      followUpDate: created.follow_up_date || '',
      notes,
      createdAt: created.created_at
    });
  } catch (error) {
    console.error('Error adding customer:', error);
    return res.status(500).json({ error: 'Failed to create customer record.' });
  }
});

// PUT /api/customers/:id (Edit customer)
router.put('/:id', authenticate, requireRole(['Admin', 'Sales']), async (req: AuthRequest, res) => {
  try {
    const { name, mobile, email, businessName, gst, type, address, status, followUpDate } = req.body;

    const db = await getDb();
    const existing = await db.get('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    await db.run(
      `UPDATE customers SET
        name = ?, mobile = ?, email = ?, business_name = ?, gst = ?,
        type = ?, address = ?, status = ?, follow_up_date = ?
       WHERE id = ?`,
      [
        name ?? existing.name,
        mobile ?? existing.mobile,
        email ?? existing.email,
        businessName ?? existing.business_name,
        gst ?? existing.gst,
        type ?? existing.type,
        address ?? existing.address,
        status ?? existing.status,
        followUpDate ?? existing.follow_up_date,
        req.params.id
      ]
    );

    const updated = await db.get<any>('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    const notes = await db.all<any[]>(
      `SELECT text, by_name as by, created_at as at FROM customer_notes WHERE customer_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );

    return res.json({
      id: updated.id,
      name: updated.name,
      mobile: updated.mobile,
      email: updated.email,
      businessName: updated.business_name,
      gst: updated.gst || '',
      type: updated.type,
      address: updated.address,
      status: updated.status,
      followUpDate: updated.follow_up_date || '',
      notes,
      createdAt: updated.created_at
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return res.status(500).json({ error: 'Failed to update customer record.' });
  }
});

// POST /api/customers/:id/notes (Add follow-up note)
router.post('/:id/notes', authenticate, async (req: AuthRequest, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Note text cannot be empty.' });
    }

    const db = await getDb();
    const existing = await db.get('SELECT id FROM customers WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const noteId = `CN_${Date.now()}`;
    const formattedDate = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

    await db.run(
      `INSERT INTO customer_notes (id, customer_id, text, by_name, created_at) VALUES (?, ?, ?, ?, ?)`,
      [noteId, req.params.id, text.trim(), req.user?.name || 'User', formattedDate]
    );

    const notes = await db.all<any[]>(
      `SELECT text, by_name as by, created_at as at FROM customer_notes WHERE customer_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );

    return res.json({ notes });
  } catch (error) {
    console.error('Error adding customer note:', error);
    return res.status(500).json({ error: 'Failed to save follow-up note.' });
  }
});

// DELETE /api/customers/:id (Admin only)
router.delete('/:id', authenticate, requireRole(['Admin']), async (req, res) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT id FROM customers WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    await db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Customer deleted successfully.' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return res.status(500).json({ error: 'Failed to delete customer.' });
  }
});

export default router;
