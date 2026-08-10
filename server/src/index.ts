import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import customerRoutes from './routes/customers.js';
import productRoutes from './routes/products.js';
import stockMovementRoutes from './routes/stockMovements.js';
import challanRoutes from './routes/challans.js';
import dashboardRoutes from './routes/dashboard.js';
import { getDb } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Initialize SQLite database
getDb().then(() => {
  console.log('Database initialized successfully.');
}).catch((err) => {
  console.error('Database initialization error:', err);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`ERP/CRM Backend Server running on http://localhost:${PORT}`);
});
