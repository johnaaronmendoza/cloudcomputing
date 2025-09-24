const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const redis = require('redis');
const amqp = require('amqplib');
const { body, validationResult, query } = require('express-validator');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'task-service.log' })
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
    
    logger.info('Connected to RabbitMQ');
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
  }
};

// Task statuses
const TASK_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

const APPLICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/tasks', limiter);

// Authentication middleware (expects user info from API Gateway)
const authenticateRequest = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userType = req.headers['x-user-type'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.user = { id: userId, type: userType, role: userRole };
  next();
};

// Database initialization
const initializeDatabase = async () => {
  try {
    // Tasks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        skills_required TEXT[],
        location VARCHAR(255),
        is_virtual BOOLEAN DEFAULT FALSE,
        virtual_meeting_url VARCHAR(500),
        estimated_duration_hours DECIMAL(4,2),
        max_participants INTEGER DEFAULT 1,
        current_participants INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'cancelled', 'expired')),
        priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        created_by UUID NOT NULL,
        assigned_to UUID,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        deadline TIMESTAMP,
        requirements TEXT,
        benefits TEXT,
        tags TEXT[],
        is_recurring BOOLEAN DEFAULT FALSE,
        recurrence_pattern VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Task applications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        applicant_id UUID NOT NULL,
        message TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by UUID,
        review_notes TEXT
      )
    `);

    // Task participants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        participant_id UUID NOT NULL,
        role VARCHAR(50) DEFAULT 'volunteer',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        feedback TEXT,
        UNIQUE(task_id, participant_id)
      )
    `);

    // Task skills table for better search
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_skills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
        skill_name VARCHAR(100) NOT NULL,
        skill_level VARCHAR(20) DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
        UNIQUE(task_id, skill_name)
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
      CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location);
      CREATE INDEX IF NOT EXISTS idx_tasks_start_date ON tasks(start_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
      CREATE INDEX IF NOT EXISTS idx_task_applications_task_id ON task_applications(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_applications_applicant_id ON task_applications(applicant_id);
      CREATE INDEX IF NOT EXISTS idx_task_participants_task_id ON task_participants(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_participants_participant_id ON task_participants(participant_id);
      CREATE INDEX IF NOT EXISTS idx_task_skills_task_id ON task_skills(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_skills_skill_name ON task_skills(skill_name);
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

// Concurrency control for task applications
const acquireTaskLock = async (taskId) => {
  const lockKey = `task_lock:${taskId}`;
  const lockValue = uuidv4();
  const lockTTL = 30; // 30 seconds

  try {
    const result = await redisClient.set(lockKey, lockValue, {
      EX: lockTTL,
      NX: true
    });

    return result === 'OK' ? lockValue : null;
  } catch (error) {
    logger.error('Failed to acquire task lock:', error);
    return null;
  }
};

const releaseTaskLock = async (taskId, lockValue) => {
  const lockKey = `task_lock:${taskId}`;
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  try {
    await redisClient.eval(script, 1, lockKey, lockValue);
  } catch (error) {
    logger.error('Failed to release task lock:', error);
  }
};

// Publish message to queue
const publishMessage = async (queue, message) => {
  if (!channel) {
    logger.error('RabbitMQ channel not available');
    return;
  }

  try {
    await channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true
    });
    logger.info(`Message published to ${queue}:`, message);
  } catch (error) {
    logger.error(`Failed to publish message to ${queue}:`, error);
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'task-service', 
    timestamp: new Date().toISOString() 
  });
});

