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
const { Matrix } = require('ml-matrix');
const { euclidean, cosine } = require('ml-distance');
const natural = require('natural');
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
    new winston.transports.File({ filename: 'logs/matching-engine.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 3006;

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
    await channel.assertQueue('matching-requests', { durable: true });
    await channel.assertQueue('matching-results', { durable: true });
    await channel.assertQueue('matching-notifications', { durable: true });
    
    logger.info('Connected to RabbitMQ');
  } catch (error) {
    logger.error('RabbitMQ connection error:', error);
  }
};

// Service URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  task: process.env.TASK_SERVICE_URL || 'http://task-service:3002',
  search: process.env.SEARCH_SERVICE_URL || 'http://search-service:3003'
};

// Initialize natural language processing
const stemmer = natural.PorterStemmer;
const tokenizer = new natural.WordTokenizer();

// Matching algorithms
class MatchingEngine {
  constructor() {
    this.userProfiles = new Map();
    this.taskProfiles = new Map();
    this.skillWeights = new Map();
    this.locationWeights = new Map();
  }

  // Calculate skill similarity between user and task
  calculateSkillSimilarity(userSkills, taskSkills) {
    if (!userSkills || !taskSkills || userSkills.length === 0 || taskSkills.length === 0) {
      return 0;
    }

    const userSkillSet = new Set(userSkills.map(s => s.toLowerCase()));
    const taskSkillSet = new Set(taskSkills.map(s => s.toLowerCase()));
    
    const intersection = new Set([...userSkillSet].filter(s => taskSkillSet.has(s)));
    const union = new Set([...userSkillSet, ...taskSkillSet]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  // Calculate interest similarity
  calculateInterestSimilarity(userInterests, taskCategory, taskTags) {
    if (!userInterests || userInterests.length === 0) {
      return 0;
    }

    const userInterestSet = new Set(userInterests.map(i => i.toLowerCase()));
    const taskElements = [taskCategory, ...(taskTags || [])].map(t => t.toLowerCase());
    const taskElementSet = new Set(taskElements);
    
    const intersection = new Set([...userInterestSet].filter(i => taskElementSet.has(i)));
    const union = new Set([...userInterestSet, ...taskElementSet]);
    
    return intersection.size / union.size;
  }

  // Calculate location proximity score
  calculateLocationScore(userLocation, taskLocation, isVirtual) {
    if (isVirtual) {
      return 1.0; // Virtual tasks have maximum location score
    }

    if (!userLocation || !taskLocation) {
      return 0.5; // Neutral score for missing location data
    }

    // Simple location matching (in production, use proper geocoding)
    const userLocationLower = userLocation.toLowerCase();
    const taskLocationLower = taskLocation.toLowerCase();
    
    if (userLocationLower === taskLocationLower) {
      return 1.0;
    }
    
    // Check if locations are in the same city/region
    const userParts = userLocationLower.split(',').map(p => p.trim());
    const taskParts = taskLocationLower.split(',').map(p => p.trim());
    
    for (const userPart of userParts) {
      for (const taskPart of taskParts) {
        if (userPart === taskPart && userPart.length > 2) {
          return 0.8;
        }
      }
    }
    
    return 0.3; // Default score for different locations
  }

  // Calculate availability match
  calculateAvailabilityScore(userAvailability, taskSchedule) {
    if (!userAvailability || !taskSchedule) {
      return 0.5;
    }

    // Simple time matching (in production, use proper scheduling logic)
    const userTimes = userAvailability.times || [];
    const taskTime = new Date(taskSchedule);
    
    if (userTimes.length === 0) {
      return 0.5;
    }

    // Check if task time falls within user's available times
    for (const timeSlot of userTimes) {
      const start = new Date(timeSlot.start);
      const end = new Date(timeSlot.end);
      
      if (taskTime >= start && taskTime <= end) {
        return 1.0;
      }
    }
    
    return 0.2; // Low score if no time match
  }

  // Calculate user engagement score
  calculateEngagementScore(userId, userHistory) {
    if (!userHistory) {
      return 0.5;
    }

    const completedTasks = userHistory.completedTasks || 0;
    const appliedTasks = userHistory.appliedTasks || 0;
    const rating = userHistory.averageRating || 0;
    const lastActivity = userHistory.lastActivity || new Date(0);
    
    // Calculate days since last activity
    const daysSinceActivity = (new Date() - lastActivity) / (1000 * 60 * 60 * 24);
    
    // Engagement score based on activity and rating
    let engagementScore = 0.5;
    
    if (completedTasks > 0) {
      engagementScore += Math.min(completedTasks * 0.1, 0.3);
    }
    
    if (rating > 0) {
      engagementScore += (rating - 3) * 0.1; // Bonus for ratings above 3
    }
    
    if (daysSinceActivity < 7) {
      engagementScore += 0.2; // Recent activity bonus
    } else if (daysSinceActivity > 30) {
      engagementScore -= 0.2; // Penalty for inactivity
    }
    
    return Math.max(0, Math.min(1, engagementScore));
  }

  // Calculate comprehensive match score
  calculateMatchScore(user, task, userHistory) {
    const weights = {
      skills: 0.3,
      interests: 0.2,
      location: 0.2,
      availability: 0.15,
      engagement: 0.15
    };

    const skillScore = this.calculateSkillSimilarity(user.skills, task.skills_required);
    const interestScore = this.calculateInterestSimilarity(user.interests, task.category, task.tags);
    const locationScore = this.calculateLocationScore(user.location, task.location, task.is_virtual);
    const availabilityScore = this.calculateAvailabilityScore(user.availability, task.scheduled_date);
    const engagementScore = this.calculateEngagementScore(user.id, userHistory);

    const totalScore = 
      skillScore * weights.skills +
      interestScore * weights.interests +
      locationScore * weights.location +
      availabilityScore * weights.availability +
      engagementScore * weights.engagement;

    return {
      totalScore,
      breakdown: {
        skills: skillScore,
        interests: interestScore,
        location: locationScore,
        availability: availabilityScore,
        engagement: engagementScore
      }
    };
  }

  // Find best matches for a task
  async findMatchesForTask(taskId, limit = 10) {
    try {
      // Get task details
      const taskResult = await pool.query(`
        SELECT t.*, u.user_type as creator_type
        FROM tasks t
        JOIN users u ON t.created_by = u.id
        WHERE t.id = $1 AND t.status = 'published'
      `, [taskId]);

      if (taskResult.rows.length === 0) {
        return [];
      }

      const task = taskResult.rows[0];

      // Get potential volunteers (opposite user type)
      const oppositeType = task.creator_type === 'senior' ? 'youth' : 'senior';
      
      const usersResult = await pool.query(`
        SELECT 
          u.*,
          COUNT(tp.id) as completed_tasks,
          AVG(tp.rating) as average_rating,
          MAX(tp.completed_at) as last_activity
        FROM users u
        LEFT JOIN task_participants tp ON u.id = tp.participant_id
        WHERE u.user_type = $1 AND u.is_active = true
        GROUP BY u.id
      `, [oppositeType]);

      const matches = [];

      for (const user of usersResult.rows) {
        const userHistory = {
          completedTasks: parseInt(user.completed_tasks) || 0,
          averageRating: parseFloat(user.average_rating) || 0,
          lastActivity: user.last_activity || new Date(0)
        };

        const matchResult = this.calculateMatchScore(user, task, userHistory);
        
        if (matchResult.totalScore > 0.3) { // Minimum threshold
          matches.push({
            userId: user.id,
            userType: user.user_type,
            firstName: user.first_name,
            lastName: user.last_name,
            location: user.location,
            skills: user.skills,
            interests: user.interests,
            score: matchResult.totalScore,
            breakdown: matchResult.breakdown
          });
        }
      }

      // Sort by score and return top matches
      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error finding matches for task:', error);
      return [];
    }
  }

  // Find best tasks for a user
  async findTasksForUser(userId, limit = 10) {
    try {
      // Get user details
      const userResult = await pool.query(`
        SELECT * FROM users WHERE id = $1 AND is_active = true
      `, [userId]);

      if (userResult.rows.length === 0) {
        return [];
      }

      const user = userResult.rows[0];

      // Get user history
      const historyResult = await pool.query(`
        SELECT 
          COUNT(tp.id) as completed_tasks,
          AVG(tp.rating) as average_rating,
          MAX(tp.completed_at) as last_activity
        FROM task_participants tp
        WHERE tp.participant_id = $1
      `, [userId]);

      const userHistory = historyResult.rows[0] || {
        completed_tasks: 0,
        average_rating: 0,
        last_activity: new Date(0)
      };

      // Get available tasks (opposite user type)
      const oppositeType = user.user_type === 'senior' ? 'youth' : 'senior';
      
      const tasksResult = await pool.query(`
        SELECT t.*, u.user_type as creator_type
        FROM tasks t
        JOIN users u ON t.created_by = u.id
        WHERE u.user_type = $1 AND t.status = 'published'
        AND t.created_by != $2
        ORDER BY t.created_at DESC
        LIMIT 50
      `, [oppositeType, userId]);

      const matches = [];

      for (const task of tasksResult.rows) {
        const matchResult = this.calculateMatchScore(user, task, userHistory);
        
        if (matchResult.totalScore > 0.3) { // Minimum threshold
          matches.push({
            taskId: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            location: task.location,
            isVirtual: task.is_virtual,
            scheduledDate: task.scheduled_date,
            creatorType: task.creator_type,
            score: matchResult.totalScore,
            breakdown: matchResult.breakdown
          });
        }
      }

      // Sort by score and return top matches
      return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logger.error('Error finding tasks for user:', error);
      return [];
    }
  }
}

const matchingEngine = new MatchingEngine();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Utility functions
const getUserFromHeaders = (req) => {
  return {
    userId: req.headers['x-user-id'],
    userType: req.headers['x-user-type']
  };
};

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

// Database initialization
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS matching_results (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id UUID,
        user_id UUID,
        match_score FLOAT NOT NULL,
        match_breakdown JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'))
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS matching_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        preferred_categories TEXT[],
        preferred_skills TEXT[],
        location_preference JSONB,
        availability_preference JSONB,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS matching_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_type VARCHAR(50) NOT NULL,
        user_id UUID,
        task_id UUID,
        match_score FLOAT,
        action VARCHAR(50),
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
    service: 'matching-engine', 
    timestamp: new Date().toISOString() 
  });
});

