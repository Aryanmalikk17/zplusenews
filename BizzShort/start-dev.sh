#!/bin/bash

# ZPlusNews Development Server Startup Script
# This script starts both backend and frontend servers

echo "🚀 Starting ZPlus News Development Servers..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Node.js
if ! command_exists node; then
    echo -e "${YELLOW}⚠️  Node.js not found!${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command_exists npm; then
    echo -e "${YELLOW}⚠️  npm not found!${NC}"
    echo "Please install npm (comes with Node.js)"
    exit 1
fi

echo -e "${BLUE}📦 Checking Node.js version...${NC}"
node --version
echo ""

# Check if node_modules exists in root
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
    echo -e "${YELLOW}📥 Installing backend dependencies...${NC}"
    npm install
    echo ""
fi

# Check if node_modules exists in client
if [ ! -d "$PROJECT_ROOT/client/node_modules" ]; then
    echo -e "${YELLOW}📥 Installing frontend dependencies...${NC}"
    cd "$PROJECT_ROOT/client"
    npm install
    cd "$PROJECT_ROOT"
    echo ""
fi

# Check for .env file
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    echo "Creating .env from .env.example..."
    if [ -f "$PROJECT_ROOT/.env.example" ]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        echo -e "${GREEN}✅ Created .env file${NC}"
        echo "⚠️  Please update .env with your MongoDB URI and other settings"
        echo ""
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

echo -e "${GREEN}✅ All dependencies installed!${NC}"
echo ""
echo "======================================"
echo "  Starting Development Servers"
echo "======================================"
echo ""
echo -e "${BLUE}Backend:${NC} http://localhost:5000"
echo -e "${BLUE}Frontend:${NC} http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend server in background
echo -e "${GREEN}[Backend]${NC} Starting Node.js server..."
cd "$PROJECT_ROOT"
node server.js &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend server in background
echo -e "${GREEN}[Frontend]${NC} Starting Vite dev server..."
cd "$PROJECT_ROOT/client"
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait
