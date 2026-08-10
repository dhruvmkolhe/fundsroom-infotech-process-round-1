import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/stock-movements
router.get('/', authenticate, async (req, res) => {
  try {
    const { query = '', type = '', page = '1', limit = '50' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const db = await getDb();
    let whereClauses: string[] = [];
    let params: any[] = [];

    if (query) {
      const qStr = `%${(query as string).trim()}%`;
      whereClauses.push('(product_name LIKE ? OR product_sku LIKE ? OR reason LIKE ? OR created_by LIKE ?)');
      params.push(qStr, qStr, qStr, qStr);
    }

    if (type) {
      whereClauses.push('type = ?');
      params.push(type);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await db.get<{ total: number }>(
      `SELECT COUNT(*) as total FROM stock_movements ${whereSql}`,
      params
    );
    const total = countRes?.total || 0;

    const movements = await db.all<any[]>(
      `SELECT * FROM stock_movements ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const formatted = movements.map((m) => ({
      id: m.id,
      productId: m.product_id,
      productName: m.product_name,
      productSku: m.product_sku,
      qtyChanged: m.qty_changed,
      type: m.type,
      reason: m.reason,
      createdBy: m.created_by,
      timestamp: m.timestamp
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
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return res.status(500).json({ error: 'Failed to retrieve stock movement logs.' });
  }
});

export default router;
