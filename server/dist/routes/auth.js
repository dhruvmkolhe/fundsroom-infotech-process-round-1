import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { JWT_SECRET, authenticate } from '../middleware/auth.js';
const router = Router();
// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const db = await getDb();
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error during authentication.' });
    }
});
// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    return res.json({ user: req.user });
});
export default router;
