# Start Script for Immutrack Supply Chain Application
# This script starts both the backend and frontend servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Immutrack Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "backend"
$frontendDir = Join-Path $scriptDir "frontend"

# Check if .env exists in backend
$envFile = Join-Path $backendDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found in backend directory!" -ForegroundColor Red
    Write-Host "Please create backend/.env with:" -ForegroundColor Yellow
    Write-Host "  RPC_URL=your_rpc_url" -ForegroundColor Yellow
    Write-Host "  PRIVATE_KEY=your_private_key" -ForegroundColor Yellow
    Write-Host "  CONTRACT_ADDRESS=your_contract_address" -ForegroundColor Yellow
    Write-Host "  PORT=3001" -ForegroundColor Yellow
    exit 1
}

# Start Backend Server
Write-Host "Starting Backend Server on port 3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; npm start" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "Starting Frontend Server (Vite dev server)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendDir'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Servers Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend API:  http://localhost:3001" -ForegroundColor Yellow
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: Two PowerShell windows will open - one for each server." -ForegroundColor Gray
Write-Host "Close those windows to stop the servers." -ForegroundColor Gray
Write-Host ""

