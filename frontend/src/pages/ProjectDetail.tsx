import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Heart, Share2, AlertCircle, Loader2 } from 'lucide-react';
import { ProgressBar } from '../components/ProgressBar';
import { MilestoneTimeline } from '../components/MilestoneTimeline';
import { useEscrowStatus, useDonate, useUserContribution, useRefund } from '../hooks/useEscrow';
import { formatEther, formatTimeRemaining, parseEtherSafe, calculatePercentage } from '../lib/utils';
import { getProjectByAddress, type BackendProject } from '../lib/api';
import { getProjectById, type Project } from '../lib/projectStorage';
import toast from 'react-hot-toast';

export function ProjectDetail() {
  const { address: projectAddress } = useParams<{ address: string }>();
  const { address: userAddress, isConnected } = useAccount();
  const [donationAmount, setDonationAmount] = useState('');
  const [projectData, setProjectData] = useState<Project | BackendProject | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  // Load project data from backend or localStorage
  useEffect(() => {
    const loadProject = async () => {
      if (!projectAddress) return;
      
      setIsLoadingProject(true);
      
      // Try backend first
      try {
        const apiResponse = await getProjectByAddress(projectAddress);
        if (apiResponse.success && apiResponse.data) {
          console.log('✅ Project loaded from backend:', apiResponse.data.title);
          console.log('   Contract Address:', apiResponse.data.contract_address);
          setProjectData(apiResponse.data);
          setIsLoadingProject(false);
          return;
        }
      } catch (error) {
        console.warn('Backend fetch failed, trying localStorage:', error);
      }
      
      // Fallback to localStorage
      const localProject = getProjectById(projectAddress);
      if (localProject) {
        console.log('✅ Project loaded from localStorage:', localProject.title);
        setProjectData(localProject);
      }
      
      setIsLoadingProject(false);
    };
    
    loadProject();
  }, [projectAddress]);

  // Get contract address from project data (use projectAddress from URL as fallback)
  const contractAddress = projectData 
    ? ((projectData as any).contractAddress || (projectData as any).contract_address || projectAddress) as `0x${string}`
    : (projectAddress as `0x${string}`);
  
  // Debug logging
  useEffect(() => {
    if (contractAddress && projectData) {
      console.log('🔍 ProjectDetail - Contract Address Check:');
      console.log('   URL param:', projectAddress);
      console.log('   From projectData:', (projectData as any).contract_address || (projectData as any).contractAddress);
      console.log('   Final contractAddress:', contractAddress);
    }
  }, [contractAddress, projectAddress, projectData]);
  
  // Only try to read from contract if we have a valid address and it's not a mock/governance address
  const isValidContractAddress = contractAddress && 
    contractAddress !== '0x0000000000000000000000000000000000000000' &&
    contractAddress !== '0x5fbdb2315678afecb367f032d93f642f64180aa3' && // Hardhat default governance address (NOT FundingEscrow)
    !contractAddress.match(/^0x[0]{38}[1-9a-f]/i) && // Not all zeros except last char
    contractAddress.match(/^0x[a-fA-F0-9]{40}$/); // Valid Ethereum address format
  
  // Track if project exists in database (means contract was deployed)
  const [projectExistsInDB, setProjectExistsInDB] = useState<boolean>(false);
  
  // Update projectExistsInDB when projectData loads
  useEffect(() => {
    if (projectData) {
      console.log('✅ Project found in database - contract should be deployed');
      setProjectExistsInDB(true);
    } else {
      setProjectExistsInDB(false);
    }
  }, [projectData]);
  
  const { data: projectStatus, isLoading: isLoadingContract, error: contractError } = useEscrowStatus(
    isValidContractAddress ? contractAddress : undefined
  );
  
  // Debug logging for contract status - but don't spam console
  useEffect(() => {
    if (isValidContractAddress && contractAddress) {
      if (projectStatus) {
        // Viem returns tuple as array or object, log raw structure
        console.log('✅ Contract status loaded from chain (raw):', projectStatus);
        console.log('✅ Contract status structure:', {
          type: Array.isArray(projectStatus) ? 'array' : typeof projectStatus,
          length: Array.isArray(projectStatus) ? projectStatus.length : 'N/A',
          keys: Array.isArray(projectStatus) ? null : Object.keys(projectStatus || {}),
        });
      }
      if (contractError && !projectExistsInDB) {
        // Only log error if project doesn't exist in DB
        // If project exists in DB, the error is non-blocking
        console.warn('⚠️ Contract read error:', contractError.message);
      }
    }
  }, [projectStatus, contractError, isValidContractAddress, contractAddress, projectExistsInDB]);
  
  // Only consider contract invalid if we have a definitive error AND project doesn't exist in DB
  // If project exists in DB, trust that contract is deployed (allow donations even if read fails)
  const isInvalidContract = contractError && !projectExistsInDB && (
    contractError.message?.includes('returned no data') ||
    contractError.message?.includes('not a contract') ||
    contractError.message?.includes('execution reverted') ||
    contractError.message?.includes('function selector was not recognized')
  );
  
  const { data: userContribution } = useUserContribution(
    userAddress, 
    isValidContractAddress ? contractAddress : undefined
  );
  const { donate, isPending, isConfirming, isSuccess } = useDonate();
  const { refund, isPending: isRefunding, isSuccess: isRefundSuccess } = useRefund();
  
  const isLoading = isLoadingProject || (isValidContractAddress && isLoadingContract);

  // Show success toast
  if (isSuccess) {
    toast.success('Donation successful!');
  }
  if (isRefundSuccess) {
    toast.success('Refund successful!');
  }

  const handleDonate = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    
    const amount = parseEtherSafe(donationAmount);
    if (amount === 0n) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!isValidContractAddress) {
      toast.error('Invalid contract address - cannot donate');
      return;
    }
    
    try {
      await donate(amount, contractAddress);
      setDonationAmount('');
      toast.success('Donation transaction submitted!');
    } catch (error: any) {
      console.error('Donation error:', error);
      toast.error(error?.message || 'Donation failed. Please try again.');
    }
  };

  const handleRefund = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!isValidContractAddress) {
      toast.error('Invalid contract address - cannot refund');
      return;
    }
    refund(contractAddress);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show project data even if contract not deployed (for newly created projects)
  if (isLoadingProject) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Project Not Found
        </h2>
        <p className="text-gray-600">
          This project address doesn't exist in our database.
        </p>
      </div>
    );
  }

  // Use contract data if available, otherwise use project data from database
  // If project exists in DB, we trust it and allow donations even if contract read fails
  // Viem returns tuples as arrays: [fundsRaised, fundingGoal, currentStage, totalStages, fundingGoalReached, projectCancelled, timeRemaining]
  let status: any;
  
  if (projectStatus) {
    // Handle tuple return - Viem returns as array or object with named properties
    const statusData = projectStatus as any;
    
    if (Array.isArray(statusData)) {
      // Tuple returned as array: [fundsRaised, fundingGoal, currentStage, totalStages, fundingGoalReached, projectCancelled, timeRemaining]
      status = {
        _fundsRaised: statusData[0] != null ? statusData[0] : 0n,
        _fundingGoal: statusData[1] != null ? statusData[1] : 0n,
        _currentStage: statusData[2] != null ? Number(statusData[2]) : 0,
        _totalStages: statusData[3] != null ? Number(statusData[3]) : 0,
        _fundingGoalReached: statusData[4] != null ? Boolean(statusData[4]) : false,
        _projectCancelled: statusData[5] != null ? Boolean(statusData[5]) : false,
        _timeRemaining: statusData[6] != null ? statusData[6] : 0n,
      };
    } else {
      // Tuple returned as object with named properties
      status = {
        _fundsRaised: statusData._fundsRaised != null ? statusData._fundsRaised : (statusData[0] != null ? statusData[0] : 0n),
        _fundingGoal: statusData._fundingGoal != null ? statusData._fundingGoal : (statusData[1] != null ? statusData[1] : 0n),
        _currentStage: statusData._currentStage != null ? Number(statusData._currentStage) : (statusData[2] != null ? Number(statusData[2]) : 0),
        _totalStages: statusData._totalStages != null ? Number(statusData._totalStages) : (statusData[3] != null ? Number(statusData[3]) : 0),
        _fundingGoalReached: statusData._fundingGoalReached != null ? Boolean(statusData._fundingGoalReached) : (statusData[4] != null ? Boolean(statusData[4]) : false),
        _projectCancelled: statusData._projectCancelled != null ? Boolean(statusData._projectCancelled) : (statusData[5] != null ? Boolean(statusData[5]) : false),
        _timeRemaining: statusData._timeRemaining != null ? statusData._timeRemaining : (statusData[6] != null ? statusData[6] : 0n),
      };
    }
  } else {
    // Fallback to database values
    status = {
      _fundsRaised: 0n,
      _fundingGoal: BigInt((projectData as any)?.fundingGoal || (projectData as any)?.funding_goal || '0'),
      _currentStage: 0,
      _totalStages: (projectData as any)?.totalStages || (projectData as any)?.total_stages || 0,
      _fundingGoalReached: false,
      _projectCancelled: false,
      _timeRemaining: BigInt(Math.max(0, parseInt((projectData as any)?.fundingDeadline || (projectData as any)?.funding_deadline || '0') - Math.floor(Date.now() / 1000))),
    };
  }
  
  // If project exists in database, we can enable donations even without contract status
  // The contract read is optional - if it fails, we still trust the database
  const canDonate = projectExistsInDB && isValidContractAddress && !status._projectCancelled;
  
  // Get project title/description from loaded data
  const projectTitle = (projectData as any).title || 'Project';
  const projectDescription = (projectData as any).description || (projectData as any).description || '';
  const projectMilestones = (projectData as any).milestones || [];
  // Calculate percentage - handle all types safely
  const percentage = calculatePercentage(status._fundsRaised, status._fundingGoal);
  const canRefund = !status._fundingGoalReached || status._projectCancelled;
  
  // Use milestones from project data if available, otherwise create generic ones
  const milestones = projectMilestones.length > 0
    ? projectMilestones.map((m: any, i: number) => ({
        stage: i,
        name: m.title || `Milestone ${i + 1}`,
        allocation: m.allocationPercentage || (m.allocation_percentage ? m.allocation_percentage / 100 : 100 / Number(status._totalStages)),
        completed: i < Number(status._currentStage),
        description: m.description || '',
      }))
    : Array.from({ length: Number(status._totalStages) }, (_, i) => ({
        stage: i,
        name: `Milestone ${i + 1}`,
        allocation: 100 / Number(status._totalStages),
        completed: i < Number(status._currentStage),
      }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {projectTitle}
            </h1>
            <p className="text-gray-600">
              {projectDescription || 'Milestone-based funding project'}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="btn-secondary">
              <Heart className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-baseline mb-3">
            <div>
              <span className="text-3xl font-bold text-gray-900">
                {formatEther(status._fundsRaised, 2)} ETH
              </span>
              <span className="text-gray-500 ml-2">
                raised of {formatEther(status._fundingGoal, 2)} ETH goal
              </span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">
                {formatTimeRemaining(status._timeRemaining)}
              </div>
            </div>
          </div>
          <ProgressBar
            current={Number(status._fundsRaised)}
            total={Number(status._fundingGoal)}
            showPercentage={false}
            size="lg"
          />
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 flex-wrap">
          {status._fundingGoalReached && (
            <span className="badge-success">Goal Reached</span>
          )}
          {status._projectCancelled && (
            <span className="badge-danger">Cancelled</span>
          )}
          <span className="badge-primary">
            Stage {isNaN(Number(status._currentStage)) ? 1 : Number(status._currentStage) + 1} of {isNaN(Number(status._totalStages)) ? '?' : Number(status._totalStages)}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              About This Project
            </h2>
            <div className="prose max-w-none">
              <p className="text-gray-600 whitespace-pre-wrap">
                {projectDescription || 'No description available.'}
              </p>
              {!isValidContractAddress && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>Invalid Contract Address:</strong> This project doesn't have a valid contract address. 
                    Donations and staking are not available.
                  </p>
                </div>
              )}
              {/* Show warning only if project exists in DB but contract read fails (likely Hardhat reset) */}
              {projectExistsInDB && isValidContractAddress && !projectStatus && contractError && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm font-semibold mb-2">
                    ⚠️ Contract Read Error (Non-Blocking)
                  </p>
                  <p className="text-yellow-700 text-sm mb-2">
                    Project exists in database (contract was deployed), but having trouble reading from chain.
                    This may be due to Hardhat node reset or network issues.
                  </p>
                  <p className="text-yellow-600 text-xs mb-2">
                    <strong>Contract Address:</strong> {contractAddress}
                  </p>
                  <p className="text-gray-600 text-xs">
                    💡 <strong>Note:</strong> Donations are still enabled since project exists in database. 
                    If Hardhat was reset, you may need to restart the Hardhat node.
                  </p>
                </div>
              )}
              
              {/* Show error only if project doesn't exist in DB AND contract is invalid */}
              {!projectExistsInDB && isValidContractAddress && isInvalidContract && contractError && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800 text-sm font-semibold mb-2">
                    ⚠️ Contract Not Deployed
                  </p>
                  <p className="text-orange-700 text-sm mb-2">
                    This project doesn't exist in database and contract is not deployed.
                  </p>
                  <p className="text-orange-600 text-xs mb-2">
                    <strong>Contract Address:</strong> {contractAddress}
                  </p>
                  <div className="text-gray-700 text-xs mt-3 space-y-1">
                    <p><strong>Solutions:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                      <li>Create a new project - it will automatically deploy a fresh contract</li>
                      <li>If you need to preserve this project, deploy a new contract manually and update the project's contract address</li>
                    </ul>
                  </div>
                </div>
              )}
              {isValidContractAddress && !projectStatus && contractError && !isInvalidContract && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ <strong>Connection Error:</strong> {contractError.message || 'Unable to connect to contract. Make sure the Hardhat node is running.'}
                  </p>
                  <p className="text-yellow-600 text-xs mt-1">
                    Contract Address: {contractAddress}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Milestones */}
          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Milestone Timeline
            </h2>
            <MilestoneTimeline 
              milestones={milestones}
              currentStage={Number(status._currentStage)}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Donation Card */}
          <div className="card sticky top-20">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Support This Project
            </h3>

            {userContribution && BigInt(userContribution as any) > 0n && (
              <div className="bg-primary-50 text-primary-700 p-3 rounded-lg mb-4 text-sm">
                You've contributed: {formatEther(BigInt(userContribution as any), 4)} ETH
              </div> as any
            )}

            <div className="space-y-4">
              <div>
                <label className="label">Donation Amount (ETH)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.1"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="input"
                  disabled={!isConnected}
                />
              </div>

              <button
                onClick={handleDonate}
                disabled={
                  !isConnected || 
                  isPending || 
                  isConfirming || 
                  status._projectCancelled || 
                  !canDonate || // Use canDonate which checks DB existence
                  !isValidContractAddress // Disable if address is invalid
                }
                className="btn-primary w-full"
                title={
                  !isConnected
                    ? 'Connect your wallet to donate'
                    : !isValidContractAddress 
                    ? 'Invalid contract address' 
                    : !projectExistsInDB
                    ? 'Project not found in database - contract may not be deployed'
                    : status._projectCancelled
                    ? 'Project has been cancelled'
                    : ''
                }
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isPending ? 'Confirming...' : 'Processing...'}
                  </>
                ) : (
                  'Donate Now'
                )}
              </button>

              {canRefund && userContribution && BigInt(userContribution as any) > 0n && (
                <button
                  onClick={handleRefund}
                  disabled={!isConnected || isRefunding}
                  className="btn-secondary w-full"
                >
                  {isRefunding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Refunding...
                    </>
                  ) : (
                    'Request Refund'
                  )}
                </button>
              )}

              {!isConnected && (
                <p className="text-sm text-gray-500 text-center">
                  Connect your wallet to donate
                </p>
              )}
            </div>
          </div>

          {/* Project Info */}
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-3">Project Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">Contract</dt>
                <dd className="font-medium text-gray-900">
                  {projectAddress?.slice(0, 6)}...{projectAddress?.slice(-4)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Total Stages</dt>
                <dd className="font-medium text-gray-900">
                  {Number(status._totalStages)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Current Stage</dt>
                <dd className="font-medium text-gray-900">
                  {Number(status._currentStage) + 1}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
