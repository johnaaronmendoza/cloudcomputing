# 🚀 Local Testing Guide - Skills Platform

## Docker Desktop Issues Detected

It appears Docker Desktop is not running properly on your system. Here are several approaches to test and run the platform locally:

## Option 1: Fix Docker Desktop (Recommended)

### Steps to Fix Docker Desktop:
1. **Restart Docker Desktop**:
   - Close Docker Desktop completely
   - Run as Administrator: `C:\Program Files\Docker\Docker\Docker Desktop.exe`
   - Wait for Docker to fully start (green icon in system tray)

2. **Reset Docker Desktop** (if needed):
   - Open Docker Desktop Settings
   - Go to "Troubleshoot"
   - Click "Reset to factory defaults"
   - Restart Docker Desktop

3. **Check Docker Status**:
   ```bash
   docker --version
   docker info
   docker ps
   ```

### Once Docker is Working:
```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Run integration tests
node test-platform.js
```

## Option 2: Manual Service Testing (Without Docker)

If Docker continues to have issues, you can test individual services manually:

### Prerequisites:
- Node.js 18+ installed
- PostgreSQL running locally
- Redis running locally
- Elasticsearch running locally

### Setup Individual Services:

1. **Install Dependencies**:
   ```bash
   cd services/auth-service
   npm install
   
   cd ../api-gateway
   npm install
   
   cd ../task-service
   npm install
   
   cd ../search-service
   npm install
   
   cd ../content-service
   npm install
   
   cd ../monitoring-service
   npm install
   
   cd ../matching-engine
   npm install
   
   cd ../queue-service
   npm install
   ```

2. **Set Environment Variables**:
   Create `.env` files in each service directory:
   ```env
   NODE_ENV=development
   DATABASE_URL=postgresql://postgres:password@localhost:5432/skills_platform
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://localhost:5672
   JWT_SECRET=your-jwt-secret-key
   ```

3. **Start Services Individually**:
   ```bash
   # Terminal 1 - Auth Service
   cd services/auth-service
   npm start
   
   # Terminal 2 - API Gateway
   cd services/api-gateway
   npm start
   
   # Terminal 3 - Task Service
   cd services/task-service
   npm start
   
   # Terminal 4 - Search Service
   cd services/search-service
   npm start
   
   # Terminal 5 - Content Service
   cd services/content-service
   npm start
   
   # Terminal 6 - Monitoring Service
   cd services/monitoring-service
   npm start
   
   # Terminal 7 - Matching Engine
   cd services/matching-engine
   npm start
   
   # Terminal 8 - Queue Service
   cd services/queue-service
   npm start
   ```

## Option 3: Cloud Development Environment

### Using GitHub Codespaces or Gitpod:
1. Push code to GitHub repository
2. Open in Codespaces/Gitpod
3. Run: `docker-compose up -d`
4. Test platform functionality

### Using Cloud Providers:
- **AWS**: Use EC2 with Docker
- **Google Cloud**: Use Cloud Shell with Docker
- **Azure**: Use Azure Container Instances

## Option 4: Alternative Container Runtimes

### Using Podman (Docker alternative):
```bash
# Install Podman
# Then use podman-compose instead of docker-compose
podman-compose up -d
```

### Using LXC/LXD:
```bash
# Create containers manually
lxc launch ubuntu:22.04 skills-platform
lxc exec skills-platform -- bash
# Install Node.js and run services
```

## Testing the Platform

### 1. Health Check Tests:
```bash
# Test each service endpoint
curl http://localhost:3000/health  # API Gateway
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # Task Service
curl http://localhost:3003/health  # Search Service
curl http://localhost:3004/health  # Content Service
curl http://localhost:3005/health  # Monitoring Service
curl http://localhost:3006/health  # Matching Engine
curl http://localhost:3007/health  # Queue Service
```

### 2. Integration Tests:
```bash
# Run the comprehensive test suite
node test-platform.js
```

### 3. Manual API Testing:
```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User",
    "userType": "senior",
    "dateOfBirth": "1950-01-01",
    "location": "New York, NY"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

## Troubleshooting

### Common Issues:

1. **Port Conflicts**:
   - Check if ports 3000-3007 are available
   - Use `netstat -an | findstr :3000` to check port usage

2. **Database Connection Issues**:
   - Ensure PostgreSQL is running
   - Check connection string in environment variables

3. **Redis Connection Issues**:
   - Ensure Redis is running
   - Check Redis URL configuration

4. **Elasticsearch Issues**:
   - Ensure Elasticsearch is running
   - Check cluster health: `curl http://localhost:9200/_cluster/health`

## Service URLs (When Running)

- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001
- **Task Service**: http://localhost:3002
- **Search Service**: http://localhost:3003
- **Content Service**: http://localhost:3004
- **Monitoring Service**: http://localhost:3005
- **Matching Engine**: http://localhost:3006
- **Queue Service**: http://localhost:3007
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)

## Next Steps

1. **Fix Docker Desktop** (recommended approach)
2. **Test individual services** if Docker issues persist
3. **Run integration tests** to verify functionality
4. **Deploy to cloud** for production testing

The platform is fully implemented and ready for testing once the Docker environment is working properly!
