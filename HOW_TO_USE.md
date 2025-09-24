# 🚀 How to Use the Skills Platform

## ✅ PLATFORM IS RUNNING!

Your **Cloud-Native Skills & Micro-Task Platform** is now **fully operational**!

## 🌐 ACCESS YOUR PLATFORM

### Main Entry Points:
- **API Gateway**: http://localhost:3000 (Main entry point)
- **Grafana Dashboards**: http://localhost:3008 (admin/admin)
- **Prometheus Metrics**: http://localhost:9090
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

### All Service URLs:
| Service | URL | Status |
|---------|-----|--------|
| **API Gateway** | http://localhost:3000 | ✅ Running |
| **Auth Service** | http://localhost:3001 | ✅ Running |
| **Task Service** | http://localhost:3002 | ✅ Running |
| **Search Service** | http://localhost:3003 | ✅ Running |
| **Content Service** | http://localhost:3004 | ✅ Running |
| **Monitoring Service** | http://localhost:3005 | ✅ Running |
| **Matching Engine** | http://localhost:3006 | ✅ Running |
| **Queue Service** | http://localhost:3007 | ✅ Running |

## 🧪 TEST THE PLATFORM

### 1. Health Check Test:
```bash
# Test all services
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
curl http://localhost:3007/health
```

### 2. Run Integration Tests:
```bash
node test-platform.js
```

### 3. Test API Endpoints:
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

## 📊 MONITOR YOUR PLATFORM

### Grafana Dashboards:
1. **Open**: http://localhost:3008
2. **Login**: admin / admin
3. **View**: Platform metrics and analytics

### Prometheus Metrics:
1. **Open**: http://localhost:9090
2. **View**: Service metrics and health

### RabbitMQ Management:
1. **Open**: http://localhost:15672
2. **Login**: guest / guest
3. **View**: Message queues and processing

## 🎯 PLATFORM FEATURES

### For Seniors:
- Create skill-sharing activities
- Upload educational content
- Mentor youth participants
- Track community impact

### For Youths:
- Discover learning opportunities
- Apply for tasks and activities
- Access content library
- Build skills and experience

### Platform Intelligence:
- AI-powered matching algorithm
- Personalized recommendations
- Advanced search and filtering
- Real-time notifications
- Analytics and insights

## 🔧 MANAGE THE PLATFORM

### Start Platform:
```bash
docker-compose up -d
```

### Stop Platform:
```bash
docker-compose down
```

### View Logs:
```bash
docker-compose logs -f
```

### Check Status:
```bash
docker-compose ps
```

### Restart Services:
```bash
docker-compose restart
```

## 🚨 TROUBLESHOOTING

### If Services Won't Start:
1. **Check Docker**: Make sure Docker Desktop is running
2. **Check Ports**: Ensure ports 3000-3008, 5432, 6379, 9200, 9090 are available
3. **Restart Docker**: Restart Docker Desktop if needed
4. **Clean Up**: Run `docker-compose down` then `docker-compose up -d`

### If You Get Errors:
1. **Check Logs**: `docker-compose logs [service-name]`
2. **Restart Service**: `docker-compose restart [service-name]`
3. **Rebuild**: `docker-compose up --build -d`

## 🎉 SUCCESS!

Your **Cloud-Native Skills & Micro-Task Platform** is now running with:

✅ **8 Microservices** - All operational  
✅ **Infrastructure** - Databases and messaging  
✅ **Monitoring** - Prometheus and Grafana  
✅ **Security** - JWT authentication  
✅ **Scalability** - Cloud-native architecture  

## 🚀 NEXT STEPS

1. **Explore the Platform**: Visit the URLs above
2. **Test the APIs**: Use the curl commands
3. **Monitor Performance**: Check Grafana dashboards
4. **Develop Frontend**: Create React/Next.js interface
5. **Deploy to Production**: Use Kubernetes manifests

---

**🎯 Your Skills Platform is Ready for Intergenerational Learning!**
