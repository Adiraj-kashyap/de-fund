import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useAccount } from 'wagmi'
import toast from 'react-hot-toast'
import { uploadToIPFS } from '../utils/ipfs'
import { CONTRACT_ADDRESSES, MILESTONE_GOVERNANCE_ABI } from '../config/contracts'

export default function MilestoneForm({ projectAddress, stageIndex, onSuccess }) {
  const { address } = useAccount()
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [evidenceHash, setEvidenceHash] = useState('')
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const handleFileChange = (e) => {
    setEvidenceFile(e.target.files[0])
  }

  const handleUploadEvidence = async () => {
    if (!evidenceFile) {
      toast.error('Please select a file')
      return
    }

    setUploading(true)
    try {
      const result = await uploadToIPFS(evidenceFile)
      setEvidenceHash(result.hash)
      toast.success('Evidence uploaded to IPFS')
    } catch (error) {
      console.error('IPFS upload error:', error)
      toast.error('Failed to upload evidence')
    } finally {
      setUploading(false)
    }
  }

  const handleCreateProposal = async () => {
    if (!evidenceHash) {
      toast.error('Please upload evidence first')
      return
    }

    if (!CONTRACT_ADDRESSES.MilestoneGovernance) {
      toast.error('Governance contract address not configured')
      return
    }

    setCreating(true)
    try {
      writeContract({
        address: CONTRACT_ADDRESSES.MilestoneGovernance,
        abi: MILESTONE_GOVERNANCE_ABI,
        functionName: 'createMilestoneProposal',
        args: [BigInt(stageIndex), evidenceHash],
      })
    } catch (error) {
      console.error('Proposal creation error:', error)
      toast.error('Failed to create proposal')
      setCreating(false)
    }
  }

  // Handle success
  if (isSuccess && onSuccess) {
    setTimeout(() => {
      onSuccess()
      setEvidenceFile(null)
      setEvidenceHash('')
    }, 1000)
  }

  return (
    <div className="card mt-4">
      <h3 className="text-lg font-semibold mb-4">Submit Milestone Completion</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Evidence (Photos, Documents, etc.)
          </label>
          <div className="flex space-x-2">
            <input
              type="file"
              onChange={handleFileChange}
              className="input flex-1"
              accept="image/*,.pdf,.doc,.docx"
            />
            <button
              onClick={handleUploadEvidence}
              disabled={!evidenceFile || uploading}
              className="btn-secondary"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          {evidenceHash && (
            <p className="text-sm text-green-600 mt-2">
              ? Uploaded: {evidenceHash.slice(0, 20)}...
            </p>
          )}
        </div>

        <button
          onClick={handleCreateProposal}
          disabled={!evidenceHash || creating || isPending || isConfirming}
          className="btn-primary w-full"
        >
          {creating || isPending
            ? 'Creating Proposal...'
            : isConfirming
            ? 'Confirming...'
            : 'Create Milestone Proposal'}
        </button>
      </div>
    </div>
  )
}
