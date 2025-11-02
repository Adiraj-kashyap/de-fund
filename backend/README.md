# Milestone Funding Platform - Backend

Node.js backend API and blockchain event indexer.

## Features

- RESTful API for projects and proposals
- SQLite database for off-chain data
- Blockchain event indexing
- IPFS integration for evidence storage
- Express.js server

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - `RPC_URL` - Ethereum RPC endpoint
   - `CONTRACT_ADDRESSES` - JSON object with deployed contract addresses
   - `IPFS_API_URL` - IPFS node API URL (optional)
   - `DATABASE_PATH` - Path to SQLite database file

4. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

5. Run the indexer (in a separate terminal):
```bash
npm run index
```

## API Endpoints

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:address` - Get project by contract address
- `GET /api/projects/user/:address` - Get projects by owner
- `POST /api/projects` - Create new project
- `PATCH /api/projects/:address` - Update project

### Proposals
- `GET /api/proposals` - Get all active proposals
- `GET /api/proposals/:id` - Get proposal by ID
- `GET /api/proposals/project/:address` - Get proposals for a project
- `POST /api/proposals` - Create/update proposal (called by indexer)
- `PATCH /api/proposals/:id` - Update proposal (called by indexer)

### IPFS
- `POST /api/ipfs/upload` - Upload file to IPFS
- `POST /api/ipfs/upload-data` - Upload JSON/text data to IPFS
- `GET /api/ipfs/:hash` - Redirect to IPFS gateway

## Database Schema

The backend uses SQLite with the following tables:
- `projects` - Project metadata
- `proposals` - Milestone proposals
- `events` - Indexed blockchain events

## Indexer

The indexer script (`scripts/indexer.js`) listens to blockchain events and updates the database. Run it periodically or as a cron job.
