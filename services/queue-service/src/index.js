const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const redis = require('redis');
const amqp = require('amqplib');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const axios = require('axios');
const Queue = require('bull');
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
    new winston.transports.File({ filename: 'logs/queue-service.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 3007;

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

// RabbitMQ connection
let channel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    
    // Declare queues
    await channel.assertQueue('task-notifications', { durable: true });
    await channel.assertQueue('task-reminders', { durable: true });
    await channel.assertQueue('task-completion', { durable: true });
    await channel.assertQueue('matching-requests', { durable: true });
    await channel.assertQueue('matching-results', { durable: true });
    await channel.assertQueue('email-notifications', { durable: true });
    await channel.assertQueue('content-processing', { durable: true });
    await channel.assertQueue('analytics-events', { durable: true });
    
    logger.info('Connected to RabbitMQ');
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
  }
};

// Bull queues
const taskQueue = new Queue('task processing', process.env.REDIS_URL);
const notificationQueue = new Queue('notifications', process.env.REDIS_URL);
const contentQueue = new Queue('content processing', process.env.REDIS_URL);
const analyticsQueue = new Queue('analytics', process.env.REDIS_URL);

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  task: process.env.TASK_SERVICE_URL || 'http://task-service:3002',
  search: process.env.SEARCH_SERVICE_URL || 'http://search-service:3003',
  content: process.env.CONTENT_SERVICE_URL || 'http://content-service:3004',
  monitoring: process.env.MONITORING_SERVICE_URL || 'http://monitoring-service:3005',
  matching: process.env.MATCHING_SERVICE_URL || 'http://matching-engine:3006'
};

// Job processors
class JobProcessor {
  constructor() {
    this.setupProcessors();
  }

  setupProcessors() {
    // Task processing jobs
    taskQueue.process('task-created', 5, async (job) => {
      return await this.processTaskCreated(job.data);
    });

    taskQueue.process('task-application', 10, async (job) => {
      return await this.processTaskApplication(job.data);
    });

    taskQueue.process('task-completed', 5, async (job) => {
      return await this.processTaskCompleted(job.data);
    });

    // Notification jobs
    notificationQueue.process('email', 20, async (job) => {
      return await this.processEmailNotification(job.data);
    });

    notificationQueue.process('push', 50, async (job) => {
      return await this.processPushNotification(job.data);
    });

    // Content processing jobs
    contentQueue.process('image-processing', 3, async (job) => {
      return await this.processImageContent(job.data);
    });

    contentQueue.process('video-processing', 2, async (job) => {
      return await this.processVideoContent(job.data);
    });

    // Analytics jobs
    analyticsQueue.process('event-tracking', 100, async (job) => {
      return await this.processAnalyticsEvent(job.data);
    });
  }

  async processTaskCreated(data) {
    try {
      const { taskId, taskData } = data;
      
      // Trigger matching engine
      await this.publishMessage('matching-requests', {
        type: 'task_matches',
        taskId: taskId,
        priority: 'high'
      });

      // Send notifications to interested users
      await this.publishMessage('task-notifications', {
        type: 'task_created',
        taskId: taskId,
        category: taskData.category,
        location: taskData.location
      });

      // Schedule reminder for task deadline
      if (taskData.deadline) {
        const reminderTime = new Date(taskData.deadline);
        reminderTime.setHours(reminderTime.getHours() - 24); // 24 hours before deadline
        
        if (reminderTime > new Date()) {
          await taskQueue.add('task-reminder', {
            taskId: taskId,
            type: 'deadline_reminder'
          }, {
            delay: reminderTime.getTime() - Date.now()
          });
        }
      }

      logger.info(`Processed task created: ${taskId}`);
      return { success: true, taskId };
    } catch (error) {
      logger.error('Error processing task created:', error);
      throw error;
    }
  }

  async processTaskApplication(data) {
    try {
      const { taskId, applicationId, applicantId, taskCreatorId } = data;
      
      // Send notification to task creator
      await this.publishMessage('task-notifications', {
        type: 'task_application',
        taskId: taskId,
        applicationId: applicationId,
        applicantId: applicantId,
        creatorId: taskCreatorId
      });

      // Update analytics
      await analyticsQueue.add('event-tracking', {
        eventType: 'task_application',
        taskId: taskId,
        userId: applicantId,
        timestamp: new Date().toISOString()
      });

      logger.info(`Processed task application: ${applicationId}`);
      return { success: true, applicationId };
    } catch (error) {
      logger.error('Error processing task application:', error);
      throw error;
    }
  }

