# Changelog

All notable changes to the Milestone Funding Platform will be documented in this file.

## [1.0.0] - 2024-01-XX

### Added
- Initial release of Milestone Funding Platform
- Smart contracts:
  - FundingEscrow.sol - Escrow system with milestone-based releases
  - MilestoneGovernance.sol - DAO voting system
  - GovernanceToken.sol - ERC20 governance token
  - ProjectFactory.sol - Factory for creating projects
- Frontend:
  - React app with Vite
  - Wallet connection (RainbowKit/Wagmi)
  - Project creation, listing, and detail pages
  - Donation interface
  - Milestone proposal creation with IPFS upload
  - Voting interface
  - User dashboard
  - Responsive design with Tailwind CSS
- Backend:
  - Express.js REST API
  - SQLite database
  - Blockchain event indexer
  - IPFS integration
- Documentation:
  - Comprehensive README
  - Contract overview
  - Deployment guide
  - Quick start guide
- Testing:
  - 42+ unit tests for smart contracts
  - All tests passing

### Features
- All-or-nothing funding model
- Milestone-based fund releases
- DAO governance voting
- Token staking for voting rights
- Automatic refunds
- IPFS evidence storage
- Event indexing

## [1.1.0] - 2024-01-XX (Current)

### Added
- Error boundary component for frontend
- Loading spinner component
- Transaction status component
- Custom React hooks for data fetching
- Format utility functions
- Modal component
- Backend validation utilities
- Rate limiting middleware
- Error handling middleware
- Health check script
- Contract verification script
- CI/CD workflow (GitHub Actions)
- ESLint configuration
- Enhanced error messages
- Improved loading states

### Improved
- Better error handling throughout
- More user-friendly error messages
- Improved transaction feedback
- Enhanced API validation
- Better IPFS error handling
- Updated Wagmi configuration
- Fixed IPFS client compatibility

### Security
- Rate limiting on API endpoints
- Input validation
- Address format validation
- Project data validation

## [Unreleased]

### Planned
- Contract factory integration in frontend
- Real-time updates via WebSocket
- Email notifications
- Mobile app
- Gas fee abstraction
- Kleros integration
- Reputation system
- Multi-token support
- The Graph subgraph
