import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { CONTRACT_ADDRESSES, MILESTONE_GOVERNANCE_ABI, GOVERNANCE_TOKEN_ABI } from '../config/contracts'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Proposals() {
  const { address } = useAccount()
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProposals()
  }, [])

  const fetchProposals = async () => {
    try {
      // Fetch from backend API
      const response = await axios.get(`${API_URL}/api/proposals`)
      setProposals(response.data)
    } catch (error) {
      console.error('Error fetching proposals:', error)
      setProposals([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Loading proposals...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Active Proposals</h1>

      {proposals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No active proposals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProposalCard({ proposal }) {
  const { address } = useAccount()
  const [stakeAmount, setStakeAmount] = useState('')
  const [hasVoted, setHasVoted] = useState(false)

  const { data: proposalData } = useReadContract({
    address: CONTRACT_ADDRESSES.MilestoneGovernance,
    abi: MILESTONE_GOVERNANCE_ABI,
    functionName: 'getProposal',
    args: [BigInt(proposal.id)],
    enabled: !!CONTRACT_ADDRESSES.MilestoneGovernance,
  })

  const { data: stakedTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.MilestoneGovernance,
    abi: MILESTONE_GOVERNANCE_ABI,
    functionName: 'stakedTokens',
    args: [address],
    enabled: !!address && !!CONTRACT_ADDRESSES.MilestoneGovernance,
  })

  const { data: minimumStake } = useReadContract({
    address: CONTRACT_ADDRESSES.MilestoneGovernance,
    abi: MILESTONE_GOVERNANCE_ABI,
    functionName: 'minimumStake',
    enabled: !!CONTRACT_ADDRESSES.MilestoneGovernance,
  })

  const { writeContract: vote, data: voteHash, isPending: isVoting } = useWriteContract()
  const { writeContract: stake, data: stakeHash, isPending: isStaking } = useWriteContract()
  const { writeContract: execute, data: executeHash, isPending: isExecuting } = useWriteContract()

  const { isLoading: isConfirmingVote } = useWaitForTransactionReceipt({ hash: voteHash })
  const { isLoading: isConfirmingStake } = useWaitForTransactionReceipt({ hash: stakeHash })
  const { isLoading: isConfirmingExecute } = useWaitForTransactionReceipt({ hash: executeHash })

  const handleVote = (inFavor) => {
    if (!stakedTokens || stakedTokens < minimumStake) {
      toast.error('You need to stake tokens first')
      return
    }

    vote({
      address: CONTRACT_ADDRESSES.MilestoneGovernance,
      abi: MILESTONE_GOVERNANCE_ABI,
      functionName: 'vote',
      args: [BigInt(proposal.id), inFavor],
    })
  }

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      toast.error('Please enter a valid stake amount')
      return
    }

    // First approve, then stake
    // This is simplified - in production you'd check allowance first
    stake({
      address: CONTRACT_ADDRESSES.GovernanceToken,
      abi: GOVERNANCE_TOKEN_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.MilestoneGovernance, parseEther(stakeAmount)],
    })
  }

  const handleExecute = () => {
    execute({
      address: CONTRACT_ADDRESSES.MilestoneGovernance,
      abi: MILESTONE_GOVERNANCE_ABI,
      functionName: 'checkVoteResult',
      args: [BigInt(proposal.id)],
    })
  }

  if (!proposalData) {
    return <div className="card p-4">Loading proposal data...</div>
  }

  const [stageIndex, evidenceHash, proposer, votingDeadline, votesFor, votesAgainst, executed, passed] = proposalData
  const deadline = new Date(Number(votingDeadline) * 1000)
  const isExpired = deadline < new Date()
  const canVote = !executed && !isExpired && stakedTokens >= minimumStake
  const canExecute = !executed && isExpired

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold">Milestone {Number(stageIndex) + 1} Completion</h3>
          <p className="text-sm text-gray-600 mt-1">
            Evidence: <a href={`https://ipfs.io/ipfs/${evidenceHash}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{evidenceHash.slice(0, 20)}...</a>
          </p>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-full text-sm ${
            executed
              ? passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              : isExpired
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {executed ? (passed ? 'Passed' : 'Rejected') : isExpired ? 'Expired' : 'Active'}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Voting Deadline</p>
          <p className="font-medium">{format(deadline, 'PPpp')}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Votes</p>
          <p className="font-medium">
            For: {votesFor ? formatEther(votesFor) : '0'} | Against: {votesAgainst ? formatEther(votesAgainst) : '0'}
          </p>
        </div>
      </div>

      {!executed && (
        <div className="border-t pt-4 space-y-3">
          {stakedTokens < minimumStake ? (
            <div>
              <p className="text-sm text-gray-600 mb-2">Stake tokens to vote (Minimum: {minimumStake ? formatEther(minimumStake) : '0'})</p>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  className="input flex-1"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="Amount"
                />
                <button
                  onClick={handleStake}
                  disabled={isStaking || isConfirmingStake}
                  className="btn-primary"
                >
                  {isStaking || isConfirmingStake ? 'Staking...' : 'Stake'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">Your staked: {stakedTokens ? formatEther(stakedTokens) : '0'} tokens</p>
              {canVote && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleVote(true)}
                    disabled={isVoting || isConfirmingVote}
                    className="btn-primary flex-1"
                  >
                    {isVoting || isConfirmingVote ? 'Voting...' : 'Vote For'}
                  </button>
                  <button
                    onClick={() => handleVote(false)}
                    disabled={isVoting || isConfirmingVote}
                    className="btn-secondary flex-1"
                  >
                    Vote Against
                  </button>
                </div>
              )}
              {canExecute && (
                <button
                  onClick={handleExecute}
                  disabled={isExecuting || isConfirmingExecute}
                  className="btn-primary w-full"
                >
                  {isExecuting || isConfirmingExecute ? 'Executing...' : 'Execute Proposal'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