  async processTaskCompleted(data) {
    try {
      const { taskId, participantId, rating, feedback } = data;
      
      // Send completion notifications
      await this.publishMessage('task-completion', {
        type: 'task_completed',
        taskId: taskId,
        participantId: participantId,
        rating: rating,
        feedback: feedback
      });

      // Update user statistics
      await this.updateUserStatistics(participantId, 'task_completed');

      // Trigger new recommendations
      await this.publishMessage('matching-requests', {
        type: 'user_matches',
        userId: participantId,
        priority: 'normal'
      });

      // Update analytics
      await analyticsQueue.add('event-tracking', {
        eventType: 'task_completed',
        taskId: taskId,
        userId: participantId,
        rating: rating,
        timestamp: new Date().toISOString()
      });

      logger.info(`Processed task completion: ${taskId}`);
      return { success: true, taskId };
    } catch (error) {
      logger.error('Error processing task completion:', error);
      throw error;
    }
  }

  async processEmailNotification(data) {
    try {
      const { to, subject, template, data: templateData } = data;
      
      // In production, integrate with email service (SendGrid, SES, etc.)
      logger.info(`Sending email to ${to}: ${subject}`);
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true, messageId: uuidv4() };
    } catch (error) {
      logger.error('Error processing email notification:', error);
      throw error;
    }
  }

  async processPushNotification(data) {
    try {
      const { userId, title, message, type } = data;
      
      // In production, integrate with push notification service (FCM, APNS, etc.)
      logger.info(`Sending push notification to ${userId}: ${title}`);
      
      // Simulate push notification
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return { success: true, notificationId: uuidv4() };
    } catch (error) {
      logger.error('Error processing push notification:', error);
      throw error;
    }
  }

  async processImageContent(data) {
    try {
      const { contentId, filePath, operations } = data;
      
      // In production, implement actual image processing
      logger.info(`Processing image content: ${contentId}`);
      
      // Simulate image processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { success: true, contentId, processedPath: filePath };
    } catch (error) {
      logger.error('Error processing image content:', error);
      throw error;
    }
  }

  async processVideoContent(data) {
    try {
      const { contentId, filePath, operations } = data;
      
      // In production, implement actual video processing
      logger.info(`Processing video content: ${contentId}`);
      
      // Simulate video processing
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return { success: true, contentId, processedPath: filePath };
    } catch (error) {
      logger.error('Error processing video content:', error);
      throw error;
    }
  }

  async processAnalyticsEvent(data) {
    try {
      const { eventType, userId, taskId, data: eventData } = data;
      
      // Store analytics event in database
      await pool.query(`
        INSERT INTO analytics_events (event_type, user_id, task_id, data, timestamp)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `, [eventType, userId, taskId, JSON.stringify(eventData)]);
      
      return { success: true };
    } catch (error) {
      logger.error('Error processing analytics event:', error);
      throw error;
    }
  }

  async updateUserStatistics(userId, action) {
    try {
      const statsKey = `user_stats:${userId}`;
      
      switch (action) {
        case 'task_completed':
          await redisClient.hIncrBy(statsKey, 'completed_tasks', 1);
          break;
        case 'task_created':
          await redisClient.hIncrBy(statsKey, 'created_tasks', 1);
          break;
        case 'content_uploaded':
          await redisClient.hIncrBy(statsKey, 'uploaded_content', 1);
          break;
      }
      
      await redisClient.expire(statsKey, 86400 * 30); // 30 days
    } catch (error) {
      logger.error('Error updating user statistics:', error);
    }
  }

  async publishMessage(queue, message) {
    if (!channel) {
      logger.error('RabbitMQ channel not available');
      return;
    }

    try {
      await channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
        persistent: true
      });
    } catch (error) {
      logger.error(`Failed to publish message to ${queue}:`, error);
    }
  }
}

const jobProcessor = new JobProcessor();

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

// Database initialization
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS queue_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_type VARCHAR(100) NOT NULL,
        job_data JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        priority INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS queue_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        queue_name VARCHAR(100) NOT NULL,
        job_type VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL,
        processing_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'queue-service', 
    timestamp: new Date().toISOString() 
  });
});

