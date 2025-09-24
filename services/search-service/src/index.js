const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const redis = require('redis');
const { Client } = require('@elastic/elasticsearch');
const { body, validationResult, query } = require('express-validator');
const winston = require('winston');
const natural = require('natural');
const nlp = require('compromise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3003;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'search-service.log' })
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

// Elasticsearch client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ES_USERNAME || '',
    password: process.env.ES_PASSWORD || ''
  }
});

// Initialize Elasticsearch indices
const initializeElasticsearch = async () => {
  try {
    // Check if indices exist
    const tasksExists = await esClient.indices.exists({ index: 'tasks' });
    const usersExists = await esClient.indices.exists({ index: 'users' });

    // Create tasks index
    if (!tasksExists) {
      await esClient.indices.create({
        index: 'tasks',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              title: { 
                type: 'text',
                analyzer: 'english',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              description: { 
                type: 'text',
                analyzer: 'english'
              },
              category: { 
                type: 'keyword',
                fields: {
                  text: { type: 'text', analyzer: 'english' }
                }
              },
              subcategory: { 
                type: 'keyword',
                fields: {
                  text: { type: 'text', analyzer: 'english' }
                }
              },
              skills_required: { 
                type: 'keyword',
                fields: {
                  text: { type: 'text', analyzer: 'english' }
                }
              },
              location: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              is_virtual: { type: 'boolean' },
              status: { type: 'keyword' },
              priority: { type: 'keyword' },
              created_by: { type: 'keyword' },
              start_date: { type: 'date' },
              end_date: { type: 'date' },
              deadline: { type: 'date' },
              tags: { 
                type: 'keyword',
                fields: {
                  text: { type: 'text', analyzer: 'english' }
                }
              },
              max_participants: { type: 'integer' },
              current_participants: { type: 'integer' },
              estimated_duration_hours: { type: 'float' },
              created_at: { type: 'date' },
              updated_at: { type: 'date' },
              // Geo location for proximity search
              location_geo: { type: 'geo_point' },
              // Searchable text for full-text search
              searchable_text: { 
                type: 'text',
                analyzer: 'english'
              }
            }
          },
          settings: {
            analysis: {
              analyzer: {
                english: {
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'snowball']
                }
              }
            }
          }
        }
      });
      logger.info('Created tasks index');
    }

    // Create users index
    if (!usersExists) {
      await esClient.indices.create({
        index: 'users',
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              first_name: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              last_name: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              email: { type: 'keyword' },
              user_type: { type: 'keyword' },
              location: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              interests: { 
                type: 'keyword',
                fields: {
                  text: { type: 'text', analyzer: 'english' }
                }
              },
              skills: { 
                type: 'keyword',
                fields: {
                  text: { type: 'text', analyzer: 'english' }
                }
              },
              is_active: { type: 'boolean' },
              created_at: { type: 'date' },
              // Geo location for proximity search
              location_geo: { type: 'geo_point' },
              // Searchable text for full-text search
              searchable_text: { 
                type: 'text',
                analyzer: 'english'
              }
            }
          }
        }
      });
      logger.info('Created users index');
    }

    logger.info('Elasticsearch initialized successfully');
  } catch (error) {
    logger.error('Elasticsearch initialization failed:', error);
    throw error;
  }
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/search', limiter);

// Optional authentication middleware
const optionalAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userType = req.headers['x-user-type'];
  const userRole = req.headers['x-user-role'];

  if (userId) {
    req.user = { id: userId, type: userType, role: userRole };
  } else {
    req.user = null;
  }
  next();
};

// Text processing utilities
const processText = (text) => {
  if (!text) return '';
  
  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  // Extract keywords using natural language processing
  const doc = nlp(cleanText);
  const keywords = doc.nouns().out('array');
  
  // Stem words
  const stemmer = natural.PorterStemmer;
  const stemmedKeywords = keywords.map(word => stemmer.stem(word.toLowerCase()));
  
  return stemmedKeywords.join(' ');
};

