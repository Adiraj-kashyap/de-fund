#!/bin/bash

echo "?? Setting up Milestone Funding Platform..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "? Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "? Node.js found: $(node --version)"

# Install root dependencies
echo ""
echo "?? Installing smart contract dependencies..."
npm install

# Install backend dependencies
echo ""
echo "?? Installing backend dependencies..."
cd backend
npm install
cd ..

# Install frontend dependencies
echo ""
echo "?? Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "? Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example files and update with your configuration:"
echo "   - Copy .env.example to .env (root)"
echo "   - Copy backend/.env.example to backend/.env"
echo "   - Copy frontend/.env.example to frontend/.env"
echo ""
echo "2. Deploy smart contracts:"
echo "   npm run deploy:sepolia"
echo ""
echo "3. Start backend:"
echo "   cd backend && npm start"
echo ""
echo "4. Start frontend:"
echo "   cd frontend && npm run dev"
echo ""
echo "5. Run indexer (in separate terminal):"
echo "   cd backend && npm run index"
echo ""
