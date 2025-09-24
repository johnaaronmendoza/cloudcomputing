#!/bin/bash

# Skills Platform Kubernetes Deployment Script
# This script deploys the entire skills platform to Kubernetes

set -e

echo "🚀 Starting Skills Platform Deployment..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed or not in PATH"
    exit 1
fi

# Check if we're connected to a cluster
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Not connected to a Kubernetes cluster"
    exit 1
fi

echo "✅ Connected to Kubernetes cluster"

# Create namespace
echo "📦 Creating namespace..."
kubectl apply -f namespace.yaml

# Apply secrets
echo "🔐 Applying secrets..."
kubectl apply -f secrets.yaml

# Apply configmap
echo "⚙️ Applying configuration..."
kubectl apply -f configmap.yaml

# Deploy infrastructure services
echo "🏗️ Deploying infrastructure services..."

echo "  📊 Deploying PostgreSQL..."
kubectl apply -f postgres.yaml

echo "  🔴 Deploying Redis..."
kubectl apply -f redis.yaml

echo "  🔍 Deploying Elasticsearch..."
kubectl apply -f elasticsearch.yaml

echo "  🐰 Deploying RabbitMQ..."
kubectl apply -f rabbitmq.yaml

# Wait for infrastructure to be ready
echo "⏳ Waiting for infrastructure services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/redis -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/elasticsearch -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/rabbitmq -n skills-platform

# Deploy application services
echo "🚀 Deploying application services..."

echo "  🔐 Deploying Auth Service..."
kubectl apply -f auth-service.yaml

echo "  📋 Deploying Task Service..."
kubectl apply -f task-service.yaml

echo "  🔍 Deploying Search Service..."
kubectl apply -f search-service.yaml

echo "  📁 Deploying Content Service..."
kubectl apply -f content-service.yaml

echo "  📊 Deploying Monitoring Service..."
kubectl apply -f monitoring-service.yaml

echo "  🌐 Deploying API Gateway..."
kubectl apply -f api-gateway.yaml

# Wait for application services to be ready
echo "⏳ Waiting for application services to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/auth-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/task-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/search-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/content-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/monitoring-service -n skills-platform
kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n skills-platform

# Get service URLs
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Service URLs:"
echo "=================="

# Get API Gateway URL
API_GATEWAY_IP=$(kubectl get service api-gateway-service -n skills-platform -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$API_GATEWAY_IP" ]; then
    API_GATEWAY_IP=$(kubectl get service api-gateway-service -n skills-platform -o jsonpath='{.spec.clusterIP}')
    echo "🌐 API Gateway: http://$API_GATEWAY_IP:3000"
    echo "   (Use 'kubectl port-forward service/api-gateway-service 3000:3000 -n skills-platform' to access locally)"
else
    echo "🌐 API Gateway: http://$API_GATEWAY_IP:3000"
fi

# Get Prometheus URL
PROMETHEUS_IP=$(kubectl get service prometheus-service -n skills-platform -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$PROMETHEUS_IP" ]; then
    PROMETHEUS_IP=$(kubectl get service prometheus-service -n skills-platform -o jsonpath='{.spec.clusterIP}')
    echo "📊 Prometheus: http://$PROMETHEUS_IP:9090"
    echo "   (Use 'kubectl port-forward service/prometheus-service 9090:9090 -n skills-platform' to access locally)"
else
    echo "📊 Prometheus: http://$PROMETHEUS_IP:9090"
fi

# Get Grafana URL
GRAFANA_IP=$(kubectl get service grafana-service -n skills-platform -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
if [ -z "$GRAFANA_IP" ]; then
    GRAFANA_IP=$(kubectl get service grafana-service -n skills-platform -o jsonpath='{.spec.clusterIP}')
    echo "📈 Grafana: http://$GRAFANA_IP:3000"
    echo "   (Use 'kubectl port-forward service/grafana-service 3000:3000 -n skills-platform' to access locally)"
    echo "   Default credentials: admin/admin"
else
    echo "📈 Grafana: http://$GRAFANA_IP:3000"
    echo "   Default credentials: admin/admin"
fi

echo ""
echo "🔧 Management Commands:"
echo "======================="
echo "View all pods: kubectl get pods -n skills-platform"
echo "View all services: kubectl get services -n skills-platform"
echo "View logs: kubectl logs -f deployment/<service-name> -n skills-platform"
echo "Scale service: kubectl scale deployment <service-name> --replicas=<count> -n skills-platform"
echo "Delete deployment: kubectl delete namespace skills-platform"

echo ""
echo "✅ Skills Platform is now running!"
echo "🎯 Visit the API Gateway URL to start using the platform"
