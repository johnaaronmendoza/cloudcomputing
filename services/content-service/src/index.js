const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const sharp = require('sharp');
const { Pool } = require('pg');
const redis = require('redis');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const AWS = require('aws-sdk');
const mime = require('mime-types');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
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
    new winston.transports.File({ filename: 'logs/content-service.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 3004;

// AWS S3 configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.S3_REGION || 'us-east-1'
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

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mp3', 'audio/wav', 'audio/ogg',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

const generateFileName = (originalName, userId) => {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext);
  const timestamp = Date.now();
  return `${userId}/${timestamp}-${name}${ext}`;
};

const uploadToS3 = async (file, key, contentType) => {
  const params = {
    Bucket: process.env.S3_BUCKET || 'skills-platform-content',
    Key: key,
    Body: file,
    ContentType: contentType,
    ACL: 'public-read'
  };

  return await s3.upload(params).promise();
};

const deleteFromS3 = async (key) => {
  const params = {
    Bucket: process.env.S3_BUCKET || 'skills-platform-content',
    Key: key
  };

  return await s3.deleteObject(params).promise();
};

const processImage = async (buffer, fileName) => {
  try {
    // Generate thumbnail
    const thumbnail = await sharp(buffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Generate medium size
    const medium = await sharp(buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    return {
      original: buffer,
      thumbnail,
      medium
    };
  } catch (error) {
    logger.error('Image processing error:', error);
    throw error;
  }
};

const processVideo = async (buffer, fileName) => {
  return new Promise((resolve, reject) => {
    const tempPath = `/tmp/${uuidv4()}.mp4`;
    const thumbnailPath = `/tmp/${uuidv4()}.jpg`;

    // Write buffer to temporary file
    fs.writeFile(tempPath, buffer)
      .then(() => {
        ffmpeg(tempPath)
          .screenshots({
            timestamps: ['10%'],
            filename: path.basename(thumbnailPath),
            folder: path.dirname(thumbnailPath),
            size: '320x240'
          })
          .on('end', async () => {
            try {
              const thumbnail = await fs.readFile(thumbnailPath);
              
              // Clean up temporary files
              await fs.unlink(tempPath);
              await fs.unlink(thumbnailPath);
              
              resolve({
                original: buffer,
                thumbnail
              });
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject);
      })
      .catch(reject);
  });
};

// Database initialization
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        content_type VARCHAR(50) NOT NULL,
        file_type VARCHAR(50) NOT NULL,
        file_size BIGINT NOT NULL,
        file_url TEXT NOT NULL,
        thumbnail_url TEXT,
        medium_url TEXT,
        tags TEXT[],
        category VARCHAR(50),
        is_public BOOLEAN DEFAULT FALSE,
        download_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_collections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        content_ids UUID[],
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID REFERENCES content(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(content_id, user_id)
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
  res.json({ status: 'healthy', service: 'content-service', timestamp: new Date().toISOString() });
});

// Get all content with filtering and pagination
app.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      contentType,
      category,
      tags,
      userId,
      isPublic,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['1=1'];
    let queryParams = [];
    let paramCount = 0;

    if (contentType) {
      paramCount++;
      whereConditions.push(`content_type = $${paramCount}`);
      queryParams.push(contentType);
    }

    if (category) {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
      paramCount++;
      whereConditions.push(`tags && $${paramCount}`);
      queryParams.push(tagsArray);
    }

    if (userId) {
      paramCount++;
      whereConditions.push(`user_id = $${paramCount}`);
      queryParams.push(userId);
    }

    if (isPublic !== undefined) {
      paramCount++;
      whereConditions.push(`is_public = $${paramCount}`);
      queryParams.push(isPublic === 'true');
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM content WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get content
    const contentQuery = `
      SELECT c.*, u.first_name, u.last_name, u.user_type,
             COALESCE(AVG(cr.rating), 0) as average_rating,
             COUNT(cr.id) as rating_count
      FROM content c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN content_ratings cr ON c.id = cr.content_id
      WHERE ${whereClause}
      GROUP BY c.id, u.first_name, u.last_name, u.user_type
      ORDER BY c.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await pool.query(contentQuery, queryParams);

    const content = result.rows.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      contentType: item.content_type,
      fileType: item.file_type,
      fileSize: item.file_size,
      fileUrl: item.file_url,
      thumbnailUrl: item.thumbnail_url,
      mediumUrl: item.medium_url,
      tags: item.tags,
      category: item.category,
      isPublic: item.is_public,
      downloadCount: item.download_count,
      viewCount: item.view_count,
      creator: {
        id: item.user_id,
        firstName: item.first_name,
        lastName: item.last_name,
        userType: item.user_type
      },
      averageRating: parseFloat(item.average_rating),
      ratingCount: parseInt(item.rating_count),
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));

    res.json({
      content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get content by ID
app.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT c.*, u.first_name, u.last_name, u.user_type,
             COALESCE(AVG(cr.rating), 0) as average_rating,
             COUNT(cr.id) as rating_count
      FROM content c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN content_ratings cr ON c.id = cr.content_id
      WHERE c.id = $1
      GROUP BY c.id, u.first_name, u.last_name, u.user_type
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const item = result.rows[0];

    // Increment view count
    await pool.query('UPDATE content SET view_count = view_count + 1 WHERE id = $1', [id]);

    res.json({
      id: item.id,
      title: item.title,
      description: item.description,
      contentType: item.content_type,
      fileType: item.file_type,
      fileSize: item.file_size,
      fileUrl: item.file_url,
      thumbnailUrl: item.thumbnail_url,
      mediumUrl: item.medium_url,
      tags: item.tags,
      category: item.category,
      isPublic: item.is_public,
      downloadCount: item.download_count,
      viewCount: item.view_count + 1,
      creator: {
        id: item.user_id,
        firstName: item.first_name,
        lastName: item.last_name,
        userType: item.user_type
      },
      averageRating: parseFloat(item.average_rating),
      ratingCount: parseInt(item.rating_count),
      createdAt: item.created_at,
      updatedAt: item.updated_at
    });

  } catch (error) {
    logger.error('Get content by ID error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Upload content
app.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    const user = getUserFromHeaders(req);
    if (!user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    const { title, description, tags, category, isPublic = false } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const uploadedContent = [];

    for (const file of files) {
      const contentId = uuidv4();
      const fileName = generateFileName(file.originalname, user.userId);
      const contentType = file.mimetype;
      const fileType = mime.extension(contentType) || 'unknown';

      let fileUrl, thumbnailUrl, mediumUrl;

      try {
        // Upload original file
        const uploadResult = await uploadToS3(file.buffer, fileName, contentType);
        fileUrl = uploadResult.Location;

        // Process based on content type
        if (contentType.startsWith('image/')) {
          const processed = await processImage(file.buffer, fileName);
          
          // Upload thumbnail
          const thumbKey = `thumbnails/${fileName}`;
          const thumbResult = await uploadToS3(processed.thumbnail, thumbKey, 'image/jpeg');
          thumbnailUrl = thumbResult.Location;

          // Upload medium size
          const mediumKey = `medium/${fileName}`;
          const mediumResult = await uploadToS3(processed.medium, mediumKey, 'image/jpeg');
          mediumUrl = mediumResult.Location;
        } else if (contentType.startsWith('video/')) {
          const processed = await processVideo(file.buffer, fileName);
          
          // Upload thumbnail
          const thumbKey = `thumbnails/${path.basename(fileName, path.extname(fileName))}.jpg`;
          const thumbResult = await uploadToS3(processed.thumbnail, thumbKey, 'image/jpeg');
          thumbnailUrl = thumbResult.Location;
        }

        // Save to database
        const result = await pool.query(`
          INSERT INTO content (
            id, user_id, title, description, content_type, file_type, file_size,
            file_url, thumbnail_url, medium_url, tags, category, is_public
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `, [
          contentId, user.userId, title, description, contentType, fileType, file.buffer.length,
          fileUrl, thumbnailUrl, mediumUrl, tags ? tags.split(',') : [], category, isPublic
        ]);

        const content = result.rows[0];
        uploadedContent.push({
          id: content.id,
          title: content.title,
          description: content.description,
          contentType: content.content_type,
          fileType: content.file_type,
          fileSize: content.file_size,
          fileUrl: content.file_url,
          thumbnailUrl: content.thumbnail_url,
          mediumUrl: content.medium_url,
          tags: content.tags,
          category: content.category,
          isPublic: content.is_public,
          createdAt: content.created_at
        });

        logger.info(`Content uploaded: ${contentId} by user ${user.userId}`);

      } catch (error) {
        logger.error(`Error processing file ${file.originalname}:`, error);
        // Continue with other files
      }
    }

    res.status(201).json({
      message: 'Content uploaded successfully',
      content: uploadedContent
    });

  } catch (error) {
    logger.error('Upload content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update content
app.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = getUserFromHeaders(req);
    const { title, description, tags, category, isPublic } = req.body;

    // Check if user owns the content
    const contentResult = await pool.query('SELECT user_id FROM content WHERE id = $1', [id]);
    if (contentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    if (contentResult.rows[0].user_id !== user.userId) {
      return res.status(403).json({ message: 'Only content owner can update this content' });
    }

    const result = await pool.query(`
      UPDATE content 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          tags = COALESCE($3, tags),
          category = COALESCE($4, category),
          is_public = COALESCE($5, is_public),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [title, description, tags ? tags.split(',') : null, category, isPublic, id]);

    const content = result.rows[0];

    logger.info(`Content updated: ${id}`);

    res.json({
      id: content.id,
      title: content.title,
      description: content.description,
      tags: content.tags,
      category: content.category,
      isPublic: content.is_public,
      updatedAt: content.updated_at
    });

  } catch (error) {
    logger.error('Update content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete content
app.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = getUserFromHeaders(req);

    // Check if user owns the content
    const contentResult = await pool.query('SELECT user_id, file_url, thumbnail_url, medium_url FROM content WHERE id = $1', [id]);
    if (contentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    if (contentResult.rows[0].user_id !== user.userId) {
      return res.status(403).json({ message: 'Only content owner can delete this content' });
    }

    const content = contentResult.rows[0];

    // Delete files from S3
    try {
      if (content.file_url) {
        const fileKey = content.file_url.split('/').slice(-2).join('/');
        await deleteFromS3(fileKey);
      }
      if (content.thumbnail_url) {
        const thumbKey = content.thumbnail_url.split('/').slice(-2).join('/');
        await deleteFromS3(thumbKey);
      }
      if (content.medium_url) {
        const mediumKey = content.medium_url.split('/').slice(-2).join('/');
        await deleteFromS3(mediumKey);
      }
    } catch (error) {
      logger.error('Error deleting files from S3:', error);
    }

    // Delete from database
    await pool.query('DELETE FROM content WHERE id = $1', [id]);

    logger.info(`Content deleted: ${id}`);

    res.json({ message: 'Content deleted successfully' });

  } catch (error) {
    logger.error('Delete content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Rate content
app.post('/:id/rate', async (req, res) => {
  try {
    const { id } = req.params;
    const user = getUserFromHeaders(req);
    const { rating, review } = req.body;

    if (!user.userId) {
      return res.status(401).json({ message: 'User authentication required' });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Check if content exists
    const contentResult = await pool.query('SELECT id FROM content WHERE id = $1', [id]);
    if (contentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    await pool.query(`
      INSERT INTO content_ratings (content_id, user_id, rating, review)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (content_id, user_id) DO UPDATE SET
        rating = EXCLUDED.rating,
        review = EXCLUDED.review,
        updated_at = CURRENT_TIMESTAMP
    `, [id, user.userId, rating, review]);

    logger.info(`Content rated: ${id} by user ${user.userId}`);

    res.json({ message: 'Content rated successfully' });

  } catch (error) {
    logger.error('Rate content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Download content
app.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT file_url, title, file_type FROM content WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const content = result.rows[0];

    // Increment download count
    await pool.query('UPDATE content SET download_count = download_count + 1 WHERE id = $1', [id]);

    // Redirect to S3 URL
    res.redirect(content.file_url);

  } catch (error) {
    logger.error('Download content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get public content (no auth required)
app.get('/public', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      contentType,
      category,
      tags,
      search
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = ['is_public = true'];
    let queryParams = [];
    let paramCount = 0;

    if (contentType) {
      paramCount++;
      whereConditions.push(`content_type = $${paramCount}`);
      queryParams.push(contentType);
    }

    if (category) {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(',');
      paramCount++;
      whereConditions.push(`tags && $${paramCount}`);
      queryParams.push(tagsArray);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(title ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM content WHERE ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get content
    const contentQuery = `
      SELECT c.*, u.first_name, u.last_name, u.user_type,
             COALESCE(AVG(cr.rating), 0) as average_rating,
             COUNT(cr.id) as rating_count
      FROM content c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN content_ratings cr ON c.id = cr.content_id
      WHERE ${whereClause}
      GROUP BY c.id, u.first_name, u.last_name, u.user_type
      ORDER BY c.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(parseInt(limit), offset);
    const result = await pool.query(contentQuery, queryParams);

    const content = result.rows.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      contentType: item.content_type,
      fileType: item.file_type,
      fileSize: item.file_size,
      fileUrl: item.file_url,
      thumbnailUrl: item.thumbnail_url,
      mediumUrl: item.medium_url,
      tags: item.tags,
      category: item.category,
      downloadCount: item.download_count,
      viewCount: item.view_count,
      creator: {
        id: item.user_id,
        firstName: item.first_name,
        lastName: item.last_name,
        userType: item.user_type
      },
      averageRating: parseFloat(item.average_rating),
      ratingCount: parseInt(item.rating_count),
      createdAt: item.created_at
    }));

    res.json({
      content,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get public content error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files' });
    }
  }
  
  logger.error('Unhandled error:', error);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Content service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
