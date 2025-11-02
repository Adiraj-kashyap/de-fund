import { useAccount } from 'wagmi'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isConnected && address) {
      fetchUserProjects()
    }
  }, [address, isConnected])

  const fetchUserProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/projects/user/${address}`)
      setProjects(response.data)
    } catch (error) {
      console.error('Error fetching user projects:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto card text-center py-12">
        <p className="text-gray-600">Please connect your wallet to view your dashboard</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <Link to="/projects/create" className="btn-primary">
          Create New Project
        </Link>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">My Projects</h2>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : projects.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-600 mb-4">You haven't created any projects yet</p>
            <Link to="/projects/create" className="btn-primary">
              Create Your First Project
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link
                key={project.contractAddress}
                to={`/projects/${project.contractAddress}`}
                className="card hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/projects/create" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <div className="text-2xl mb-2">?</div>
            <div className="font-medium">Create Project</div>
          </Link>
          <Link to="/projects" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <div className="text-2xl mb-2">??</div>
            <div className="font-medium">Browse Projects</div>
          </Link>
          <Link to="/proposals" className="p-4 border rounded-lg hover:bg-gray-50 text-center">
            <div className="text-2xl mb-2">???</div>
            <div className="font-medium">View Proposals</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
