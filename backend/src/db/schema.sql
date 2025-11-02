-- SQLite Database Schema for Milestone Funding Platform

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    username VARCHAR(50),
    email VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_address VARCHAR(42) UNIQUE NOT NULL,
    owner_address VARCHAR(42) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),
    image_url TEXT,
    funding_goal TEXT NOT NULL, -- Store as string (wei)
    funding_deadline BIGINT NOT NULL,
    total_stages INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, funded, cancelled, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_address) REFERENCES users(wallet_address)
);

-- Milestones table
CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    stage_index INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    allocation_percentage INTEGER NOT NULL, -- Basis points (10000 = 100%)
    evidence_hash TEXT, -- IPFS hash
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, rejected
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, stage_index)
);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    donor_address VARCHAR(42) NOT NULL,
    amount TEXT NOT NULL, -- Store as string (wei)
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (donor_address) REFERENCES users(wallet_address)
);

-- Proposals table
CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    proposal_id_onchain INTEGER NOT NULL,
    stage_index INTEGER NOT NULL,
    evidence_hash TEXT NOT NULL,
    votes_for TEXT DEFAULT '0', -- Store as string (wei)
    votes_against TEXT DEFAULT '0', -- Store as string (wei)
    status VARCHAR(20) DEFAULT 'active', -- active, approved, rejected, executed
    start_time BIGINT NOT NULL,
    end_time BIGINT NOT NULL,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, proposal_id_onchain)
);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    voter_address VARCHAR(42) NOT NULL,
    in_favor BOOLEAN NOT NULL,
    weight TEXT NOT NULL, -- Store as string (wei)
    tx_hash VARCHAR(66) NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (voter_address) REFERENCES users(wallet_address),
    UNIQUE(proposal_id, voter_address)
);

-- Comments table (for project discussions)
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_address VARCHAR(42) NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER, -- For nested comments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_address) REFERENCES users(wallet_address),
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Project updates table
CREATE TABLE IF NOT EXISTS project_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_address);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_donations_project ON donations(project_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_address);
CREATE INDEX IF NOT EXISTS idx_proposals_project ON proposals(project_id);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_address);
CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id);

-- SQLite doesn't support triggers for auto-updating updated_at, so we'll handle it in the application
-- But we can create a view or use a workaround if needed
