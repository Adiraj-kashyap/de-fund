import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useReadContract, useAccount } from 'wagmi'
import { formatEther, formatUnits } from 'viem'
import { CONTRACT_ADDRESSES, FUNDING_ESCROW_ABI } from '../config/contracts'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Projects() {
  const { address } = useAccount()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects`)
      setProjects(response.data)
    } catch (error) {
      console.error('Error fetching projects:', error)
      // Fallback to empty array if API is not available
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Projects</h1>
        <Link to="/projects/create" className="btn-primary">
          Create New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">No projects found.</p>
          <Link to="/projects/create" className="btn-primary">
            Create the first project
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.contractAddress} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }) {
  const { data: fundsRaised } = useReadContract({
    address: project.contractAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'fundsRaised',
    enabled: !!project.contractAddress,
  })

  const { data: fundingGoal } = useReadContract({
    address: project.contractAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'fundingGoal',
    enabled: !!project.contractAddress,
  })

  const { data: fundingGoalMet } = useReadContract({
    address: project.contractAddress,
    abi: FUNDING_ESCROW_ABI,
    functionName: 'fundingGoalMet',
    enabled: !!project.contractAddress,
  })

  const progress = fundingGoal && fundsRaised
    ? Number((BigInt(fundsRaised) * 100n) / BigInt(fundingGoal))
    : 0

  return (
    <Link to={`/projects/${project.contractAddress}`} className="card hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{fundsRaised ? formatEther(fundsRaised) : '0'} ETH</span>
          <span>{fundingGoal ? formatEther(fundingGoal) : '0'} ETH</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-sm px-2 py-1 rounded ${
          fundingGoalMet
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {fundingGoalMet ? 'Funded' : 'Funding'}
        </span>
        <span className="text-sm text-gray-500">
          {project.totalStages} milestones
        </span>
      </div>
    </Link>
  )
}
