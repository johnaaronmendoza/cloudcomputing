const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const redis = require('redis');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'auth-service.log' })
  ]
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => logger.error('Redis Client Error:', err));
redisClient.connect();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/auth', limiter);

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('firstName').trim().isLength({ min: 2, max: 50 }),
  body('lastName').trim().isLength({ min: 2, max: 50 }),
  body('userType').isIn(['senior', 'youth']),
  body('dateOfBirth').isISO8601().toDate(),
  body('location').optional().trim().isLength({ max: 100 }),
  body('interests').optional().isArray(),
  body('skills').optional().isArray()
];

const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 })
];

// User types and roles
const USER_TYPES = {
  SENIOR: 'senior',
  YOUTH: 'youth',
  ADMIN: 'admin'
};

const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

// JWT utilities
const generateTokens = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    userType: user.user_type,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Database initialization
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('senior', 'youth', 'admin')),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
        date_of_birth DATE,
        location VARCHAR(100),
        interests TEXT[],
        skills TEXT[],
        profile_image_url VARCHAR(500),
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
      CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Check if user still exists and is active
    const userResult = await pool.query(
      'SELECT id, email, user_type, role, first_name, last_name, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    req.user = userResult.rows[0];
    next();
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'auth-service', timestamp: new Date().toISOString() });
});

// User registration
app.post('/api/auth/register', validateRegistration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      userType,
      dateOfBirth,
      location,
      interests = [],
      skills = []
    } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, user_type, date_of_birth, location, interests, skills)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, first_name, last_name, user_type, role, created_at
    `, [email, passwordHash, firstName, lastName, userType, dateOfBirth, location, interests, skills]);

    const user = userResult.rows[0];

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshTokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    // Cache user data in Redis
    await redisClient.setEx(`user:${user.id}`, 3600, JSON.stringify({
      id: user.id,
      email: user.email,
      userType: user.user_type,
      role: user.role
    }));

    logger.info(`User registered successfully: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/api/auth/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Get user from database
    const userResult = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, user_type, role, is_active, last_login FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshTokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
    );

    // Cache user data in Redis
    await redisClient.setEx(`user:${user.id}`, 3600, JSON.stringify({
      id: user.id,
      email: user.email,
      userType: user.user_type,
      role: user.role
    }));

    logger.info(`User logged in successfully: ${email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token refresh
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }

    // Check if refresh token exists in database
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenResult = await pool.query(
      'SELECT user_id FROM refresh_tokens WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP',
      [refreshTokenHash]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Get user data
    const userResult = await pool.query(
      'SELECT id, email, first_name, last_name, user_type, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    const user = userResult.rows[0];

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update refresh token in database
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await pool.query(
      'UPDATE refresh_tokens SET token_hash = $1, expires_at = $2 WHERE token_hash = $3',
      [newRefreshTokenHash, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), refreshTokenHash]
    );

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await pool.query('DELETE FROM refresh_tokens WHERE token_hash = $1', [refreshTokenHash]);
    }

    // Clear user cache
    await redisClient.del(`user:${req.user.id}`);

    logger.info(`User logged out: ${req.user.email}`);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(`
      SELECT id, email, first_name, last_name, user_type, role, date_of_birth, 
             location, interests, skills, profile_image_url, is_verified, 
             created_at, last_login
      FROM users 
      WHERE id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      userType: user.user_type,
      role: user.role,
      dateOfBirth: user.date_of_birth,
      location: user.location,
      interests: user.interests,
      skills: user.skills,
      profileImageUrl: user.profile_image_url,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      lastLogin: user.last_login
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/api/auth/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('location').optional().trim().isLength({ max: 100 }),
  body('interests').optional().isArray(),
  body('skills').optional().isArray(),
  body('profileImageUrl').optional().isURL()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, location, interests, skills, profileImageUrl } = req.body;

    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (firstName) {
      updateFields.push(`first_name = $${paramCount++}`);
      updateValues.push(firstName);
    }
    if (lastName) {
      updateFields.push(`last_name = $${paramCount++}`);
      updateValues.push(lastName);
    }
    if (location !== undefined) {
      updateFields.push(`location = $${paramCount++}`);
      updateValues.push(location);
    }
    if (interests) {
      updateFields.push(`interests = $${paramCount++}`);
      updateValues.push(interests);
    }
    if (skills) {
      updateFields.push(`skills = $${paramCount++}`);
      updateValues.push(skills);
    }
    if (profileImageUrl) {
      updateFields.push(`profile_image_url = $${paramCount++}`);
      updateValues.push(profileImageUrl);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(req.user.id);

    const query = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, first_name, last_name, user_type, role, location, interests, skills, profile_image_url
    `;

    const result = await pool.query(query, updateValues);
    const updatedUser = result.rows[0];

    // Update cache
    await redisClient.setEx(`user:${req.user.id}`, 3600, JSON.stringify({
      id: updatedUser.id,
      email: updatedUser.email,
      userType: updatedUser.user_type,
      role: updatedUser.role
    }));

    logger.info(`User profile updated: ${req.user.email}`);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        userType: updatedUser.user_type,
        role: updatedUser.role,
        location: updatedUser.location,
        interests: updatedUser.interests,
        skills: updatedUser.skills,
        profileImageUrl: updatedUser.profile_image_url
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint for other services
app.post('/api/auth/verify', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    // Check if user exists and is active
    const userResult = await pool.query(
      'SELECT id, email, user_type, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    res.json({
      valid: true,
      user: userResult.rows[0]
    });
  } catch (error) {
    logger.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      logger.info(`Auth service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;