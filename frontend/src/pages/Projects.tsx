import { ProjectCard } from '../components/ProjectCard';
import { Search, Filter } from 'lucide-react';
import { CONTRACTS } from '../contracts/addresses';
import { useEscrowStatus } from '../hooks/useEscrow';

export function Projects() {
  // For now, showing the main contract as an example
  // In production, you'd fetch all project contracts from an indexer or backend
  const { data: projectStatus } = useEscrowStatus();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Explore Projects
        </h1>
        <p className="text-lg text-gray-600">
          Discover and support milestone-based projects
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="input pl-10"
            />
          </div>
          <button className="btn-secondary">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectStatus && (projectStatus as any)._fundsRaised !== undefined && (
          <ProjectCard
            address={CONTRACTS.FUNDING_ESCROW}
            title="Sample Project"
            description="This is a demo project showcasing the milestone-based funding platform. In production, multiple projects would be displayed here."
            fundsRaised={(projectStatus as any)._fundsRaised}
            fundingGoal={(projectStatus as any)._fundingGoal}
            timeRemaining={(projectStatus as any)._timeRemaining}
            currentStage={Number((projectStatus as any)._currentStage)}
            totalStages={Number((projectStatus as any)._totalStages)}
          /> as any
        )}

        {/* Empty State */}
        {!projectStatus && (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">??</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Projects Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Connect your wallet and check back later for active projects.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