// Get matches for a specific task
app.get('/api/matches/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { limit = 10 } = req.query;

    const matches = await matchingEngine.findMatchesForTask(taskId, parseInt(limit));

    // Store matches in database
    for (const match of matches) {
      await pool.query(`
        INSERT INTO matching_results (task_id, user_id, match_score, match_breakdown)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (task_id, user_id) DO UPDATE SET
          match_score = EXCLUDED.match_score,
          match_breakdown = EXCLUDED.match_breakdown,
          created_at = CURRENT_TIMESTAMP
      `, [taskId, match.userId, match.score, JSON.stringify(match.breakdown)]);
    }

    res.json({
      taskId,
      matches,
      count: matches.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get task matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get matches for a specific user
app.get('/api/matches/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const matches = await matchingEngine.findTasksForUser(userId, parseInt(limit));

    // Store matches in database
    for (const match of matches) {
      await pool.query(`
        INSERT INTO matching_results (task_id, user_id, match_score, match_breakdown)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (task_id, user_id) DO UPDATE SET
          match_score = EXCLUDED.match_score,
          match_breakdown = EXCLUDED.match_breakdown,
          created_at = CURRENT_TIMESTAMP
      `, [match.taskId, userId, match.score, JSON.stringify(match.breakdown)]);
    }

    res.json({
      userId,
      matches,
      count: matches.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get user matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get personalized recommendations
app.get('/api/recommendations', async (req, res) => {
  try {
    const user = getUserFromHeaders(req);
    if (!user.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { type = 'tasks', limit = 10 } = req.query;

    let recommendations = [];
    
    if (type === 'tasks') {
      recommendations = await matchingEngine.findTasksForUser(user.userId, parseInt(limit));
    } else if (type === 'users') {
      // Find users to recommend for collaboration
      const userResult = await pool.query(`
        SELECT * FROM users WHERE id = $1 AND is_active = true
      `, [user.userId]);

      if (userResult.rows.length > 0) {
        const currentUser = userResult.rows[0];
        const oppositeType = currentUser.user_type === 'senior' ? 'youth' : 'senior';
        
        const usersResult = await pool.query(`
          SELECT 
            u.*,
            COUNT(tp.id) as completed_tasks,
            AVG(tp.rating) as average_rating
          FROM users u
          LEFT JOIN task_participants tp ON u.id = tp.participant_id
          WHERE u.user_type = $1 AND u.is_active = true AND u.id != $2
          GROUP BY u.id
          ORDER BY completed_tasks DESC, average_rating DESC
          LIMIT $3
        `, [oppositeType, user.userId, parseInt(limit)]);

        recommendations = usersResult.rows.map(u => ({
          userId: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          userType: u.user_type,
          location: u.location,
          skills: u.skills,
          interests: u.interests,
          completedTasks: parseInt(u.completed_tasks) || 0,
          averageRating: parseFloat(u.average_rating) || 0
        }));
      }
    }

    res.json({
      recommendations,
      type,
      count: recommendations.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update matching preferences
app.put('/api/preferences', async (req, res) => {
  try {
    const user = getUserFromHeaders(req);
    if (!user.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      preferredCategories,
      preferredSkills,
      locationPreference,
      availabilityPreference
    } = req.body;

    await pool.query(`
      INSERT INTO matching_preferences (user_id, preferred_categories, preferred_skills, location_preference, availability_preference)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO UPDATE SET
        preferred_categories = EXCLUDED.preferred_categories,
        preferred_skills = EXCLUDED.preferred_skills,
        location_preference = EXCLUDED.location_preference,
        availability_preference = EXCLUDED.availability_preference,
        updated_at = CURRENT_TIMESTAMP
    `, [user.userId, preferredCategories, preferredSkills, locationPreference, availabilityPreference]);

    res.json({ message: 'Preferences updated successfully' });

  } catch (error) {
    logger.error('Update preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record match action (accept/reject)
app.post('/api/matches/:matchId/action', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { action } = req.body; // 'accept', 'reject', 'view'

    if (!['accept', 'reject', 'view'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Get match details
    const matchResult = await pool.query(`
      SELECT * FROM matching_results WHERE id = $1
    `, [matchId]);

    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const match = matchResult.rows[0];

    // Update match status
    if (action === 'accept' || action === 'reject') {
      await pool.query(`
        UPDATE matching_results 
        SET status = $1
        WHERE id = $2
      `, [action === 'accept' ? 'accepted' : 'rejected', matchId]);
    }

    // Record analytics
    await pool.query(`
      INSERT INTO matching_analytics (match_type, user_id, task_id, match_score, action)
      VALUES ($1, $2, $3, $4, $5)
    `, ['task_match', match.user_id, match.task_id, match.match_score, action]);

    // Publish notification if accepted
    if (action === 'accept') {
      await publishMessage('matching-notifications', {
        type: 'match_accepted',
        matchId: matchId,
        userId: match.user_id,
        taskId: match.task_id,
        score: match.match_score
      });
    }

    res.json({ message: `Match ${action}ed successfully` });

  } catch (error) {
    logger.error('Record match action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get matching analytics
app.get('/api/analytics', async (req, res) => {
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

    // Get match statistics
    const statsResult = await pool.query(`
      SELECT 
        action,
        COUNT(*) as count,
        AVG(match_score) as avg_score
      FROM matching_analytics
      WHERE created_at >= NOW() - INTERVAL '${interval}'
      GROUP BY action
    `);

    // Get top performing matches
    const topMatchesResult = await pool.query(`
      SELECT 
        mr.task_id,
        mr.user_id,
        mr.match_score,
        t.title as task_title,
        u.first_name,
        u.last_name
      FROM matching_results mr
      JOIN tasks t ON mr.task_id = t.id
      JOIN users u ON mr.user_id = u.id
      WHERE mr.created_at >= NOW() - INTERVAL '${interval}'
        AND mr.status = 'accepted'
      ORDER BY mr.match_score DESC
      LIMIT 10
    `);

    res.json({
      period,
      statistics: statsResult.rows,
      topMatches: topMatchesResult.rows
    });

  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process matching queue
const processMatchingQueue = async () => {
  if (!channel) return;

  try {
    const { message } = await channel.get('matching-requests');
    if (message) {
      const request = JSON.parse(message.content.toString());
      
      if (request.type === 'task_matches') {
        const matches = await matchingEngine.findMatchesForTask(request.taskId);
        
        await publishMessage('matching-results', {
          type: 'task_matches',
          taskId: request.taskId,
          matches: matches
        });
      } else if (request.type === 'user_matches') {
        const matches = await matchingEngine.findTasksForUser(request.userId);
        
        await publishMessage('matching-results', {
          type: 'user_matches',
          userId: request.userId,
          matches: matches
        });
      }
      
      channel.ack(message);
    }
  } catch (error) {
    logger.error('Error processing matching queue:', error);
  }
};

// Scheduled matching job (runs every hour)
cron.schedule('0 * * * *', async () => {
  try {
    logger.info('Running scheduled matching job...');
    
    // Get all published tasks
    const tasksResult = await pool.query(`
      SELECT id FROM tasks 
      WHERE status = 'published' 
        AND created_at >= NOW() - INTERVAL '24 hours'
    `);

    for (const task of tasksResult.rows) {
      const matches = await matchingEngine.findMatchesForTask(task.id, 5);
      
      if (matches.length > 0) {
        await publishMessage('matching-notifications', {
          type: 'new_matches',
          taskId: task.id,
          matches: matches
        });
      }
    }

    logger.info(`Processed ${tasksResult.rows.length} tasks for matching`);
  } catch (error) {
    logger.error('Scheduled matching job error:', error);
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
    
    // Start queue processing
    setInterval(processMatchingQueue, 5000);
    
    app.listen(PORT, () => {
      logger.info(`Matching engine running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
