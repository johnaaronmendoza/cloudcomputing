const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const winston = require('winston');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'api-gateway.log' })
  ]
});

// Service URLs
const SERVICES = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  TASK: process.env.TASK_SERVICE_URL || 'http://localhost:3002',
  SEARCH: process.env.SEARCH_SERVICE_URL || 'http://localhost:3003',
  CONTENT: process.env.CONTENT_SERVICE_URL || 'http://localhost:3004',
  MONITORING: process.env.MONITORING_SERVICE_URL || 'http://localhost:3005'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-gateway', 
    timestamp: new Date().toISOString(),
    services: Object.keys(SERVICES)
  });
});

// Service health check
const checkServiceHealth = async (serviceName, serviceUrl) => {
  try {
    const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
    return { name: serviceName, status: 'healthy', response: response.data };
  } catch (error) {
    return { name: serviceName, status: 'unhealthy', error: error.message };
  }
};

// Get all services health status
app.get('/health/all', async (req, res) => {
  try {
    const healthChecks = await Promise.all([
      checkServiceHealth('auth-service', SERVICES.AUTH),
      checkServiceHealth('task-service', SERVICES.TASK),
      checkServiceHealth('search-service', SERVICES.SEARCH),
      checkServiceHealth('content-service', SERVICES.CONTENT),
      checkServiceHealth('monitoring-service', SERVICES.MONITORING)
    ]);

    const allHealthy = healthChecks.every(check => check.status === 'healthy');
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: healthChecks
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Authentication middleware for protected routes
const authenticateRequest = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const response = await axios.post(`${SERVICES.AUTH}/api/auth/verify`, { token });
    
    if (response.data.valid) {
      req.user = response.data.user;
      next();
    } else {
      res.status(403).json({ error: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(403).json({ error: 'Authentication failed' });
  }
};

// Optional authentication middleware (for routes that can work with or without auth)
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const response = await axios.post(`${SERVICES.AUTH}/api/auth/verify`, { token });
    
    if (response.data.valid) {
      req.user = response.data.user;
    } else {
      req.user = null;
    }
  } catch (error) {
    req.user = null;
  }
  
  next();
};

// Proxy configuration for each service
const createProxyOptions = (target, pathRewrite = {}) => ({
  target,
  changeOrigin: true,
  pathRewrite,
  onError: (err, req, res) => {
    logger.error(`Proxy error for ${target}:`, err);
    res.status(503).json({ 
      error: 'Service temporarily unavailable',
      service: target
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add user information to headers for downstream services
    if (req.user) {
      proxyReq.setHeader('X-User-ID', req.user.id);
      proxyReq.setHeader('X-User-Type', req.user.user_type);
      proxyReq.setHeader('X-User-Role', req.user.role);
    }
    
    // Add request ID for tracing
    proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'] || generateRequestId());
  },
  onProxyRes: (proxyRes, req, res) => {
    // Add CORS headers
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Request-ID';
  }
});

// Generate unique request ID
const generateRequestId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Authentication service routes
app.use('/api/auth', createProxyMiddleware(createProxyOptions(SERVICES.AUTH)));

// Task management service routes (protected)
app.use('/api/tasks', authenticateRequest, createProxyMiddleware(createProxyOptions(SERVICES.TASK)));

// Search and recommendation service routes (optional auth for personalized results)
app.use('/api/search', optionalAuth, createProxyMiddleware(createProxyOptions(SERVICES.SEARCH)));

// Content library service routes (protected)
app.use('/api/content', authenticateRequest, createProxyMiddleware(createProxyOptions(SERVICES.CONTENT)));

// Monitoring service routes (admin only)
app.use('/api/monitoring', authenticateRequest, (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}, createProxyMiddleware(createProxyOptions(SERVICES.MONITORING)));

// Public API documentation
app.get('/api', (req, res) => {
  res.json({
    name: 'Skills Platform API',
    version: '1.0.0',
    description: 'Intergenerational Skills-Sharing & Micro-Task Platform',
    endpoints: {
      auth: {
        base: '/api/auth',
        description: 'Authentication and user management',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      },
      tasks: {
        base: '/api/tasks',
        description: 'Task management and micro-volunteering',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        auth: 'required'
      },
      search: {
        base: '/api/search',
        description: 'Search and recommendation engine',
        methods: ['GET', 'POST'],
        auth: 'optional'
      },
      content: {
        base: '/api/content',
        description: 'Content library and file management',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        auth: 'required'
      },
      monitoring: {
        base: '/api/monitoring',
        description: 'Platform monitoring and analytics',
        methods: ['GET'],
        auth: 'admin required'
      }
    },
    health: '/health',
    documentation: 'https://docs.skills-platform.com'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    requestId: req.headers['x-request-id']
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info(`Proxying to services:`, SERVICES);
});

module.exports = app;