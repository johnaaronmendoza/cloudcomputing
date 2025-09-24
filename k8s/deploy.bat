@echo off
REM Skills Platform Kubernetes Deployment Script for Windows
REM This script deploys the entire skills platform to Kubernetes

echo 🚀 Starting Skills Platform Deployment...

REM Check if kubectl is available
kubectl version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ kubectl is not installed or not in PATH
    exit /b 1
)

REM Check if we're connected to a cluster
kubectl cluster-info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not connected to a Kubernetes cluster
    exit /b 1
)

echo ✅ Connected to Kubernetes cluster

REM Create namespace
echo 📦 Creating namespace...
kubectl apply -f namespace.yaml

REM Apply secrets
echo 🔐 Applying secrets...
kubectl apply -f secrets.yaml

REM Apply configmap
echo ⚙️ Applying configuration...
kubectl apply -f configmap.yaml

REM Deploy infrastructure services
echo 🏗️ Deploying infrastructure services...

echo   📊 Deploying PostgreSQL...
kubectl apply -f postgres.yaml

echo   🔴 Deploying Redis...
kubectl apply -f redis.yaml

echo   🔍 Deploying Elasticsearch...
kubectl apply -f elasticsearch.yaml

echo   🐰 Deploying RabbitMQ...
kubectl apply -f rabbitmq.yaml

REM Wait for infrastructure to be ready
echo ⏳ Waiting for infrastructure services to be ready...
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/redis -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/elasticsearch -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/rabbitmq -n skills-platform

REM Deploy application services
echo 🚀 Deploying application services...

echo   🔐 Deploying Auth Service...
kubectl apply -f auth-service.yaml

echo   📋 Deploying Task Service...
kubectl apply -f task-service.yaml

echo   🔍 Deploying Search Service...
kubectl apply -f search-service.yaml

echo   📁 Deploying Content Service...
kubectl apply -f content-service.yaml

echo   📊 Deploying Monitoring Service...
kubectl apply -f monitoring-service.yaml

echo   🎯 Deploying Matching Engine...
kubectl apply -f matching-engine.yaml

echo   📋 Deploying Queue Service...
kubectl apply -f queue-service.yaml

echo   🌐 Deploying API Gateway...
kubectl apply -f api-gateway.yaml

REM Wait for application services to be ready
echo ⏳ Waiting for application services to be ready...
kubectl wait --for=condition=available --timeout=300s deployment/auth-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/task-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/search-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/content-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/monitoring-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/matching-engine -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/queue-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n skills-platform

echo 🎉 Deployment completed successfully!
echo.
echo 📋 Service URLs:
echo ==================
echo 🌐 API Gateway: Use 'kubectl port-forward service/api-gateway-service 3000:3000 -n skills-platform'
echo 📊 Prometheus: Use 'kubectl port-forward service/prometheus-service 9090:9090 -n skills-platform'
echo 📈 Grafana: Use 'kubectl port-forward service/grafana-service 3000:3000 -n skills-platform'
echo    Default credentials: admin/admin
echo.
echo 🔧 Management Commands:
echo =======================
echo View all pods: kubectl get pods -n skills-platform
echo View all services: kubectl get services -n skills-platform
echo View logs: kubectl logs -f deployment/<service-name> -n skills-platform
echo Scale service: kubectl scale deployment <service-name> --replicas=<count> -n skills-platform
echo Delete deployment: kubectl delete namespace skills-platform
echo.
echo ✅ Skills Platform is now running!
echo 🎯 Use port-forward commands to access the services locally
