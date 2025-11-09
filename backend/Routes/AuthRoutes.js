const express = require('express');
const router = express.Router();
const User = require('../Models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth } = require('../Middlewares/authMiddleware');

// Register route
router.post('/register', async (req, res) => {
  try {
    console.log('[Register] Registration attempt started');
    const { name, email, password, phone, pscStream } = req.body;

    // Validate input
    if (!name || !email || !password) {
      console.log('[Register] Missing required fields:', { hasName: !!name, hasEmail: !!email, hasPassword: !!password });
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required'
      });
    }

    console.log('[Register] Checking if user exists:', email);
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('[Register] User already exists');
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    console.log('[Register] Creating new user');
    // Create user with plain password - pre-save middleware will hash it
    const user = new User({
      name,
      email,
      password: password,  // Just the plain password
      phone: phone || '',
      pscStream: pscStream || ''
    });

    console.log('[Register] Saving user to database...');
    await user.save();
    console.log('[Register] User saved successfully, ID:', user._id);

    // Generate token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    if (!process.env.JWT_SECRET) {
      console.warn('[Register] WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable for production!');
    }
    
    console.log('[Register] Generating JWT token...');
    const token = jwt.sign(
      { userId: user._id }, 
      jwtSecret,
      { expiresIn: '7d' }
    );
    console.log('[Register] Token generated successfully');

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        pscStream: user.pscStream
      }
    });
    console.log('[Register] Registration successful');

  } catch (error) {
    console.error('[Register] Registration error:', error.message);
    console.error('[Register] Error stack:', error.stack);
    console.error('[Register] Error name:', error.name);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        errors: messages
      });
    }
    
    // Handle duplicate key error (email already exists)
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error during registration'
    });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    console.log('[Login] Login attempt started');
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('[Login] Missing credentials:', { hasEmail: !!email, hasPassword: !!password });
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    console.log('[Login] Looking for user with email:', email);
    // Check if user exists - explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('[Login] User not found');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    console.log('[Login] User found, ID:', user._id);
    console.log('[Login] User active status:', user.isActive);
    console.log('[Login] User has password field:', !!user.password);

    // Check if user account is active
    if (user.isActive === false) {
      console.log('[Login] Account is inactive');
      return res.status(403).json({
        status: 'error',
        message: 'Your account has been temporarily suspended. Please contact admin.'
      });
    }

    // Check password
    if (!user.password) {
      console.error('[Login] ERROR: User password field is missing!');
      return res.status(500).json({
        status: 'error',
        message: 'Server error: Password field not found'
      });
    }

    console.log('[Login] Comparing password...');
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('[Login] Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('[Login] Password mismatch');
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Update last login
    console.log('[Login] Updating last login...');
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    if (!process.env.JWT_SECRET) {
      console.warn('[Login] WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable for production!');
    }
    
    console.log('[Login] Generating JWT token...');
    const token = jwt.sign(
      { userId: user._id },
      jwtSecret,
      { expiresIn: '7d' }
    );
    console.log('[Login] Token generated successfully');

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        pscStream: user.pscStream,
        role: user.role,
        isActive: user.isActive
      }
    });
    console.log('[Login] Login successful');

  } catch (error) {
    console.error('[Login] Login error:', error.message);
    console.error('[Login] Error stack:', error.stack);
    console.error('[Login] Error name:', error.name);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error during login'
    });
  }
});

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error fetching profile'
    });
  }
});

// Update user profile
router.put('/me', auth, async (req, res) => {
  try {
    const { name, phone, bio, pscStream } = req.body;
    const allowedUpdates = { name, phone, bio, pscStream };
    
    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(key => 
      allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Server error updating profile'
    });
  }
});

module.exports = router;