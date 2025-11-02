import { useState, useEffect } from 'react';
import { ProjectCard } from '../components/ProjectCard';
import { Search, Filter, AlertCircle } from 'lucide-react';
import { getAllProjects, type Project } from '../lib/projectStorage';
import { getAllProjects as getBackendProjects, type BackendProject, checkBackendHealth } from '../lib/api';
import { formatEther } from '../lib/utils';
import { getIPFSUrl } from '../lib/ipfs';
import toast from 'react-hot-toast';

// Convert backend project to frontend format
function convertBackendProject(backendProject: BackendProject): Project {
  return {
    id: backendProject.id.toString(),
    contractAddress: backendProject.contract_address as `0x${string}`,
    ownerAddress: backendProject.owner_address as `0x${string}`,
    title: backendProject.title,
    description: backendProject.description,
    category: backendProject.category,
    imageUrl: backendProject.image_url,
    fundingGoal: backendProject.funding_goal,
    fundingDeadline: backendProject.funding_deadline,
    totalStages: backendProject.total_stages,
    status: backendProject.status as 'active' | 'funded' | 'cancelled' | 'completed',
    createdAt: new Date(backendProject.created_at).getTime(),
    milestones: (backendProject.milestones || []).map(m => ({
      stageIndex: m.stage_index,
      title: m.title,
      description: m.description,
      allocationPercentage: m.allocation_percentage / 100, // Convert from basis points
    })),
  };
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      
      try {
        // First check if backend is available
        const backendHealth = await checkBackendHealth();
        setIsBackendAvailable(backendHealth);
        
        if (backendHealth) {
          // Try to fetch from backend API (shared database - visible to all users)
          const apiResponse = await getBackendProjects();
          
          if (apiResponse.success && apiResponse.data) {
            // Convert backend projects to frontend format
            const backendProjects = apiResponse.data.map(convertBackendProject);
            setProjects(backendProjects);
            
            // Also merge with localStorage projects (fallback for development)
            const localProjects = getAllProjects();
            const allProjects = [...backendProjects, ...localProjects];
            
            // Remove duplicates by contract address
            const uniqueProjects = allProjects.filter((project, index, self) =>
              index === self.findIndex(p => p.contractAddress.toLowerCase() === project.contractAddress.toLowerCase())
            );
            
            setProjects(uniqueProjects);
            return;
          }
        }
        
        // Backend unavailable or failed - fall back to localStorage
        console.warn('Backend API unavailable, using localStorage projects');
        const localProjects = getAllProjects();
        setProjects(localProjects);
        
        if (localProjects.length > 0) {
          toast('Backend unavailable - showing locally stored projects only', { 
            icon: '⚠️',
            duration: 5000,
          });
        }
      } catch (error: any) {
        console.error('Error loading projects:', error);
        // Fall back to localStorage
        const localProjects = getAllProjects();
        setProjects(localProjects);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProjects();
    
    // Also listen for storage changes (for localStorage projects)
    const handleStorageChange = async () => {
      // Reload projects if backend is available
      if (isBackendAvailable) {
        await loadProjects();
      } else {
        // Just reload from localStorage
        const localProjects = getAllProjects();
        setProjects(localProjects);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, [isBackendAvailable]);

  // Filter projects
  const filteredProjects = projects.filter(project => {
    const matchesSearch = searchTerm === '' || 
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === '' || project.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(projects.map(p => p.category)));

  // Calculate time remaining
  const getTimeRemaining = (deadline: string) => {
    const now = Math.floor(Date.now() / 1000);
    const deadlineNum = parseInt(deadline);
    const remaining = deadlineNum - now;
    
    if (remaining <= 0) return 0;
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    
    return days * 24 + hours; // Return hours remaining
  };

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

      {/* Backend Status Warning */}
      {isBackendAvailable === false && (
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="w-5 h-5" />
            <div className="flex-1">
              <strong>Backend API Not Available</strong>
              <p className="text-sm text-yellow-600 mt-1">
                Projects are being stored locally. To make projects visible to all users, start the backend server:
              </p>
              <code className="bg-yellow-100 px-2 py-1 rounded text-xs block mt-2">
                cd backend && npm run dev
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {categories.length > 0 && (
            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          )}
          <button className="btn-secondary">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-gray-600">Loading projects...</p>
          </div>
        ) : filteredProjects.length > 0 ? (
          filteredProjects
            .filter((project) => {
              // Get contract address - backend uses contract_address, frontend might use contractAddress
              const contractAddr = project.contractAddress || project.contract_address;
              
              // Validate contract address - must be a valid Ethereum address and not the governance address
              const isValidAddr = contractAddr && 
                contractAddr !== '0x0000000000000000000000000000000000000000' &&
                contractAddr !== '0x5fbdb2315678afecb367f032d93f642f64180aa3' && // Hardhat default governance address
                /^0x[a-fA-F0-9]{40}$/i.test(contractAddr);
              
              // Only log warning once per project (use useMemo or reduce logging)
              if (!isValidAddr && typeof window !== 'undefined') {
                const warningKey = `invalid_addr_${project.id}`;
                if (!sessionStorage.getItem(warningKey)) {
                  console.warn(`⚠️ Project ${project.id} (${project.title}) has invalid contract address: ${contractAddr || 'undefined'}`);
                  sessionStorage.setItem(warningKey, 'true');
                }
              }
              
              return isValidAddr;
            })
            .map((project) => {
              // Convert IPFS hash to URL if needed
              let imageUrl = project.imageUrl;
              if (imageUrl && (imageUrl.startsWith('Qm') || imageUrl.startsWith('b') || imageUrl.includes('ipfs'))) {
                imageUrl = getIPFSUrl(imageUrl);
              }
              
              // Get contract address - backend uses contract_address, frontend might use contractAddress
              const contractAddr = project.contractAddress || project.contract_address;
            
              return (
                <ProjectCard
                  key={project.id}
                  address={contractAddr}
                  title={project.title}
                  description={project.description}
                  fundsRaised={0n} // TODO: Get from contract
                  fundingGoal={BigInt(project.fundingGoal)}
                  timeRemaining={getTimeRemaining(project.fundingDeadline)}
                  currentStage={0} // TODO: Get from contract
                  totalStages={project.totalStages}
                  imageUrl={imageUrl}
                  category={project.category}
                />
              );
            })
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {projects.length === 0 ? 'No Projects Yet' : 'No Projects Match Your Search'}
            </h3>
            <p className="text-gray-600 mb-6">
              {projects.length === 0
                ? 'Be the first to create a project and start your funding campaign!'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {projects.length === 0 && (
              <a href="/projects/create" className="btn-primary">
                Create Your First Project
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
