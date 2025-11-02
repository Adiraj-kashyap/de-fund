#!/usr/bin/env node

/**
 * Health check script
 * Checks if all services are running and configured correctly
 */

import axios from 'axios'
import { ethers } from 'ethers'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

const checks = []
let allPassed = true

function addCheck(name, passed, message) {
  checks.push({ name, passed, message })
  if (!passed) allPassed = false
  const icon = passed ? '?' : '?'
  console.log(`${icon} ${name}: ${message}`)
}

async function checkBackend() {
  try {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:5000'
    const response = await axios.get(`${apiUrl}/health`, { timeout: 5000 })
    addCheck('Backend API', response.status === 200, 'Running')
  } catch (error) {
    addCheck('Backend API', false, `Not responding: ${error.message}`)
  }
}

async function checkRPC() {
  try {
    const rpcUrl = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const blockNumber = await provider.getBlockNumber()
    addCheck('RPC Connection', true, `Connected (block: ${blockNumber})`)
  } catch (error) {
    addCheck('RPC Connection', false, `Failed: ${error.message}`)
  }
}

function checkContracts() {
  try {
    const contractAddresses = JSON.parse(
      process.env.CONTRACT_ADDRESSES || 
      process.env.VITE_CONTRACT_ADDRESSES || 
      '{}'
    )
    
    const required = ['FundingEscrow', 'MilestoneGovernance', 'GovernanceToken']
    const missing = required.filter(contract => !contractAddresses[contract])
    
    if (missing.length === 0) {
      addCheck('Contract Addresses', true, 'All contracts configured')
    } else {
      addCheck('Contract Addresses', false, `Missing: ${missing.join(', ')}`)
    }
  } catch (error) {
    addCheck('Contract Addresses', false, `Invalid format: ${error.message}`)
  }
}

function checkDatabase() {
  try {
    const dbPath = process.env.DATABASE_PATH || './backend/data/database.db'
    const fs = require('fs')
    if (fs.existsSync(dbPath)) {
      addCheck('Database', true, `Found at ${dbPath}`)
    } else {
      addCheck('Database', false, `Not found at ${dbPath} (will be created on first run)`)
    }
  } catch (error) {
    addCheck('Database', false, `Error: ${error.message}`)
  }
}

async function runChecks() {
  console.log('?? Running health checks...\n')
  
  await checkBackend()
  await checkRPC()
  checkContracts()
  checkDatabase()
  
  console.log('\n' + '='.repeat(50))
  if (allPassed) {
    console.log('? All checks passed!')
  } else {
    console.log('? Some checks failed. Please review the issues above.')
  }
  console.log('='.repeat(50))
  
  process.exit(allPassed ? 0 : 1)
}

runChecks()
