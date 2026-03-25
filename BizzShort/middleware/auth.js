import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to verify admin access
 */
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate as admin' });
  }
};

export { adminAuth };
