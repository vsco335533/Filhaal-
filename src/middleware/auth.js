import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // const result = await query(
    //   'SELECT id, email, full_name, role FROM profiles WHERE id = $1',
    //   [decoded.userId]
    // );
//
    const result = await query(
      `SELECT u.id, u.email, p.full_name, p.role
       FROM users u
       JOIN profiles p ON u.id = p.id
       WHERE u.id = $1`,
      [decoded.userId]
    );
//
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = result.rows[0];
    next();
    // return next();
  // } catch (error) {
   } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// export const requireRole = (roles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({ error: 'Authentication required' });
//     }

//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({ error: 'Insufficient permissions' });
//     }

//     next();
//   };
// };
//
export const requireRole = (roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next({ status: 403, message: "Insufficient permissions" });
//
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

export const requireResearcher = requireRole(['super_admin', 'researcher']);
export const requireUploader = (req, res, next) => {
  if (["admin", "super_admin", "researcher"].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ error: "Upload access denied" });
};