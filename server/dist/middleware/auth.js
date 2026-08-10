import jwt from 'jsonwebtoken';
export const JWT_SECRET = process.env.JWT_SECRET || 'erp_crm_super_secret_jwt_key_2026';
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
}
export function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: `Access forbidden: ${req.user.role} role does not have permission to perform this action. Required: ${allowedRoles.join(', ')}`
            });
        }
        next();
    };
}
