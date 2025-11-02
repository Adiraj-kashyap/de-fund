# Backend API Documentation

REST API backend for the Milestone Funding Platform.

## ?? Quick Start

### Installation

```bash
cd backend
npm install
```

### Configuration

1. Copy environment file:
```bash
cp .env.example .env
```

2. Set up PostgreSQL database and update `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/milestone_funding
```

3. Run database migrations:
```bash
npm run db:migrate
```

### Development

```bash
npm run dev
# Server runs on http://localhost:3001
```

### Production

```bash
npm start
```

## ?? API Endpoints

### Projects

```
GET    /api/projects              # Get all projects
GET    /api/projects/:id          # Get project by ID
GET    /api/projects/contract/:address  # Get project by contract address
POST   /api/projects              # Create new project
GET    /api/projects/:id/donations      # Get project donations
GET    /api/projects/:id/updates        # Get project updates
POST   /api/projects/:id/updates        # Add project update
```

### Users

```
GET    /api/users/:address        # Get user profile
PUT    /api/users/:address        # Update user profile
GET    /api/users/:address/stats  # Get user statistics
```

### Proposals

```
GET    /api/proposals             # Get all proposals
GET    /api/proposals/:id         # Get proposal by ID
POST   /api/proposals             # Create proposal
POST   /api/proposals/:id/votes   # Record vote
```

### IPFS

```
POST   /api/ipfs/upload           # Upload file to IPFS
POST   /api/ipfs/upload-json      # Upload JSON to IPFS
GET    /api/ipfs/:hash            # Get IPFS content
```

### Statistics

```
GET    /api/stats                 # Get platform statistics
GET    /api/stats/trending        # Get trending projects
```

## ??? Database Schema

See `src/db/schema.sql` for complete schema.

### Main Tables

- **users** - User profiles
- **projects** - Funding projects
- **milestones** - Project milestones
- **donations** - Donation records
- **proposals** - Governance proposals
- **votes** - Voting records
- **comments** - Project comments
- **project_updates** - Project updates

## ?? Security

- Helmet.js for security headers
- CORS configuration
- Input validation
- SQL injection protection (parameterized queries)
- Rate limiting (recommended for production)

## ?? Dependencies

- **express** - Web framework
- **pg** - PostgreSQL client
- **cors** - CORS middleware
- **helmet** - Security headers
- **multer** - File uploads
- **ethers** - Ethereum library

## ?? Deployment

### Heroku

```bash
heroku create milestone-funding-api
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
```

### Railway

```bash
railway init
railway add postgresql
railway up
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## ?? Maintenance

### Database Backups

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Monitoring

- Use logging middleware (Morgan)
- Monitor database queries
- Track API response times
- Set up error tracking (Sentry)

## ?? License

MIT
