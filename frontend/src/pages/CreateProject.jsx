import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function CreateProject() {
  const { address, isConnected } = useAccount()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    fundingGoal: '',
    deadline: '',
    stages: 3,
    stageAllocations: ['', '', ''],
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const handleStageChange = (index, value) => {
    const newAllocations = [...formData.stageAllocations]
    newAllocations[index] = value
    setFormData({ ...formData, stageAllocations: newAllocations })
  }

  const addStage = () => {
    if (formData.stages < 7) {
      setFormData({
        ...formData,
        stages: formData.stages + 1,
        stageAllocations: [...formData.stageAllocations, ''],
      })
    }
  }

  const removeStage = () => {
    if (formData.stages > 1) {
      const newAllocations = formData.stageAllocations.slice(0, -1)
      setFormData({
        ...formData,
        stages: formData.stages - 1,
        stageAllocations: newAllocations,
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isConnected) {
      toast.error('Please connect your wallet')
      return
    }

    // Validate allocations sum to funding goal
    const allocations = formData.stageAllocations.map(a => parseEther(a || '0'))
    const goal = parseEther(formData.fundingGoal)
    const sum = allocations.reduce((a, b) => a + b, 0n)

    if (sum !== goal) {
      toast.error('Stage allocations must sum to funding goal')
      return
    }

    const deadline = Math.floor(new Date(formData.deadline).getTime() / 1000)

    try {
      // TODO: Deploy contract via factory or use factory pattern
      // For now, this is a placeholder - you'll need to implement contract deployment
      toast.success('Project creation initiated. Please deploy the contract manually for now.')
      
      // Save project metadata to backend
      const projectData = {
        title: formData.title,
        description: formData.description,
        owner: address,
        fundingGoal: formData.fundingGoal,
        deadline,
        totalStages: formData.stages,
        stageAllocations: formData.stageAllocations,
      }

      await axios.post(`${API_URL}/api/projects`, projectData)
      toast.success('Project metadata saved!')
      navigate('/projects')
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto card text-center py-12">
        <p className="text-gray-600 mb-4">Please connect your wallet to create a project</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create New Project</h1>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Title
          </label>
          <input
            type="text"
            required
            className="input"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Build a 5km Road"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            required
            rows={4}
            className="input"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your project in detail..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funding Goal (ETH)
            </label>
            <input
              type="number"
              step="0.01"
              required
              className="input"
              value={formData.fundingGoal}
              onChange={(e) => setFormData({ ...formData, fundingGoal: e.target.value })}
              placeholder="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deadline
            </label>
            <input
              type="datetime-local"
              required
              className="input"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Milestone Allocations (ETH)
            </label>
            <div className="space-x-2">
              <button
                type="button"
                onClick={removeStage}
                disabled={formData.stages <= 1}
                className="btn-secondary text-sm py-1 px-3"
              >
                Remove Stage
              </button>
              <button
                type="button"
                onClick={addStage}
                disabled={formData.stages >= 7}
                className="btn-secondary text-sm py-1 px-3"
              >
                Add Stage
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {formData.stageAllocations.map((allocation, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 w-20">Stage {index + 1}:</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input flex-1"
                  value={allocation}
                  onChange={(e) => handleStageChange(index, e.target.value)}
                  placeholder="0.00"
                />
                <span className="text-sm text-gray-500">ETH</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Total: {formData.stageAllocations.reduce((sum, a) => sum + parseFloat(a || 0), 0).toFixed(2)} ETH
            {formData.fundingGoal && (
              <span className={formData.stageAllocations.reduce((sum, a) => sum + parseFloat(a || 0), 0).toFixed(2) === parseFloat(formData.fundingGoal || 0).toFixed(2) ? ' text-green-600' : ' text-red-600'}>
                {' '}(Goal: {formData.fundingGoal} ETH)
              </span>
            )}
          </p>
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="btn-primary w-full py-3"
        >
          {isPending ? 'Creating...' : isConfirming ? 'Confirming...' : 'Create Project'}
        </button>
      </form>
    </div>
  )
}
