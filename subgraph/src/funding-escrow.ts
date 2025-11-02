import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  DonationReceived,
  FundingGoalReached,
  FundsReleased,
  RefundIssued,
  ProjectCancelled
} from "../generated/FundingEscrow/FundingEscrow"
import { Project, Donation, Milestone, PlatformStats } from "../generated/schema"

export function handleDonationReceived(event: DonationReceived): void {
  let projectId = event.address.toHex()
  let project = Project.load(projectId)
  
  if (project == null) {
    project = new Project(projectId)
    project.owner = event.params.donor // This should be set from contract
    project.fundingGoal = BigInt.fromI32(0)
    project.fundsRaised = BigInt.fromI32(0)
    project.fundingDeadline = BigInt.fromI32(0)
    project.totalStages = 0
    project.currentStage = 0
    project.goalReached = false
    project.cancelled = false
    project.createdAt = event.block.timestamp
    project.donorCount = 0
    project.totalDonations = 0
  }
  
  project.fundsRaised = event.params.totalRaised
  project.totalDonations = project.totalDonations + 1
  project.updatedAt = event.block.timestamp
  project.save()
  
  // Create donation record
  let donationId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let donation = new Donation(donationId)
  donation.project = projectId
  donation.donor = event.params.donor
  donation.amount = event.params.amount
  donation.timestamp = event.block.timestamp
  donation.blockNumber = event.block.number
  donation.txHash = event.transaction.hash
  donation.save()
  
  // Update platform stats
  updatePlatformStats(event.block.timestamp)
}

export function handleFundingGoalReached(event: FundingGoalReached): void {
  let projectId = event.address.toHex()
  let project = Project.load(projectId)
  
  if (project != null) {
    project.goalReached = true
    project.updatedAt = event.block.timestamp
    project.save()
  }
}

export function handleFundsReleased(event: FundsReleased): void {
  let projectId = event.address.toHex()
  let project = Project.load(projectId)
  
  if (project != null) {
    project.currentStage = project.currentStage + 1
    project.updatedAt = event.block.timestamp
    project.save()
    
    // Update milestone
    let milestoneId = projectId + "-" + event.params.stageIndex.toString()
    let milestone = Milestone.load(milestoneId)
    
    if (milestone == null) {
      milestone = new Milestone(milestoneId)
      milestone.project = projectId
      milestone.stageIndex = event.params.stageIndex.toI32()
      milestone.allocation = 0
      milestone.completed = false
      milestone.fundsReleased = BigInt.fromI32(0)
    }
    
    milestone.completed = true
    milestone.completedAt = event.block.timestamp
    milestone.fundsReleased = event.params.amount
    milestone.recipient = event.params.recipient
    milestone.save()
  }
}

export function handleRefundIssued(event: RefundIssued): void {
  // Track refunds if needed
}

export function handleProjectCancelled(event: ProjectCancelled): void {
  let projectId = event.address.toHex()
  let project = Project.load(projectId)
  
  if (project != null) {
    project.cancelled = true
    project.updatedAt = event.block.timestamp
    project.save()
  }
}

function updatePlatformStats(timestamp: BigInt): void {
  let stats = PlatformStats.load("1")
  
  if (stats == null) {
    stats = new PlatformStats("1")
    stats.totalProjects = 0
    stats.totalDonations = BigInt.fromI32(0)
    stats.totalDonors = 0
    stats.totalVoters = 0
    stats.totalProposals = 0
    stats.totalVotes = 0
  }
  
  stats.updatedAt = timestamp
  stats.save()
}
