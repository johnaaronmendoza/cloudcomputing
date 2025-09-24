const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const redis = require('redis');
const winston = require('winston');
const axios = require('axios');
const promClient = require('prom-client');
const cron = require('node-cron');
const moment = require('moment');
require('dotenv').config();

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/monitoring-service.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 3005;

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

// Prometheus metrics
const register = new promClient.Registry();

// Custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'service'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const activeUsers = new promClient.Gauge({
  name: 'active_users_total',
  help: 'Total number of active users',
  labelNames: ['user_type']
});

const tasksCreated = new promClient.Counter({
  name: 'tasks_created_total',
  help: 'Total number of tasks created',
  labelNames: ['category', 'user_type']
});

const tasksCompleted = new promClient.Counter({
  name: 'tasks_completed_total',
  help: 'Total number of tasks completed',
  labelNames: ['category', 'user_type']
});

const contentUploaded = new promClient.Counter({
  name: 'content_uploaded_total',
  help: 'Total number of content items uploaded',
  labelNames: ['content_type', 'user_type']
});

const searchQueries = new promClient.Counter({
  name: 'search_queries_total',
  help: 'Total number of search queries',
  labelNames: ['query_type', 'user_type']
});

const serviceHealth = new promClient.Gauge({
  name: 'service_health_status',
  help: 'Health status of services (1 = healthy, 0 = unhealthy)',
  labelNames: ['service_name']
});

// Register metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(activeUsers);
register.registerMetric(tasksCreated);
register.registerMetric(tasksCompleted);
register.registerMetric(contentUploaded);
register.registerMetric(searchQueries);
register.registerMetric(serviceHealth);

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  task: process.env.TASK_SERVICE_URL || 'http://task-service:3002',
  search: process.env.SEARCH_SERVICE_URL || 'http://search-service:3003',
  content: process.env.CONTENT_SERVICE_URL || 'http://content-service:3004'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestsTotal
      .labels(req.method, route, res.statusCode, 'monitoring-service')
      .inc();
    
    httpRequestDuration
      .labels(req.method, route, 'monitoring-service')
      .observe(duration);
  });
  
  next();
});

// Database initialization
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100) NOT NULL,
        user_id UUID,
        user_type VARCHAR(20),
        data JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        service_name VARCHAR(50) NOT NULL,
        metric_name VARCHAR(100) NOT NULL,
        metric_value FLOAT NOT NULL,
        labels JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        activity_type VARCHAR(50) NOT NULL,
        details JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
};

// Health check functions
const checkServiceHealth = async (serviceName, serviceUrl) => {
  try {
    const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
    serviceHealth.set({ service_name: serviceName }, 1);
    return { status: 'healthy', response: response.data };
  } catch (error) {
    serviceHealth.set({ service_name: serviceName }, 0);
    return { status: 'unhealthy', error: error.message };
  }
};

// Collect metrics from all services
const collectMetrics = async () => {
  try {
    // Check service health
    for (const [serviceName, serviceUrl] of Object.entries(SERVICES)) {
      await checkServiceHealth(serviceName, serviceUrl);
    }

    // Get user metrics
    const userResult = await pool.query(`
      SELECT user_type, COUNT(*) as count
      FROM users
      WHERE is_active = true
      GROUP BY user_type
    `);

    userResult.rows.forEach(row => {
      activeUsers.set({ user_type: row.user_type }, row.count);
    });

    // Get task metrics
    const taskResult = await pool.query(`
      SELECT 
        t.category,
        u.user_type,
        COUNT(*) as count
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      WHERE t.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY t.category, u.user_type
    `);

    taskResult.rows.forEach(row => {
      tasksCreated.inc({ category: row.category, user_type: row.user_type }, row.count);
    });

    // Get completed tasks
    const completedResult = await pool.query(`
      SELECT 
        t.category,
        u.user_type,
        COUNT(*) as count
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      WHERE t.status = 'completed' 
        AND t.updated_at >= NOW() - INTERVAL '24 hours'
      GROUP BY t.category, u.user_type
    `);

    completedResult.rows.forEach(row => {
      tasksCompleted.inc({ category: row.category, user_type: row.user_type }, row.count);
    });

    // Get content metrics
    const contentResult = await pool.query(`
      SELECT 
        c.content_type,
        u.user_type,
        COUNT(*) as count
      FROM content c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY c.content_type, u.user_type
    `);

    contentResult.rows.forEach(row => {
      contentUploaded.inc({ content_type: row.content_type, user_type: row.user_type }, row.count);
    });

    logger.info('Metrics collected successfully');
  } catch (error) {
    logger.error('Error collecting metrics:', error);
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'monitoring-service', 
    timestamp: new Date().toISOString() 
  });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics:', error);
    res.status(500).end();
  }
});