// Get all tasks with filtering and pagination
app.get('/api/tasks', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isString(),
  query('status').optional().isIn(Object.values(TASK_STATUS)),
  query('location').optional().isString(),
  query('skills').optional().isString(),
  query('search').optional().isString(),
  query('created_by').optional().isUUID(),
  query('assigned_to').optional().isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 20,
      category,
      status,
      location,
      skills,
      search,
      created_by,
      assigned_to
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    // Build WHERE clause
    if (category) {
      whereConditions.push(`category = $${paramCount++}`);
      queryParams.push(category);
    }

    if (status) {
      whereConditions.push(`status = $${paramCount++}`);
      queryParams.push(status);
    }

    if (location) {
      whereConditions.push(`(location ILIKE $${paramCount} OR is_virtual = true)`);
      queryParams.push(`%${location}%`);
      paramCount++;
    }

    if (skills) {
      const skillList = skills.split(',').map(s => s.trim());
      whereConditions.push(`skills_required && $${paramCount++}`);
      queryParams.push(skillList);
    }

    if (search) {
      whereConditions.push(`(title ILIKE $${paramCount} OR description ILIKE $${paramCount + 1} OR tags && $${paramCount + 2})`);
      queryParams.push(`%${search}%`, `%${search}%`, [search]);
      paramCount += 3;
    }

    if (created_by) {
      whereConditions.push(`created_by = $${paramCount++}`);
      queryParams.push(created_by);
    }

    if (assigned_to) {
      whereConditions.push(`assigned_to = $${paramCount++}`);
      queryParams.push(assigned_to);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM tasks ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalTasks = parseInt(countResult.rows[0].count);

    // Get tasks
    const tasksQuery = `
      SELECT 
        t.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        u.user_type as creator_type,
        COUNT(tp.participant_id) as current_participants_count
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN task_participants tp ON t.id = tp.task_id
      ${whereClause}
      GROUP BY t.id, u.first_name, u.last_name, u.user_type
      ORDER BY t.created_at DESC
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    queryParams.push(limit, offset);
    const tasksResult = await pool.query(tasksQuery, queryParams);

    // Get skills for each task
    const tasks = await Promise.all(tasksResult.rows.map(async (task) => {
      const skillsResult = await pool.query(
        'SELECT skill_name, skill_level FROM task_skills WHERE task_id = $1',
        [task.id]
      );

      return {
        ...task,
        skills: skillsResult.rows,
        current_participants: task.current_participants_count
      };
    }));

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalTasks,
        pages: Math.ceil(totalTasks / limit)
      }
    });
  } catch (error) {
    logger.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get task by ID
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const taskResult = await pool.query(`
      SELECT 
        t.*,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        u.user_type as creator_type,
        u.email as creator_email
      FROM tasks t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [id]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Get skills
    const skillsResult = await pool.query(
      'SELECT skill_name, skill_level FROM task_skills WHERE task_id = $1',
      [id]
    );

    // Get participants
    const participantsResult = await pool.query(`
      SELECT 
        tp.*,
        u.first_name,
        u.last_name,
        u.user_type
      FROM task_participants tp
      LEFT JOIN users u ON tp.participant_id = u.id
      WHERE tp.task_id = $1
    `, [id]);

    // Get applications (if user is creator)
    let applications = [];
    if (req.user && req.user.id === task.created_by) {
      const applicationsResult = await pool.query(`
        SELECT 
          ta.*,
          u.first_name,
          u.last_name,
          u.user_type,
          u.email
        FROM task_applications ta
        LEFT JOIN users u ON ta.applicant_id = u.id
        WHERE ta.task_id = $1
        ORDER BY ta.applied_at DESC
      `, [id]);
      applications = applicationsResult.rows;
    }

    res.json({
      ...task,
      skills: skillsResult.rows,
      participants: participantsResult.rows,
      applications
    });
  } catch (error) {
    logger.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new task
app.post('/api/tasks', authenticateRequest, [
  body('title').trim().isLength({ min: 5, max: 255 }),
  body('description').trim().isLength({ min: 20, max: 2000 }),
  body('category').trim().isLength({ min: 2, max: 100 }),
  body('subcategory').optional().trim().isLength({ max: 100 }),
  body('skills_required').isArray(),
  body('location').optional().trim().isLength({ max: 255 }),
  body('is_virtual').optional().isBoolean(),
  body('virtual_meeting_url').optional().isURL(),
  body('estimated_duration_hours').optional().isFloat({ min: 0.5, max: 168 }),
  body('max_participants').optional().isInt({ min: 1, max: 100 }),
  body('start_date').optional().isISO8601(),
  body('end_date').optional().isISO8601(),
  body('deadline').optional().isISO8601(),
  body('requirements').optional().trim().isLength({ max: 1000 }),
  body('benefits').optional().trim().isLength({ max: 1000 }),
  body('tags').optional().isArray(),
  body('priority').optional().isIn(Object.values(TASK_STATUS))
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      description,
      category,
      subcategory,
      skills_required,
      location,
      is_virtual = false,
      virtual_meeting_url,
      estimated_duration_hours,
      max_participants = 1,
      start_date,
      end_date,
      deadline,
      requirements,
      benefits,
      tags = [],
      priority = 'medium'
    } = req.body;

    // Create task
    const taskResult = await pool.query(`
      INSERT INTO tasks (
        title, description, category, subcategory, skills_required, location,
        is_virtual, virtual_meeting_url, estimated_duration_hours, max_participants,
        start_date, end_date, deadline, requirements, benefits, tags, priority, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [
      title, description, category, subcategory, skills_required, location,
      is_virtual, virtual_meeting_url, estimated_duration_hours, max_participants,
      start_date, end_date, deadline, requirements, benefits, tags, priority, req.user.id
    ]);

    const task = taskResult.rows[0];

    // Add skills to task_skills table
    if (skills_required && skills_required.length > 0) {
      for (const skill of skills_required) {
        await pool.query(`
          INSERT INTO task_skills (task_id, skill_name, skill_level)
          VALUES ($1, $2, $3)
        `, [task.id, skill.name || skill, skill.level || 'beginner']);
      }
    }

    // Publish task creation notification
    await publishMessage('task-notifications', {
      type: 'task_created',
      task_id: task.id,
      title: task.title,
      created_by: req.user.id,
      category: task.category
    });

    logger.info(`Task created: ${task.id} by user ${req.user.id}`);

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    logger.error('Create task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Apply for task
app.post('/api/tasks/:id/apply', authenticateRequest, [
  body('message').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    // Acquire lock for concurrency control
    const lockValue = await acquireTaskLock(id);
    if (!lockValue) {
      return res.status(409).json({ error: 'Task is currently being processed, please try again' });
    }

    try {
      // Check if task exists and is published
      const taskResult = await pool.query(
        'SELECT * FROM tasks WHERE id = $1 AND status = $2',
        [id, TASK_STATUS.PUBLISHED]
      );

      if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found or not available for applications' });
      }

      const task = taskResult.rows[0];

      // Check if user is the creator
      if (task.created_by === req.user.id) {
        return res.status(400).json({ error: 'Cannot apply to your own task' });
      }

      // Check if already applied
      const existingApplication = await pool.query(
        'SELECT id FROM task_applications WHERE task_id = $1 AND applicant_id = $2',
        [id, req.user.id]
      );

      if (existingApplication.rows.length > 0) {
        return res.status(409).json({ error: 'Already applied to this task' });
      }

      // Check if already a participant
      const existingParticipant = await pool.query(
        'SELECT id FROM task_participants WHERE task_id = $1 AND participant_id = $2',
        [id, req.user.id]
      );

      if (existingParticipant.rows.length > 0) {
        return res.status(409).json({ error: 'Already participating in this task' });
      }

      // Check if task is full
      if (task.current_participants >= task.max_participants) {
        return res.status(409).json({ error: 'Task is full' });
      }

      // Create application
      const applicationResult = await pool.query(`
        INSERT INTO task_applications (task_id, applicant_id, message)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [id, req.user.id, message]);

      // Publish application notification
      await publishMessage('task-notifications', {
        type: 'task_application',
        task_id: id,
        applicant_id: req.user.id,
        application_id: applicationResult.rows[0].id
      });

      logger.info(`Application created for task ${id} by user ${req.user.id}`);

      res.status(201).json({
        message: 'Application submitted successfully',
        application: applicationResult.rows[0]
      });
    } finally {
      await releaseTaskLock(id, lockValue);
    }
  } catch (error) {
    logger.error('Apply for task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Approve/reject application
app.put('/api/tasks/:taskId/applications/:applicationId', authenticateRequest, [
  body('status').isIn([APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.REJECTED]),
  body('review_notes').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const { taskId, applicationId } = req.params;
    const { status, review_notes } = req.body;

    // Check if user is task creator
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND created_by = $2',
      [taskId, req.user.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to review this application' });
    }

    const task = taskResult.rows[0];

    // Get application
    const applicationResult = await pool.query(
      'SELECT * FROM task_applications WHERE id = $1 AND task_id = $2',
      [applicationId, taskId]
    );

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = applicationResult.rows[0];

    if (application.status !== APPLICATION_STATUS.PENDING) {
      return res.status(400).json({ error: 'Application has already been processed' });
    }

    // Update application
    await pool.query(`
      UPDATE task_applications 
      SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2, review_notes = $3
      WHERE id = $4
    `, [status, req.user.id, review_notes, applicationId]);

    // If approved, add as participant
    if (status === APPLICATION_STATUS.APPROVED) {
      // Check if task is still not full
      if (task.current_participants >= task.max_participants) {
        return res.status(409).json({ error: 'Task is now full' });
      }

      await pool.query(`
        INSERT INTO task_participants (task_id, participant_id, role)
        VALUES ($1, $2, 'volunteer')
      `, [taskId, application.applicant_id]);

      // Update task participant count
      await pool.query(`
        UPDATE tasks 
        SET current_participants = current_participants + 1
        WHERE id = $1
      `, [taskId]);

      // Publish participant added notification
      await publishMessage('task-notifications', {
        type: 'participant_added',
        task_id: taskId,
        participant_id: application.applicant_id
      });
    }

    // Publish application status update notification
    await publishMessage('task-notifications', {
      type: 'application_status_update',
      task_id: taskId,
      application_id: applicationId,
      status: status,
      applicant_id: application.applicant_id
    });

    logger.info(`Application ${applicationId} ${status} for task ${taskId}`);

    res.json({
      message: `Application ${status} successfully`,
      application: {
        id: applicationId,
        status,
        reviewed_at: new Date().toISOString(),
        review_notes
      }
    });
  } catch (error) {
    logger.error('Update application error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task status
app.put('/api/tasks/:id/status', authenticateRequest, [
  body('status').isIn(Object.values(TASK_STATUS))
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if user is task creator
    const taskResult = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND created_by = $2',
      [id, req.user.id]
    );

    if (taskResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to update this task' });
    }

    // Update task status
    await pool.query(
      'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    // Publish status update notification
    await publishMessage('task-notifications', {
      type: 'task_status_update',
      task_id: id,
      status: status,
      updated_by: req.user.id
    });

    logger.info(`Task ${id} status updated to ${status} by user ${req.user.id}`);

    res.json({
      message: 'Task status updated successfully',
      task_id: id,
      status
    });
  } catch (error) {
    logger.error('Update task status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete task participation
app.post('/api/tasks/:id/complete', authenticateRequest, [
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('feedback').optional().trim().isLength({ max: 1000 })
], async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;

    // Check if user is a participant
    const participantResult = await pool.query(
      'SELECT * FROM task_participants WHERE task_id = $1 AND participant_id = $2',
      [id, req.user.id]
    );

    if (participantResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this task' });
    }

    const participant = participantResult.rows[0];

    if (participant.completed_at) {
      return res.status(400).json({ error: 'Task already completed' });
    }

    // Update participant completion
    await pool.query(`
      UPDATE task_participants 
      SET completed_at = CURRENT_TIMESTAMP, rating = $1, feedback = $2
      WHERE id = $3
    `, [rating, feedback, participant.id]);

    // Publish completion notification
    await publishMessage('task-completion', {
      type: 'task_completed',
      task_id: id,
      participant_id: req.user.id,
      rating,
      feedback
    });

    logger.info(`Task ${id} completed by user ${req.user.id}`);

    res.json({
      message: 'Task completed successfully',
      task_id: id,
      completed_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Complete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's tasks
app.get('/api/tasks/my/tasks', authenticateRequest, async (req, res) => {
  try {
    const { type = 'all' } = req.query; // 'created', 'participating', 'all'

    let query = '';
    let params = [req.user.id];

    switch (type) {
      case 'created':
        query = 'SELECT * FROM tasks WHERE created_by = $1 ORDER BY created_at DESC';
        break;
      case 'participating':
        query = `
          SELECT t.*, tp.role, tp.joined_at, tp.completed_at
          FROM tasks t
          JOIN task_participants tp ON t.id = tp.task_id
          WHERE tp.participant_id = $1
          ORDER BY tp.joined_at DESC
        `;
        break;
      default:
        query = `
          SELECT DISTINCT t.*, 
            CASE 
              WHEN t.created_by = $1 THEN 'creator'
              WHEN tp.participant_id = $1 THEN 'participant'
              ELSE 'other'
            END as user_role,
            tp.role as participant_role,
            tp.joined_at,
            tp.completed_at
          FROM tasks t
          LEFT JOIN task_participants tp ON t.id = tp.task_id AND tp.participant_id = $1
          WHERE t.created_by = $1 OR tp.participant_id = $1
          ORDER BY t.created_at DESC
        `;
    }

    const result = await pool.query(query, params);

    res.json({
      tasks: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Get user tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's applications
app.get('/api/tasks/my/applications', authenticateRequest, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ta.*,
        t.title,
        t.description,
        t.category,
        t.status as task_status,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name
      FROM task_applications ta
      JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE ta.applicant_id = $1
      ORDER BY ta.applied_at DESC
    `, [req.user.id]);

    res.json({
      applications: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Get user applications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup expired tasks (cron job)
cron.schedule('0 0 * * *', async () => {
  try {
    const result = await pool.query(`
      UPDATE tasks 
      SET status = 'expired'
      WHERE status = 'published' 
        AND deadline < CURRENT_TIMESTAMP
    `);

    if (result.rowCount > 0) {
      logger.info(`Marked ${result.rowCount} tasks as expired`);
    }
  } catch (error) {
    logger.error('Cleanup expired tasks error:', error);
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
      logger.info(`Task service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;