import { BigInt } from "@graphprotocol/graph-ts"
import {
  ProposalCreated,
  VoteCast,
  ProposalApproved,
  ProposalRejected,
  ProposalExecuted,
  VoterRegistered
} from "../generated/MilestoneGovernance/MilestoneGovernance"
import { Proposal, Vote, Voter, Project } from "../generated/schema"

export function handleProposalCreated(event: ProposalCreated): void {
  let proposalId = event.params.proposalId.toString()
  let proposal = new Proposal(proposalId)
  
  proposal.project = event.params.escrowContract.toHex()
  proposal.stageIndex = event.params.stageIndex.toI32()
  proposal.evidenceHash = event.params.evidenceHash
  proposal.votesFor = BigInt.fromI32(0)
  proposal.votesAgainst = BigInt.fromI32(0)
  proposal.status = "ACTIVE"
  proposal.startTime = event.block.timestamp
  proposal.endTime = event.block.timestamp.plus(BigInt.fromI32(604800)) // 7 days
  proposal.executed = false
  proposal.createdAt = event.block.timestamp
  
  proposal.save()
}

export function handleVoteCast(event: VoteCast): void {
  let proposalId = event.params.proposalId.toString()
  let proposal = Proposal.load(proposalId)
  
  if (proposal != null) {
    // Update vote counts
    if (event.params.inFavor) {
      proposal.votesFor = proposal.votesFor.plus(event.params.weight)
    } else {
      proposal.votesAgainst = proposal.votesAgainst.plus(event.params.weight)
    }
    proposal.save()
    
    // Create vote record
    let voteId = proposalId + "-" + event.params.voter.toHex()
    let vote = new Vote(voteId)
    vote.proposal = proposalId
    vote.voter = event.params.voter.toHex()
    vote.inFavor = event.params.inFavor
    vote.weight = event.params.weight
    vote.timestamp = event.block.timestamp
    vote.txHash = event.transaction.hash
    vote.save()
    
    // Update voter
    let voter = Voter.load(event.params.voter.toHex())
    if (voter != null) {
      voter.proposalsVoted = voter.proposalsVoted + 1
      voter.save()
    }
  }
}

export function handleProposalApproved(event: ProposalApproved): void {
  let proposalId = event.params.proposalId.toString()
  let proposal = Proposal.load(proposalId)
  
  if (proposal != null) {
    proposal.status = "APPROVED"
    proposal.save()
  }
}

export function handleProposalRejected(event: ProposalRejected): void {
  let proposalId = event.params.proposalId.toString()
  let proposal = Proposal.load(proposalId)
  
  if (proposal != null) {
    proposal.status = "REJECTED"
    proposal.save()
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposalId = event.params.proposalId.toString()
  let proposal = Proposal.load(proposalId)
  
  if (proposal != null) {
    proposal.executed = true
    proposal.executedAt = event.block.timestamp
    proposal.status = "EXECUTED"
    proposal.save()
  }
}

export function handleVoterRegistered(event: VoterRegistered): void {
  let voterId = event.params.voter.toHex()
  let voter = new Voter(voterId)
  
  voter.address = event.params.voter
  voter.stakedAmount = event.params.stakedAmount
  voter.reputation = 100 // Initial reputation
  voter.proposalsVoted = 0
  voter.registeredAt = event.block.timestamp
  
  voter.save()
}
