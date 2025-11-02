import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Decentralized Milestone-Based Funding
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Fund projects with confidence. Our platform uses blockchain smart contracts to ensure
          accountability through milestone-based fund releases verified by decentralized governance.
        </p>
        <div className="flex justify-center space-x-4">
          {isConnected ? (
            <>
              <Link
                to="/projects/create"
                className="btn-primary text-lg px-8 py-3"
              >
                Create Project
              </Link>
              <Link
                to="/projects"
                className="btn-secondary text-lg px-8 py-3"
              >
                Browse Projects
              </Link>
            </>
          ) : (
            <p className="text-gray-500">Connect your wallet to get started</p>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-8 mt-16">
        <div className="card text-center">
          <div className="text-4xl mb-4">??</div>
          <h3 className="text-xl font-semibold mb-2">Secure Escrow</h3>
          <p className="text-gray-600">
            Funds are held in smart contract escrow until milestones are verified and approved.
          </p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-4">???</div>
          <h3 className="text-xl font-semibold mb-2">DAO Governance</h3>
          <p className="text-gray-600">
            Token holders vote on milestone completion, ensuring transparency and accountability.
          </p>
        </div>
        <div className="card text-center">
          <div className="text-4xl mb-4">?</div>
          <h3 className="text-xl font-semibold mb-2">Automatic Releases</h3>
          <p className="text-gray-600">
            Once approved, funds are automatically released without intermediaries.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h4 className="font-semibold mb-2">Create Project</h4>
            <p className="text-sm text-gray-600">Set funding goal and define milestones</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h4 className="font-semibold mb-2">Get Funded</h4>
            <p className="text-sm text-gray-600">Donors contribute to reach your goal</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h4 className="font-semibold mb-2">Complete Milestone</h4>
            <p className="text-sm text-gray-600">Submit evidence for milestone completion</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              4
            </div>
            <h4 className="font-semibold mb-2">Get Paid</h4>
            <p className="text-sm text-gray-600">Upon approval, funds are released automatically</p>
          </div>
        </div>
      </div>
    </div>
  )
}
