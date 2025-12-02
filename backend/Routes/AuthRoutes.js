const express = require('express');
const router = express.Router();
const User = require('../Models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { auth } = require('../Middlewares/authMiddleware');
const { sendMail } = require('../Utils/mailer');
const crypto = require('crypto');

// Register route
router.post('/register', async (req, res) => {
  console.log('[Register] ========================================');
  console.log('[Register] Route handler called');
  console.log('[Register] Request body keys:', Object.keys(req.body || {}));
  
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
      phone: phone || ''
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
  console.log('[Login] ========================================');
  console.log('[Login] Route handler called');
  console.log('[Login] Request body keys:', Object.keys(req.body || {}));
  
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
        isActive: user.isActive,
        isContributor: user.isContributor || false
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

// Forgot password - request OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+resetPasswordOtp');

    if (!user) {
      // Avoid revealing whether the email exists
      return res.json({
        status: 'success',
        message: 'If an account exists for this email, an OTP has been sent.'
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetPasswordOtpAttempts = 0;
    await user.save();

    await sendMail({
      to: user.email,
      subject: 'PIQUI Password Reset OTP',
      text: `Use the OTP ${otp} to reset your PIQUI password. This code expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Reset your PIQUI password</h2>
          <p>Use the following One-Time Password (OTP) to reset your account password:</p>
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #f59e0b; margin: 24px 0;">${otp}</p>
          <p>This code is valid for the next <strong>10 minutes</strong>.</p>
          <p>If you did not request this change, you can safely ignore this email.</p>
          <p>— Team PIQUI</p>
        </div>
      `
    });

    res.json({
      status: 'success',
      message: 'If an account exists for this email, an OTP has been sent.'
    });
  } catch (error) {
    console.error('[Forgot Password] error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unable to process password reset request'
    });
  }
});

// Verify OTP and reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, OTP, and new password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +resetPasswordOtp +resetPasswordOtpAttempts');

    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired OTP'
      });
    }

    if (user.resetPasswordOtpExpires < new Date()) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.resetPasswordOtpAttempts >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);

    if (!isMatch) {
      user.resetPasswordOtpAttempts = (user.resetPasswordOtpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP. Please try again.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;
    user.resetPasswordOtpAttempts = 0;
    await user.save();

    res.json({
      status: 'success',
      message: 'Password updated successfully. You can now sign in with your new password.'
    });
  } catch (error) {
    console.error('[Reset Password] error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Unable to reset password'
    });
  }
});

module.exports = router;