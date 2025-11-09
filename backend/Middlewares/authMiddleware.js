const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'No token provided, access denied' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token is invalid, user not found' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Your account has been temporarily suspended' 
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Admin access required' 
      });
    }
    
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      status: 'error', 
      message: 'Token is not valid' 
    });
  }
};

// Regular auth middleware with active user check
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token is invalid' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Your account has been temporarily suspended' 
      });
    }
    
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ 
      status: 'error', 
      message: 'Token is not valid' 
    });
  }
};

module.exports = { adminAuth, auth };