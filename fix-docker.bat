@echo off
echo 🔧 Docker Desktop Fix Script
echo ============================
echo.

echo 🛑 Stopping Docker Desktop...
taskkill /f /im "Docker Desktop.exe" 2>nul
timeout /t 3 /nobreak >nul

echo 🧹 Cleaning Docker data...
docker system prune -f 2>nul
docker volume prune -f 2>nul

echo 🔄 Resetting Docker Desktop...
echo.
echo 📋 Manual steps required:
echo 1. Open Docker Desktop
echo 2. Go to Settings (gear icon)
echo 3. Go to "Troubleshoot" tab
echo 4. Click "Reset to factory defaults"
echo 5. Confirm the reset
echo 6. Wait for Docker to restart
echo.

echo 🚀 Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo.
echo ⏳ Waiting for Docker to start (30 seconds)...
timeout /t 30 /nobreak >nul

echo.
echo 🧪 Testing Docker...
docker --version
docker ps

echo.
echo 📋 If Docker is working, run:
echo    docker-compose up -d
echo.
echo 📋 If Docker still has issues, run:
echo    run-manual.bat
echo.
pause
