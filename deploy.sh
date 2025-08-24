#!/bin/bash

echo "🚀 Deploying Biospec Group Meeting Scheduler..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install-all

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Build the React app
echo "🔨 Building React app..."
cd client
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Failed to build React app"
    exit 1
fi

cd ..

echo "✅ Build completed successfully!"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Please create one with your email credentials."
    echo "   Copy env.example to .env and update with your Gmail credentials."
fi

echo ""
echo "🎉 Deployment preparation completed!"
echo ""
echo "To start the application:"
echo "  npm run dev          # Development mode (both frontend and backend)"
echo "  npm run server       # Backend only"
echo "  npm start            # Production mode"
echo ""
echo "The app will be available at:"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:3001"
echo ""
echo "Default passcode: BiospecParty"