// Geo location utilities
const parseLocation = (location) => {
  if (!location) return null;
  
  // Simple parsing - in production, use a proper geocoding service
  const coords = location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (coords) {
    return {
      lat: parseFloat(coords[1]),
      lon: parseFloat(coords[2])
    };
  }
  
  return null;
};

// Index a task in Elasticsearch
const indexTask = async (task) => {
  try {
    const geoLocation = parseLocation(task.location);
    const searchableText = [
      task.title,
      task.description,
      task.category,
      task.subcategory,
      task.skills_required?.join(' '),
      task.tags?.join(' '),
      task.location
    ].filter(Boolean).join(' ');

    const doc = {
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      subcategory: task.subcategory,
      skills_required: task.skills_required || [],
      location: task.location,
      is_virtual: task.is_virtual || false,
      status: task.status,
      priority: task.priority,
      created_by: task.created_by,
      start_date: task.start_date,
      end_date: task.end_date,
      deadline: task.deadline,
      tags: task.tags || [],
      max_participants: task.max_participants,
      current_participants: task.current_participants,
      estimated_duration_hours: task.estimated_duration_hours,
      created_at: task.created_at,
      updated_at: task.updated_at,
      location_geo: geoLocation,
      searchable_text: processText(searchableText)
    };

    await esClient.index({
      index: 'tasks',
      id: task.id,
      body: doc
    });

    logger.info(`Indexed task: ${task.id}`);
  } catch (error) {
    logger.error('Failed to index task:', error);
  }
};

// Index a user in Elasticsearch
const indexUser = async (user) => {
  try {
    const geoLocation = parseLocation(user.location);
    const searchableText = [
      user.first_name,
      user.last_name,
      user.interests?.join(' '),
      user.skills?.join(' '),
      user.location
    ].filter(Boolean).join(' ');

    const doc = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      user_type: user.user_type,
      location: user.location,
      interests: user.interests || [],
      skills: user.skills || [],
      is_active: user.is_active,
      created_at: user.created_at,
      location_geo: geoLocation,
      searchable_text: processText(searchableText)
    };

    await esClient.index({
      index: 'users',
      id: user.id,
      body: doc
    });

    logger.info(`Indexed user: ${user.id}`);
  } catch (error) {
    logger.error('Failed to index user:', error);
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'search-service', 
    timestamp: new Date().toISOString() 
  });
});

// Search tasks
app.get('/api/search/tasks', optionalAuth, [
  query('q').optional().isString(),
  query('category').optional().isString(),
  query('location').optional().isString(),
  query('skills').optional().isString(),
  query('is_virtual').optional().isBoolean(),
  query('status').optional().isString(),
  query('priority').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['relevance', 'date', 'distance', 'priority']),
  query('lat').optional().isFloat(),
  query('lon').optional().isFloat(),
  query('radius').optional().isFloat({ min: 0, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      q,
      category,
      location,
      skills,
      is_virtual,
      status = 'published',
      priority,
      page = 1,
      limit = 20,
      sort = 'relevance',
      lat,
      lon,
      radius = 50
    } = req.query;

    const from = (page - 1) * limit;

    // Build Elasticsearch query
    const mustQueries = [];
    const shouldQueries = [];
    const filterQueries = [];

    // Status filter
    filterQueries.push({ term: { status } });

    // Text search
    if (q) {
      mustQueries.push({
        multi_match: {
          query: q,
          fields: ['title^3', 'description^2', 'searchable_text', 'skills_required', 'tags'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // Category filter
    if (category) {
      filterQueries.push({ term: { category } });
    }

    // Skills filter
    if (skills) {
      const skillList = skills.split(',').map(s => s.trim());
      filterQueries.push({ terms: { 'skills_required.keyword': skillList } });
    }

    // Virtual filter
    if (is_virtual !== undefined) {
      filterQueries.push({ term: { is_virtual } });
    }

    // Priority filter
    if (priority) {
      filterQueries.push({ term: { priority } });
    }

    // Location search
    if (lat && lon) {
      filterQueries.push({
        geo_distance: {
          distance: `${radius}km`,
          location_geo: {
            lat: parseFloat(lat),
            lon: parseFloat(lon)
          }
        }
      });
    } else if (location) {
      shouldQueries.push({
        match: {
          location: {
            query: location,
            fuzziness: 'AUTO'
          }
        }
      });
    }

    // Build sort
    let sortClause = [];
    switch (sort) {
      case 'date':
        sortClause = [{ created_at: { order: 'desc' } }];
        break;
      case 'distance':
        if (lat && lon) {
          sortClause = [
            {
              _geo_distance: {
                location_geo: {
                  lat: parseFloat(lat),
                  lon: parseFloat(lon)
                },
                order: 'asc',
                unit: 'km'
              }
            }
          ];
        } else {
          sortClause = [{ created_at: { order: 'desc' } }];
        }
        break;
      case 'priority':
        sortClause = [
          { priority: { order: 'desc' } },
          { created_at: { order: 'desc' } }
        ];
        break;
      default: // relevance
        sortClause = [{ _score: { order: 'desc' } }];
    }

    const esQuery = {
      index: 'tasks',
      body: {
        query: {
          bool: {
            must: mustQueries,
            should: shouldQueries,
            filter: filterQueries,
            minimum_should_match: shouldQueries.length > 0 ? 1 : 0
          }
        },
        sort: sortClause,
        from,
        size: limit,
        _source: {
          excludes: ['searchable_text']
        }
      }
    };

    const response = await esClient.search(esQuery);

    // Get additional data from database
    const taskIds = response.body.hits.hits.map(hit => hit._id);
    let tasks = [];

    if (taskIds.length > 0) {
      const dbResult = await pool.query(`
        SELECT 
          t.*,
          u.first_name as creator_first_name,
          u.last_name as creator_last_name,
          u.user_type as creator_type
        FROM tasks t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ANY($1)
      `, [taskIds]);

      // Merge ES results with DB data
      const dbTasks = dbResult.rows.reduce((acc, task) => {
        acc[task.id] = task;
        return acc;
      }, {});

      tasks = response.body.hits.hits.map(hit => ({
        ...dbTasks[hit._id],
        _score: hit._score,
        _distance: hit.sort?.[0] // For distance-based sorting
      }));
    }

    // Cache results
    const cacheKey = `search:tasks:${JSON.stringify(req.query)}`;
    await redisClient.setEx(cacheKey, 300, JSON.stringify({
      tasks,
      total: response.body.hits.total.value,
      page: parseInt(page),
      limit: parseInt(limit)
    }));

    res.json({
      tasks,
      total: response.body.hits.total.value,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(response.body.hits.total.value / limit)
    });
  } catch (error) {
    logger.error('Search tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search users
app.get('/api/search/users', optionalAuth, [
  query('q').optional().isString(),
  query('user_type').optional().isIn(['senior', 'youth']),
  query('location').optional().isString(),
  query('skills').optional().isString(),
  query('interests').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('lat').optional().isFloat(),
  query('lon').optional().isFloat(),
  query('radius').optional().isFloat({ min: 0, max: 1000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      q,
      user_type,
      location,
      skills,
      interests,
      page = 1,
      limit = 20,
      lat,
      lon,
      radius = 50
    } = req.query;

    const from = (page - 1) * limit;

    // Build Elasticsearch query
    const mustQueries = [];
    const shouldQueries = [];
    const filterQueries = [];

    // Active users only
    filterQueries.push({ term: { is_active: true } });

    // Text search
    if (q) {
      mustQueries.push({
        multi_match: {
          query: q,
          fields: ['first_name^2', 'last_name^2', 'searchable_text', 'skills', 'interests'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    // User type filter
    if (user_type) {
      filterQueries.push({ term: { user_type } });
    }

    // Skills filter
    if (skills) {
      const skillList = skills.split(',').map(s => s.trim());
      filterQueries.push({ terms: { 'skills.keyword': skillList } });
    }

    // Interests filter
    if (interests) {
      const interestList = interests.split(',').map(s => s.trim());
      filterQueries.push({ terms: { 'interests.keyword': interestList } });
    }

    // Location search
    if (lat && lon) {
      filterQueries.push({
        geo_distance: {
          distance: `${radius}km`,
          location_geo: {
            lat: parseFloat(lat),
            lon: parseFloat(lon)
          }
        }
      });
    } else if (location) {
      shouldQueries.push({
        match: {
          location: {
            query: location,
            fuzziness: 'AUTO'
          }
        }
      });
    }

    const esQuery = {
      index: 'users',
      body: {
        query: {
          bool: {
            must: mustQueries,
            should: shouldQueries,
            filter: filterQueries,
            minimum_should_match: shouldQueries.length > 0 ? 1 : 0
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { created_at: { order: 'desc' } }
        ],
        from,
        size: limit,
        _source: {
          excludes: ['searchable_text', 'email']
        }
      }
    };

    const response = await esClient.search(esQuery);

    // Get additional data from database
    const userIds = response.body.hits.hits.map(hit => hit._id);
    let users = [];

    if (userIds.length > 0) {
      const dbResult = await pool.query(`
        SELECT 
          id, first_name, last_name, user_type, location, 
          interests, skills, profile_image_url, created_at
        FROM users
        WHERE id = ANY($1) AND is_active = true
      `, [userIds]);

      // Merge ES results with DB data
      const dbUsers = dbResult.rows.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});

      users = response.body.hits.hits.map(hit => ({
        ...dbUsers[hit._id],
        _score: hit._score
      }));
    }

    res.json({
      users,
      total: response.body.hits.total.value,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(response.body.hits.total.value / limit)
    });
  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recommendations for user
app.get('/api/search/recommendations', optionalAuth, [
  query('type').isIn(['tasks', 'users']),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, limit = 10 } = req.query;

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required for recommendations' });
    }

    // Get user profile
    const userResult = await pool.query(`
      SELECT interests, skills, location, user_type
      FROM users
      WHERE id = $1
    `, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (type === 'tasks') {
      // Recommend tasks based on user interests and skills
      const shouldQueries = [];

      if (user.interests && user.interests.length > 0) {
        shouldQueries.push({
          terms: {
            'skills_required.keyword': user.interests,
            boost: 2
          }
        });
      }

      if (user.skills && user.skills.length > 0) {
        shouldQueries.push({
          terms: {
            'skills_required.keyword': user.skills,
            boost: 3
          }
        });
      }

      // Prefer tasks by opposite user type (seniors prefer youth tasks, youth prefer senior tasks)
      const oppositeType = user.user_type === 'senior' ? 'youth' : 'senior';
      shouldQueries.push({
        term: {
          'creator_type': oppositeType,
          boost: 1.5
        }
      });

      const esQuery = {
        index: 'tasks',
        body: {
          query: {
            bool: {
              must: [
                { term: { status: 'published' } }
              ],
              should: shouldQueries,
              must_not: [
                { term: { created_by: req.user.id } }
              ]
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } }
          ],
          size: limit
        }
      };

      const response = await esClient.search(esQuery);
      const taskIds = response.body.hits.hits.map(hit => hit._id);

      let tasks = [];
      if (taskIds.length > 0) {
        const dbResult = await pool.query(`
          SELECT 
            t.*,
            u.first_name as creator_first_name,
            u.last_name as creator_last_name,
            u.user_type as creator_type
          FROM tasks t
          LEFT JOIN users u ON t.created_by = u.id
          WHERE t.id = ANY($1)
        `, [taskIds]);

        tasks = dbResult.rows;
      }

      res.json({
        recommendations: tasks,
        type: 'tasks',
        count: tasks.length
      });
    } else {
      // Recommend users based on complementary skills/interests
      const shouldQueries = [];

      if (user.interests && user.interests.length > 0) {
        shouldQueries.push({
          terms: {
            'skills.keyword': user.interests,
            boost: 2
          }
        });
      }

      if (user.skills && user.skills.length > 0) {
        shouldQueries.push({
          terms: {
            'interests.keyword': user.skills,
            boost: 3
          }
        });
      }

      // Prefer opposite user type
      const oppositeType = user.user_type === 'senior' ? 'youth' : 'senior';
      shouldQueries.push({
        term: {
          'user_type': oppositeType,
          boost: 1.5
        }
      });

      const esQuery = {
        index: 'users',
        body: {
          query: {
            bool: {
              must: [
                { term: { is_active: true } }
              ],
              should: shouldQueries,
              must_not: [
                { term: { id: req.user.id } }
              ]
            }
          },
          sort: [
            { _score: { order: 'desc' } },
            { created_at: { order: 'desc' } }
          ],
          size: limit
        }
      };

      const response = await esClient.search(esQuery);
      const userIds = response.body.hits.hits.map(hit => hit._id);

      let users = [];
      if (userIds.length > 0) {
        const dbResult = await pool.query(`
          SELECT 
            id, first_name, last_name, user_type, location, 
            interests, skills, profile_image_url, created_at
          FROM users
          WHERE id = ANY($1) AND is_active = true
        `, [userIds]);

        users = dbResult.rows;
      }

      res.json({
        recommendations: users,
        type: 'users',
        count: users.length
      });
    }
  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Index task (called by task service)
app.post('/api/search/index/task', [
  body('task').isObject()
], async (req, res) => {
  try {
    const { task } = req.body;
    await indexTask(task);
    res.json({ message: 'Task indexed successfully' });
  } catch (error) {
    logger.error('Index task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Index user (called by auth service)
app.post('/api/search/index/user', [
  body('user').isObject()
], async (req, res) => {
  try {
    const { user } = req.body;
    await indexUser(user);
    res.json({ message: 'User indexed successfully' });
  } catch (error) {
    logger.error('Index user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete from index
app.delete('/api/search/index/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!['tasks', 'users'].includes(type)) {
      return res.status(400).json({ error: 'Invalid index type' });
    }

    await esClient.delete({
      index: type,
      id: id
    });

    res.json({ message: `${type} deleted from index successfully` });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      res.json({ message: 'Item not found in index' });
    } else {
      logger.error('Delete from index error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Get search suggestions
app.get('/api/search/suggestions', [
  query('q').isString(),
  query('type').optional().isIn(['tasks', 'users'])
], async (req, res) => {
  try {
    const { q, type = 'tasks' } = req.query;

    const esQuery = {
      index: type,
      body: {
        suggest: {
          text: q,
          title_suggest: {
            completion: {
              field: type === 'tasks' ? 'title' : 'first_name',
              size: 5
            }
          },
          category_suggest: {
            completion: {
              field: type === 'tasks' ? 'category' : 'user_type',
              size: 5
            }
          }
        }
      }
    };

    const response = await esClient.search(esQuery);
    const suggestions = response.body.suggest;

    res.json({
      suggestions: {
        titles: suggestions.title_suggest?.[0]?.options || [],
        categories: suggestions.category_suggest?.[0]?.options || []
      }
    });
  } catch (error) {
    logger.error('Get suggestions error:', error);
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

// Initialize Elasticsearch and start server
const startServer = async () => {
  try {
    await initializeElasticsearch();
    
    app.listen(PORT, () => {
      logger.info(`Search service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;