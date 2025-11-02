import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Heart, Share2, AlertCircle, Loader2 } from 'lucide-react';
import { ProgressBar } from '../components/ProgressBar';
import { MilestoneTimeline } from '../components/MilestoneTimeline';
import { useEscrowStatus, useDonate, useUserContribution, useRefund } from '../hooks/useEscrow';
import { formatEther, formatTimeRemaining, parseEtherSafe, calculatePercentage } from '../lib/utils';
import toast from 'react-hot-toast';

export function ProjectDetail() {
  const { address: projectAddress } = useParams<{ address: string }>();
  const { address: userAddress, isConnected } = useAccount();
  const [donationAmount, setDonationAmount] = useState('');

  const { data: projectStatus, isLoading } = useEscrowStatus(projectAddress as `0x${string}`);
  const { data: userContribution } = useUserContribution(userAddress, projectAddress as `0x${string}`);
  const { donate, isPending, isConfirming, isSuccess } = useDonate();
  const { refund, isPending: isRefunding, isSuccess: isRefundSuccess } = useRefund();

  // Show success toast
  if (isSuccess) {
    toast.success('Donation successful!');
  }
  if (isRefundSuccess) {
    toast.success('Refund successful!');
  }

  const handleDonate = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    
    const amount = parseEtherSafe(donationAmount);
    if (amount === 0n) {
      toast.error('Please enter a valid amount');
      return;
    }

    donate(amount, projectAddress as `0x${string}`);
    setDonationAmount('');
  };

  const handleRefund = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    refund(projectAddress as `0x${string}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!projectStatus) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Project Not Found
        </h2>
        <p className="text-gray-600">
          This project address doesn't exist or contracts are not deployed.
        </p>
      </div>
    );
  }

  const status = projectStatus as any;
  const percentage = calculatePercentage(status._fundsRaised, status._fundingGoal);
  const canRefund = !status._fundingGoalReached || status._projectCancelled;
  
  // Create milestones (in production, fetch from contract or backend)
  const milestones = Array.from({ length: Number(status._totalStages) }, (_, i) => ({
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
              Sample Project
            </h1>
            <p className="text-gray-600">
              Milestone-based funding platform demonstration
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
            Stage {Number(status._currentStage) + 1} of {Number(status._totalStages)}
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
              <p className="text-gray-600">
                This is a demonstration project showcasing the milestone-based decentralized funding platform.
                In a production environment, this would include the full project description, images, videos, and detailed information about each milestone.
              </p>
              <p className="text-gray-600 mt-4">
                The project uses smart contracts to ensure funds are only released upon verified completion of each milestone, as determined by DAO governance voting.
              </p>
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
                disabled={!isConnected || isPending || isConfirming || status._projectCancelled}
                className="btn-primary w-full"
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
