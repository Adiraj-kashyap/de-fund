#!/usr/bin/env node

/**
 * Continuous indexer script
 * Runs indexing every N seconds
 * Usage: node scripts/update-indexer.js [interval_seconds]
 */

import { indexBlocks } from '../backend/scripts/indexer.js'

const INTERVAL_SECONDS = parseInt(process.argv[2]) || 60 // Default: 60 seconds

console.log(`Starting continuous indexer (interval: ${INTERVAL_SECONDS}s)`)

async function runIndexer() {
  try {
    await indexBlocks()
  } catch (error) {
    console.error('Indexer error:', error)
  }
}

// Run immediately
runIndexer()

// Then run every INTERVAL_SECONDS
setInterval(runIndexer, INTERVAL_SECONDS * 1000)