// Get platform overview
app.get('/api/overview', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let interval;
    switch (period) {
      case '1d':
        interval = '1 day';
        break;
      case '7d':
        interval = '7 days';
        break;
      case '30d':
        interval = '30 days';
        break;
      default:
        interval = '7 days';
    }

    // Get user statistics
    const userStats = await pool.query(`
      SELECT 
        user_type,
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${interval}' THEN 1 END) as new_users,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '1 day' THEN 1 END) as active_today
      FROM users
      WHERE is_active = true
      GROUP BY user_type
    `);

    // Get task statistics
    const taskStats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${interval}' THEN 1 END) as created_in_period
      FROM tasks
      GROUP BY status
    `);

    // Get content statistics
    const contentStats = await pool.query(`
      SELECT 
        content_type,
        COUNT(*) as count,
        SUM(download_count) as total_downloads,
        SUM(view_count) as total_views
      FROM content
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY content_type
    `);

    // Get engagement metrics
    const engagementStats = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as daily_tasks,
        COUNT(DISTINCT created_by) as active_creators
      FROM tasks
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Get search statistics
    const searchStats = await pool.query(`
      SELECT 
        query_type,
        COUNT(*) as search_count,
        AVG(results_count) as avg_results
      FROM search_analytics
      WHERE search_timestamp >= NOW() - INTERVAL '${interval}'
      GROUP BY query_type
    `);

    res.json({
      period,
      users: userStats.rows,
      tasks: taskStats.rows,
      content: contentStats.rows,
      engagement: engagementStats.rows,
      search: searchStats.rows
    });
  } catch (error) {
    logger.error('Get overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user analytics
app.get('/api/users', async (req, res) => {
  try {
    const { period = '30d', userType } = req.query;
    
    let interval;
    switch (period) {
      case '1d':
        interval = '1 day';
        break;
      case '7d':
        interval = '7 days';
        break;
      case '30d':
        interval = '30 days';
        break;
      default:
        interval = '30 days';
    }

    let whereClause = 'WHERE u.is_active = true';
    let params = [];
    
    if (userType) {
      whereClause += ' AND u.user_type = $1';
      params.push(userType);
    }

    // User growth over time
    const growthData = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        user_type,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      ${userType ? 'AND user_type = $1' : ''}
      GROUP BY DATE(created_at), user_type
      ORDER BY date DESC
    `, params);

    // User activity levels
    const activityData = await pool.query(`
      SELECT 
        u.user_type,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.last_login >= NOW() - INTERVAL '1 day' THEN u.id END) as daily_active,
        COUNT(DISTINCT CASE WHEN u.last_login >= NOW() - INTERVAL '7 days' THEN u.id END) as weekly_active,
        COUNT(DISTINCT CASE WHEN u.last_login >= NOW() - INTERVAL '30 days' THEN u.id END) as monthly_active
      FROM users u
      ${whereClause}
      GROUP BY u.user_type
    `, params);

    // User engagement by location
    const locationData = await pool.query(`
      SELECT 
        u.location,
        u.user_type,
        COUNT(*) as user_count,
        COUNT(CASE WHEN u.last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users
      FROM users u
      ${whereClause}
      AND u.location IS NOT NULL
      GROUP BY u.location, u.user_type
      ORDER BY user_count DESC
      LIMIT 20
    `, params);

    res.json({
      period,
      growth: growthData.rows,
      activity: activityData.rows,
      locations: locationData.rows
    });
  } catch (error) {
    logger.error('Get user analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task analytics
app.get('/api/tasks', async (req, res) => {
  try {
    const { period = '30d', category } = req.query;
    
    let interval;
    switch (period) {
      case '1d':
        interval = '1 day';
        break;
      case '7d':
        interval = '7 days';
        break;
      case '30d':
        interval = '30 days';
        break;
      default:
        interval = '30 days';
    }

    let whereClause = 'WHERE t.created_at >= NOW() - INTERVAL \'' + interval + '\'';
    let params = [];
    
    if (category) {
      whereClause += ' AND t.category = $1';
      params.push(category);
    }

    // Task creation trends
    const creationData = await pool.query(`
      SELECT 
        DATE(t.created_at) as date,
        t.category,
        u.user_type,
        COUNT(*) as tasks_created
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      ${whereClause}
      GROUP BY DATE(t.created_at), t.category, u.user_type
      ORDER BY date DESC
    `, params);

    // Task completion rates
    const completionData = await pool.query(`
      SELECT 
        t.category,
        u.user_type,
        COUNT(*) as total_tasks,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
        ROUND(
          COUNT(CASE WHEN t.status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 
          2
        ) as completion_rate
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      ${whereClause}
      GROUP BY t.category, u.user_type
    `, params);

    // Popular categories
    const categoryData = await pool.query(`
      SELECT 
        t.category,
        COUNT(*) as task_count,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count,
        AVG(t.estimated_duration_hours) as avg_duration
      FROM tasks t
      ${whereClause}
      GROUP BY t.category
      ORDER BY task_count DESC
    `, params);

    // Task applications
    const applicationData = await pool.query(`
      SELECT 
        DATE(ta.applied_at) as date,
        t.category,
        COUNT(*) as applications,
        COUNT(CASE WHEN ta.status = 'approved' THEN 1 END) as approved_applications
      FROM task_applications ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE ta.applied_at >= NOW() - INTERVAL '${interval}'
      ${category ? 'AND t.category = $1' : ''}
      GROUP BY DATE(ta.applied_at), t.category
      ORDER BY date DESC
    `, params);

    res.json({
      period,
      creation: creationData.rows,
      completion: completionData.rows,
      categories: categoryData.rows,
      applications: applicationData.rows
    });
  } catch (error) {
    logger.error('Get task analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get content analytics
app.get('/api/content', async (req, res) => {
  try {
    const { period = '30d', contentType } = req.query;
    
    let interval;
    switch (period) {
      case '1d':
        interval = '1 day';
        break;
      case '7d':
        interval = '7 days';
        break;
      case '30d':
        interval = '30 days';
        break;
      default:
        interval = '30 days';
    }

    let whereClause = 'WHERE c.created_at >= NOW() - INTERVAL \'' + interval + '\'';
    let params = [];
    
    if (contentType) {
      whereClause += ' AND c.content_type = $1';
      params.push(contentType);
    }

    // Content upload trends
    const uploadData = await pool.query(`
      SELECT 
        DATE(c.created_at) as date,
        c.content_type,
        u.user_type,
        COUNT(*) as uploads,
        SUM(c.file_size) as total_size
      FROM content c
      JOIN users u ON c.user_id = u.id
      ${whereClause}
      GROUP BY DATE(c.created_at), c.content_type, u.user_type
      ORDER BY date DESC
    `, params);

    // Content engagement
    const engagementData = await pool.query(`
      SELECT 
        c.content_type,
        u.user_type,
        COUNT(*) as total_content,
        SUM(c.download_count) as total_downloads,
        SUM(c.view_count) as total_views,
        AVG(c.download_count) as avg_downloads,
        AVG(c.view_count) as avg_views
      FROM content c
      JOIN users u ON c.user_id = u.id
      ${whereClause}
      GROUP BY c.content_type, u.user_type
    `, params);

    // Popular content
    const popularData = await pool.query(`
      SELECT 
        c.id,
        c.title,
        c.content_type,
        c.download_count,
        c.view_count,
        u.first_name,
        u.last_name,
        u.user_type
      FROM content c
      JOIN users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY (c.download_count + c.view_count) DESC
      LIMIT 20
    `, params);

    res.json({
      period,
      uploads: uploadData.rows,
      engagement: engagementData.rows,
      popular: popularData.rows
    });
  } catch (error) {
    logger.error('Get content analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get search analytics
app.get('/api/search', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let interval;
    switch (period) {
      case '1d':
        interval = '1 day';
        break;
      case '7d':
        interval = '7 days';
        break;
      case '30d':
        interval = '30 days';
        break;
      default:
        interval = '30 days';
    }

    // Search trends
    const searchData = await pool.query(`
      SELECT 
        DATE(search_timestamp) as date,
        COUNT(*) as search_count,
        COUNT(DISTINCT user_id) as unique_searchers,
        AVG(results_count) as avg_results
      FROM search_analytics
      WHERE search_timestamp >= NOW() - INTERVAL '${interval}'
      GROUP BY DATE(search_timestamp)
      ORDER BY date DESC
    `);

    // Popular search terms
    const popularTerms = await pool.query(`
      SELECT 
        query,
        COUNT(*) as search_count,
        AVG(results_count) as avg_results
      FROM search_analytics
      WHERE search_timestamp >= NOW() - INTERVAL '${interval}'
        AND query IS NOT NULL
        AND query != ''
      GROUP BY query
      ORDER BY search_count DESC
      LIMIT 20
    `);

    // Search by user type
    const userTypeData = await pool.query(`
      SELECT 
        u.user_type,
        COUNT(sa.*) as search_count,
        AVG(sa.results_count) as avg_results
      FROM search_analytics sa
      JOIN users u ON sa.user_id = u.id
      WHERE sa.search_timestamp >= NOW() - INTERVAL '${interval}'
      GROUP BY u.user_type
    `);

    res.json({
      period,
      trends: searchData.rows,
      popularTerms: popularTerms.rows,
      byUserType: userTypeData.rows
    });
  } catch (error) {
    logger.error('Get search analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get real-time metrics
app.get('/api/realtime', async (req, res) => {
  try {
    // Get current active users
    const activeUsersData = await pool.query(`
      SELECT 
        user_type,
        COUNT(*) as count
      FROM users
      WHERE last_login >= NOW() - INTERVAL '1 hour'
        AND is_active = true
      GROUP BY user_type
    `);

    // Get tasks created in last hour
    const recentTasks = await pool.query(`
      SELECT 
        t.category,
        u.user_type,
        COUNT(*) as count
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      WHERE t.created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY t.category, u.user_type
    `);

    // Get content uploaded in last hour
    const recentContent = await pool.query(`
      SELECT 
        c.content_type,
        u.user_type,
        COUNT(*) as count
      FROM content c
      JOIN users u ON c.user_id = u.id
      WHERE c.created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY c.content_type, u.user_type
    `);

    // Get search queries in last hour
    const recentSearches = await pool.query(`
      SELECT 
        COUNT(*) as search_count,
        COUNT(DISTINCT user_id) as unique_searchers
      FROM search_analytics
      WHERE search_timestamp >= NOW() - INTERVAL '1 hour'
    `);

    res.json({
      timestamp: new Date().toISOString(),
      activeUsers: activeUsersData.rows,
      recentTasks: recentTasks.rows,
      recentContent: recentContent.rows,
      recentSearches: recentSearches.rows[0]
    });
  } catch (error) {
    logger.error('Get real-time metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log analytics event
app.post('/api/events', async (req, res) => {
  try {
    const { eventType, userId, userType, data } = req.body;

    await pool.query(`
      INSERT INTO analytics_events (event_type, user_id, user_type, data)
      VALUES ($1, $2, $3, $4)
    `, [eventType, userId, userType, JSON.stringify(data)]);

    res.json({ message: 'Event logged successfully' });
  } catch (error) {
    logger.error('Log event error:', error);
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

// Schedule metrics collection every 5 minutes
cron.schedule('*/5 * * * *', () => {
  collectMetrics();
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    // Initial metrics collection
    await collectMetrics();
    
    app.listen(PORT, () => {
      logger.info(`Monitoring service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
