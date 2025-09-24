# Cloud-Native Skills & Micro-Task Platform

A comprehensive platform that enables intergenerational skills-sharing and micro-volunteering between seniors and youths, built with cloud-native architecture and microservices.

## 🎯 Purpose & Engagement

This platform facilitates:
- **Seniors** sharing skills (cooking, crafts, mentoring, storytelling, gardening)
- **Youths** learning valuable skills and gaining hands-on experiences
- **Micro-volunteering** opportunities with structured task management
- **Community building** through intergenerational connections

## 🏗️ Architecture

### Core Microservices
- **Authentication Service** - Secure identity management with JWT encryption
- **Task Management Service** - Business logic and task lifecycle management with concurrency control
- **Search & Recommendation Service** - Intelligent matching and filtering with Elasticsearch
- **Content Library Service** - Distributed storage for lessons and materials with AWS S3
- **API Gateway** - Centralized routing, load balancing, and request forwarding
- **Monitoring Service** - Real-time analytics and insights with Prometheus & Grafana

### Cloud-Enhanced Capabilities
- **Kubernetes Auto-scaling** - Handles demand surges automatically
- **Multi-region Deployment** - Low-latency access worldwide
- **Distributed Storage** - Durable content replication
- **Load Balancing** - Prevents bottlenecks and failures
- **Fault Tolerance** - Zero-downtime service recovery
- **Real-time Monitoring** - Community insights and performance tracking

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Kubernetes cluster (minikube, GKE, EKS, or AKS)
- Node.js 18+
- kubectl (for Kubernetes deployment)

### Development Setup with Docker Compose
```bash
# Clone the repository
git clone <repository-url>
cd skills-platform

# Start all services with Docker Compose
docker-compose up -d

# Check service status
docker-compose ps
```

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start

# Open browser to http://localhost:3001
```

### Production Deployment with Kubernetes
```bash
# Deploy to Kubernetes (Windows)
k8s\deploy.bat

# Or manually deploy
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/elasticsearch.yaml
kubectl apply -f k8s/rabbitmq.yaml
kubectl apply -f k8s/auth-service.yaml
kubectl apply -f k8s/task-service.yaml
kubectl apply -f k8s/search-service.yaml
kubectl apply -f k8s/content-service.yaml
kubectl apply -f k8s/monitoring-service.yaml
kubectl apply -f k8s/api-gateway.yaml
```

### Service Access
- **API Gateway**: http://localhost:3000 (Docker) or port-forward to 3000 (K8s)
- **Authentication**: http://localhost:3001
- **Task Management**: http://localhost:3002
- **Search & Recommendations**: http://localhost:3003
- **Content Library**: http://localhost:3004
- **Monitoring Dashboard**: http://localhost:3005
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

## 📊 Features

### For Seniors
- Create and manage skill-sharing activities
- Set availability and preferences
- Track volunteer engagement
- Share knowledge through multimedia content
- Upload and manage content with automatic processing

### For Youths
- Discover learning opportunities
- Apply for micro-volunteering tasks
- Connect with mentors
- Build skills portfolio
- Access personalized recommendations

### For Administrators
- Monitor platform engagement
- Manage user accounts and permissions
- Analyze community growth metrics
- Configure recommendation algorithms
- View real-time analytics dashboard

## 🔧 Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL, Redis
- **Search**: Elasticsearch
- **Message Queue**: RabbitMQ
- **File Storage**: AWS S3
- **Container**: Docker, Kubernetes
- **Monitoring**: Prometheus, Grafana
- **Authentication**: JWT with bcrypt
- **Image Processing**: Sharp, FFmpeg

## 📈 Monitoring & Analytics

- Real-time engagement metrics
- Volunteer response time tracking
- Community growth analytics
- Performance monitoring with Prometheus
- User behavior insights
- Service health monitoring
- Auto-scaling based on metrics

## 🛠️ Development

### Service Structure
```
services/
├── api-gateway/          # Central API gateway
├── auth-service/         # Authentication & user management
├── task-service/         # Task management & micro-volunteering
├── search-service/       # Search & recommendations
├── content-service/      # Content library & file management
└── monitoring-service/   # Analytics & monitoring
```

### Key Features Implemented
- ✅ JWT-based authentication with role-based access
- ✅ Task management with concurrency control
- ✅ Elasticsearch-powered search and recommendations
- ✅ AWS S3 content storage with image/video processing
- ✅ Real-time monitoring with Prometheus metrics
- ✅ Kubernetes deployment with auto-scaling
- ✅ API Gateway with load balancing
- ✅ Redis caching for performance
- ✅ RabbitMQ message queues for async processing

### API Endpoints

#### Authentication Service
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Token refresh
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

#### Task Management Service
- `GET /api/tasks` - List tasks with filtering
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `POST /api/tasks/:id/apply` - Apply for task
- `POST /api/tasks/:id/complete` - Complete task

#### Search Service
- `GET /api/search/tasks` - Search tasks
- `GET /api/search/users` - Search users
- `GET /api/search/recommendations` - Get recommendations
- `GET /api/search/suggestions` - Get search suggestions

#### Content Service
- `GET /api/content` - List content
- `POST /api/content/upload` - Upload content
- `GET /api/content/:id` - Get content details
- `PUT /api/content/:id` - Update content
- `DELETE /api/content/:id` - Delete content

## 🚀 Deployment

### Docker Compose (Development)
```bash
docker-compose up -d
```

### Kubernetes (Production)
```bash
# Windows
k8s\deploy.bat

# Linux/Mac
k8s\deploy.sh
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `ELASTICSEARCH_URL` - Elasticsearch URL
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT signing secret
- `AWS_ACCESS_KEY_ID` - AWS S3 access key
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret key
- `S3_BUCKET` - AWS S3 bucket name

## 📊 Monitoring

### Prometheus Metrics
- HTTP request metrics
- Service health status
- User activity metrics
- Task completion rates
- Content upload statistics
- Search query analytics

### Grafana Dashboards
- Platform overview
- User analytics
- Task analytics
- Content analytics
- Search analytics
- Real-time metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints
- Monitor service health via Grafana
