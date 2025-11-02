import { useState, useEffect } from 'react'
import { useParams, useAccount } from 'wagmi'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { CONTRACT_ADDRESSES, FUNDING_ESCROW_ABI, MILESTONE_GOVERNANCE_ABI } from '../config/contracts'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function ProjectDetail() {
  const { address: projectAddress } = useParams()
  const { address: userAddress } = useAccount()
  const [project, setProject] = useState(null)
  const [donationAmount, setDonationAmount] = useState('')
  const [loading, setLoading] = useState(true)

  const { data: projectOwner } = useReadContract({
    address: projectAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'projectOwner',
    enabled: !!projectAddress,
  })

  const { data: fundingGoal } = useReadContract({
    address: projectAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'fundingGoal',
    enabled: !!projectAddress,
  })

  const { data: fundsRaised } = useReadContract({
    address: projectAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'fundsRaised',
    enabled: !!projectAddress,
  })

  const { data: deadline } = useReadContract({
    address: projectAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'deadline',
    enabled: !!projectAddress,
  })

  const { data: totalStages } = useReadContract({
    address: projectAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'totalStages',
    enabled: !!projectAddress,
  })

  const { data: currentStage } = useReadContract({
    address: projectAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'currentStage',
    enabled: !!projectAddress,
  })

  const { data: fundingGoalMet } = useReadContract({
    address: projectAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'fundingGoalMet',
    enabled: !!projectAddress,
  })

  const { writeContract: donate, data: donateHash, isPending: isDonating } = useWriteContract()
  const { isLoading: isConfirmingDonation, isSuccess: donationSuccess } = useWaitForTransactionReceipt({
    hash: donateHash,
  })

  useEffect(() => {
    fetchProjectDetails()
  }, [projectAddress])

  useEffect(() => {
    if (donationSuccess) {
      toast.success('Donation successful!')
      setDonationAmount('')
    }
  }, [donationSuccess])

  const fetchProjectDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects/${projectAddress}`)
      setProject(response.data)
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDonate = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      toast.error('Please enter a valid donation amount')
      return
    }

    try {
      donate({
        address: projectAddress,
        abi: FUNDING_ESCROW_ABI,
        functionName: 'donate',
        value: parseEther(donationAmount),
      })
    } catch (error) {
      console.error('Donation error:', error)
      toast.error('Failed to donate')
    }
  }

  const progress = fundingGoal && fundsRaised
    ? Number((BigInt(fundsRaised) * 100n) / BigInt(fundingGoal))
    : 0

  const isOwner = projectOwner && userAddress && projectOwner.toLowerCase() === userAddress.toLowerCase()

  if (loading) {
    return <div className="text-center py-12">Loading project details...</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      {project && (
        <>
          <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
          <p className="text-gray-600 mb-8">{project.description}</p>

          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Funding Progress</h2>
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Raised</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>{fundsRaised ? formatEther(fundsRaised) : '0'} ETH</span>
                <span>{fundingGoal ? formatEther(fundingGoal) : '0'} ETH goal</span>
              </div>
            </div>

            {deadline && (
              <p className="text-sm text-gray-600">
                Deadline: {format(new Date(Number(deadline) * 1000), 'PPpp')}
              </p>
            )}
          </div>

          {!fundingGoalMet && (
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">Donate to This Project</h2>
              <div className="flex space-x-2">
                <input
                  type="number"
                  step="0.01"
                  className="input flex-1"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="Amount in ETH"
                />
                <button
                  onClick={handleDonate}
                  disabled={isDonating || isConfirmingDonation}
                  className="btn-primary"
                >
                  {isDonating ? 'Donating...' : isConfirmingDonation ? 'Confirming...' : 'Donate'}
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Milestones</h2>
            <div className="space-y-4">
              {totalStages && Array.from({ length: Number(totalStages) }).map((_, index) => (
                <MilestoneCard
                  key={index}
                  stageIndex={index}
                  projectAddress={projectAddress}
                  currentStage={currentStage}
                  isOwner={isOwner}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MilestoneCard({ stageIndex, projectAddress, currentStage, isOwner }) {
  const { data: allocation } = useReadContract({
    address: projectAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'fundsAllocatedPerStage',
    args: [BigInt(stageIndex)],
    enabled: !!projectAddress,
  })

  const { data: released } = useReadContract({
    address: projectAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'stageFundsReleased',
    args: [BigInt(stageIndex)],
    enabled: !!projectAddress,
  })

  const isCurrent = currentStage && Number(currentStage) === stageIndex
  const isCompleted = released
  const isUpcoming = currentStage && Number(currentStage) > stageIndex

  return (
    <div className={`p-4 border rounded-lg ${
      isCompleted ? 'bg-green-50 border-green-200' :
      isCurrent ? 'bg-blue-50 border-blue-200' :
      'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold">Milestone {stageIndex + 1}</h3>
          <p className="text-sm text-gray-600">
            Allocation: {allocation ? formatEther(allocation) : '0'} ETH
          </p>
        </div>
        <div>
          {isCompleted && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              Released
            </span>
          )}
          {isCurrent && !isCompleted && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              Current
            </span>
          )}
          {!isCurrent && !isCompleted && (
            <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
              Upcoming
            </span>
          )}
        </div>
      </div>
      {isCurrent && isOwner && !isCompleted && (
        <button className="mt-3 btn-primary text-sm">
          Submit Milestone Completion
        </button>
      )}
    </div>
  )
}