// Get queue status
app.get('/api/queues/status', async (req, res) => {
  try {
    const taskQueueStatus = await taskQueue.getJobCounts();
    const notificationQueueStatus = await notificationQueue.getJobCounts();
    const contentQueueStatus = await contentQueue.getJobCounts();
    const analyticsQueueStatus = await analyticsQueue.getJobCounts();

    res.json({
      queues: {
        task: taskQueueStatus,
        notification: notificationQueueStatus,
        content: contentQueueStatus,
        analytics: analyticsQueueStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Get queue status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add job to queue
app.post('/api/queues/:queueName/jobs', async (req, res) => {
  try {
    const { queueName } = req.params;
    const { jobType, jobData, priority = 0, delay = 0 } = req.body;

    let queue;
    switch (queueName) {
      case 'task':
        queue = taskQueue;
        break;
      case 'notification':
        queue = notificationQueue;
        break;
      case 'content':
        queue = contentQueue;
        break;
      case 'analytics':
        queue = analyticsQueue;
        break;
      default:
        return res.status(400).json({ error: 'Invalid queue name' });
    }

    const job = await queue.add(jobType, jobData, {
      priority: priority,
      delay: delay,
      removeOnComplete: 100,
      removeOnFail: 50
    });

    // Store job in database
    await pool.query(`
      INSERT INTO queue_jobs (job_type, job_data, priority, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    `, [jobType, JSON.stringify(jobData), priority]);

    res.json({
      jobId: job.id,
      queueName,
      jobType,
      status: 'queued',
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Add job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get job status
app.get('/api/queues/:queueName/jobs/:jobId', async (req, res) => {
  try {
    const { queueName, jobId } = req.params;

    let queue;
    switch (queueName) {
      case 'task':
        queue = taskQueue;
        break;
      case 'notification':
        queue = notificationQueue;
        break;
      case 'content':
        queue = contentQueue;
        break;
      case 'analytics':
        queue = analyticsQueue;
        break;
      default:
        return res.status(400).json({ error: 'Invalid queue name' });
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: job.id,
      status: await job.getState(),
      progress: job.progress(),
      data: job.data,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      failedReason: job.failedReason
    });
  } catch (error) {
    logger.error('Get job status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Retry failed job
app.post('/api/queues/:queueName/jobs/:jobId/retry', async (req, res) => {
  try {
    const { queueName, jobId } = req.params;

    let queue;
    switch (queueName) {
      case 'task':
        queue = taskQueue;
        break;
      case 'notification':
        queue = notificationQueue;
        break;
      case 'content':
        queue = contentQueue;
        break;
      case 'analytics':
        queue = analyticsQueue;
        break;
      default:
        return res.status(400).json({ error: 'Invalid queue name' });
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await job.retry();

    res.json({ message: 'Job retried successfully' });
  } catch (error) {
    logger.error('Retry job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get queue metrics
app.get('/api/queues/metrics', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let interval;
    switch (period) {
      case '1h':
        interval = '1 hour';
        break;
      case '24h':
        interval = '24 hours';
        break;
      case '7d':
        interval = '7 days';
        break;
      default:
        interval = '24 hours';
    }

    const metricsResult = await pool.query(`
      SELECT 
        queue_name,
        job_type,
        status,
        COUNT(*) as count,
        AVG(processing_time_ms) as avg_processing_time
      FROM queue_metrics
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY queue_name, job_type, status
      ORDER BY queue_name, job_type, status
    `);

    res.json({
      period,
      metrics: metricsResult.rows
    });
  } catch (error) {
    logger.error('Get queue metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup old jobs (runs daily)
cron.schedule('0 2 * * *', async () => {
  try {
    // Clean up completed jobs older than 7 days
    await pool.query(`
      DELETE FROM queue_jobs 
      WHERE status = 'completed' 
        AND completed_at < NOW() - INTERVAL '7 days'
    `);

    // Clean up failed jobs older than 30 days
    await pool.query(`
      DELETE FROM queue_jobs 
      WHERE status = 'failed' 
        AND created_at < NOW() - INTERVAL '30 days'
    `);

    logger.info('Cleaned up old queue jobs');
  } catch (error) {
    logger.error('Cleanup jobs error:', error);
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
    await connectRabbitMQ();
    
    app.listen(PORT, () => {
      logger.info(`Queue service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
