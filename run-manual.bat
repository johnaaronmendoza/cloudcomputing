@echo off
echo 🚀 Starting Skills Platform - Manual Mode
echo ========================================
echo.

echo 📋 Prerequisites Check:
echo - Node.js 18+ required
echo - PostgreSQL running on localhost:5432
echo - Redis running on localhost:6379
echo - Elasticsearch running on localhost:9200
echo.

echo ⚠️  Docker Desktop has API version issues
echo 💡 Alternative: Run services manually
echo.

echo 🔧 Setting up environment variables...
set NODE_ENV=development
set DATABASE_URL=postgresql://postgres:password@localhost:5432/skills_platform
set REDIS_URL=redis://localhost:6379
set RABBITMQ_URL=amqp://localhost:5672
set JWT_SECRET=your-super-secret-jwt-key-change-in-production
set ELASTICSEARCH_URL=http://localhost:9200

echo.
echo 📦 Installing dependencies for all services...
echo.

echo 🔐 Installing Auth Service dependencies...
cd services\auth-service
if not exist node_modules (
    npm install
)
cd ..\..

echo 🌐 Installing API Gateway dependencies...
cd services\api-gateway
if not exist node_modules (
    npm install
)
cd ..\..

echo 📋 Installing Task Service dependencies...
cd services\task-service
if not exist node_modules (
    npm install
)
cd ..\..

echo 🔍 Installing Search Service dependencies...
cd services\search-service
if not exist node_modules (
    npm install
)
cd ..\..

echo 📁 Installing Content Service dependencies...
cd services\content-service
if not exist node_modules (
    npm install
)
cd ..\..

echo 📊 Installing Monitoring Service dependencies...
cd services\monitoring-service
if not exist node_modules (
    npm install
)
cd ..\..

echo 🎯 Installing Matching Engine dependencies...
cd services\matching-engine
if not exist node_modules (
    npm install
)
cd ..\..

echo 📋 Installing Queue Service dependencies...
cd services\queue-service
if not exist node_modules (
    npm install
)
cd ..\..

echo.
echo ✅ Dependencies installed!
echo.
echo 🚀 Starting services in separate windows...
echo.

echo Starting Auth Service (Port 3001)...
start "Auth Service" cmd /k "cd services\auth-service && npm start"

timeout /t 2 /nobreak >nul

echo Starting Task Service (Port 3002)...
start "Task Service" cmd /k "cd services\task-service && npm start"

timeout /t 2 /nobreak >nul

echo Starting Search Service (Port 3003)...
start "Search Service" cmd /k "cd services\search-service && npm start"

timeout /t 2 /nobreak >nul

echo Starting Content Service (Port 3004)...
start "Content Service" cmd /k "cd services\content-service && npm start"

timeout /t 2 /nobreak >nul

echo Starting Monitoring Service (Port 3005)...
start "Monitoring Service" cmd /k "cd services\monitoring-service && npm start"

timeout /t 2 /nobreak >nul

echo Starting Matching Engine (Port 3006)...
start "Matching Engine" cmd /k "cd services\matching-engine && npm start"

timeout /t 2 /nobreak >nul

echo Starting Queue Service (Port 3007)...
start "Queue Service" cmd /k "cd services\queue-service && npm start"

timeout /t 2 /nobreak >nul

echo Starting API Gateway (Port 3000)...
start "API Gateway" cmd /k "cd services\api-gateway && npm start"

echo.
echo 🎉 All services starting!
echo.
echo 📋 Service URLs:
echo =================
echo API Gateway:     http://localhost:3000
echo Auth Service:    http://localhost:3001
echo Task Service:    http://localhost:3002
echo Search Service:  http://localhost:3003
echo Content Service: http://localhost:3004
echo Monitoring:      http://localhost:3005
echo Matching Engine: http://localhost:3006
echo Queue Service:   http://localhost:3007
echo.
echo 🧪 Run tests: node test-platform.js
echo.
echo Press any key to continue...
pause >nul
