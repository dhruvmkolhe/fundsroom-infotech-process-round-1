import { Router } from 'express';
import { getDb } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = await getDb();

    const totalCustomers = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM customers');
    const activeCustomers = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM customers WHERE status = 'Active'");
    const leadCustomers = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM customers WHERE status = 'Lead'");

    const totalProducts = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM products');
    const lowStockAlerts = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE current_stock <= min_stock_alert');
    const totalInventoryStock = await db.get<{ total: number }>('SELECT SUM(current_stock) as total FROM products');

    const totalChallans = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM challans');
    const confirmedChallans = await db.get<{ count: number }>("SELECT COUNT(*) as count FROM challans WHERE status = 'Confirmed'");
    const revenueRes = await db.get<{ total: number }>("SELECT SUM(total_amount) as total FROM challans WHERE status = 'Confirmed'");

    const recentMovements = await db.all<any[]>(
      `SELECT * FROM stock_movements ORDER BY id DESC LIMIT 5`
    );

    const recentChallans = await db.all<any[]>(
      `SELECT * FROM challans ORDER BY created_date DESC, id DESC LIMIT 5`
    );

    return res.json({
      customers: {
        total: totalCustomers?.count || 0,
        active: activeCustomers?.count || 0,
        leads: leadCustomers?.count || 0
      },
      inventory: {
        totalProducts: totalProducts?.count || 0,
        lowStockAlerts: lowStockAlerts?.count || 0,
        totalStockQty: totalInventoryStock?.total || 0
      },
      challans: {
        total: totalChallans?.count || 0,
        confirmed: confirmedChallans?.count || 0,
        totalRevenue: revenueRes?.total || 0
      },
      recentMovements: recentMovements.map(m => ({
        id: m.id,
        productId: m.product_id,
        productName: m.product_name,
        productSku: m.product_sku,
        qtyChanged: m.qty_changed,
        type: m.type,
        reason: m.reason,
        createdBy: m.created_by,
        timestamp: m.timestamp
      })),
      recentChallans: recentChallans.map(c => ({
        id: c.id,
        number: c.number,
        customerName: c.customer_name,
        totalQty: c.total_qty,
        totalAmount: c.total_amount,
        status: c.status,
        createdDate: c.created_date
      }))
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to retrieve dashboard metrics.' });
  }
});

export default router;
