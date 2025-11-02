import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Vote, ThumbsUp, ThumbsDown, Loader2, Shield } from 'lucide-react';
import { useProposalCount, useProposal, useVote, useExecuteProposal, useHasVoted, useRegisterVoter, useVoterInfo } from '../hooks/useGovernance';
import { formatEther, getProposalStatusText } from '../lib/utils';
import toast from 'react-hot-toast';

export function Governance() {
  const { address, isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState('0.1');

  const { data: proposalCount } = useProposalCount();
  const { data: voterInfo } = useVoterInfo(address);
  const { register, isPending: isRegistering, isSuccess: isRegisterSuccess } = useRegisterVoter();
  const { vote, isPending: isVoting, isSuccess: isVoteSuccess } = useVote();
  const { execute, isPending: isExecuting } = useExecuteProposal();

  const voter = voterInfo as any;
  const isRegistered = voter?.isRegistered || false;

  // Show success toasts
  if (isRegisterSuccess) {
    toast.success('Successfully registered as voter!');
  }
  if (isVoteSuccess) {
    toast.success('Vote submitted successfully!');
  }

  const handleRegister = () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid stake amount');
      return;
    }

    register(BigInt(Math.floor(amount * 1e18)));
  };

  const handleVote = (proposalId: number, inFavor: boolean) => {
    if (!isRegistered) {
      toast.error('You must be a registered voter');
      return;
    }
    vote(proposalId, inFavor);
  };

  const handleExecute = (proposalId: number) => {
    execute(proposalId);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Governance
        </h1>
        <p className="text-lg text-gray-600">
          Vote on milestone completion proposals
        </p>
      </div>

      {/* Voter Registration */}
      {!isRegistered && isConnected && (
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-start gap-4">
            <Shield className="w-12 h-12 text-primary flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Register as a Voter
              </h3>
              <p className="text-gray-600 mb-4">
                Stake ETH to participate in governance voting. Your voting power is based on your stake and reputation.
              </p>
              <div className="flex gap-3">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.1"
                  className="input max-w-xs"
                />
                <button
                  onClick={handleRegister}
                  disabled={isRegistering}
                  className="btn-primary"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voter Stats */}
      {isRegistered && voter && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Your Stake</div>
            <div className="text-2xl font-bold text-primary">
              {formatEther(voter.stakedAmount, 4)} ETH
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Reputation</div>
            <div className="text-2xl font-bold text-gray-900">
              {Number(voter.reputation)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600 mb-1">Proposals Voted</div>
            <div className="text-2xl font-bold text-gray-900">
              {Number(voter.proposalCount)}
            </div>
          </div>
        </div>
      )}

      {/* Proposals */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Active Proposals
        </h2>

        {proposalCount && Number(proposalCount) > 0 ? (
          <div className="space-y-4">
            {Array.from({ length: Number(proposalCount) }, (_, i) => (
              <ProposalCard
                key={i}
                proposalId={i}
                userAddress={address}
                isRegistered={isRegistered}
                onVote={handleVote}
                onExecute={handleExecute}
                isVoting={isVoting}
                isExecuting={isExecuting}
              /> as any
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Vote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Active Proposals
            </h3>
            <p className="text-gray-600">
              Check back later for milestone completion proposals to vote on.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Proposal Card Component
function ProposalCard({
  proposalId,
  userAddress,
  isRegistered,
  onVote,
  onExecute,
  isVoting,
  isExecuting,
}: {
  proposalId: number;
  userAddress?: `0x${string}`;
  isRegistered: boolean;
  onVote: (id: number, inFavor: boolean) => void;
  onExecute: (id: number) => void;
  isVoting: boolean;
  isExecuting: boolean;
}) {
  const { data: proposal } = useProposal(proposalId);
  const { data: hasVoted } = useHasVoted(proposalId, userAddress);

  const prop = proposal as any;
  
  if (!prop || prop.id === undefined) return null;

  const totalVotes = prop.votesFor + prop.votesAgainst;
  const votesForPercentage = totalVotes > 0n ? Number((prop.votesFor * 100n) / totalVotes) : 0;
  const statusText = getProposalStatusText(prop.status);
  const isActive = prop.status === 1;
  const votingEnded = Date.now() / 1000 > Number(prop.endTime);

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            Milestone {Number(prop.stageIndex) + 1} Completion
          </h3>
          <p className="text-sm text-gray-600">
            Proposal #{prop.id.toString()}
          </p>
        </div>
        <span className={`badge ${
          statusText === 'Active' ? 'badge-primary' :
          statusText === 'Approved' ? 'badge-success' :
          statusText === 'Rejected' ? 'badge-danger' :
          'badge'
        }`}>
          {statusText}
        </span>
      </div>

      {/* Evidence */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-1">Evidence (IPFS)</div>
        <div className="font-mono text-sm text-gray-900 truncate">
          {prop.evidenceHash}
        </div>
      </div>

      {/* Votes */}
      <div className="space-y-3 mb-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">For: {formatEther(prop.votesFor, 2)} ETH</span>
            <span className="text-gray-600">{votesForPercentage.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${votesForPercentage}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Against: {formatEther(prop.votesAgainst, 2)} ETH</span>
            <span className="text-gray-600">{(100 - votesForPercentage).toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-danger transition-all"
              style={{ width: `${100 - votesForPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {isActive && !hasVoted && isRegistered && !votingEnded && (
          <>
            <button
              onClick={() => onVote(proposalId, true)}
              disabled={isVoting}
              className="btn-primary flex-1"
            >
              <ThumbsUp className="w-4 h-4" />
              Vote For
            </button>
            <button
              onClick={() => onVote(proposalId, false)}
              disabled={isVoting}
              className="btn-danger flex-1"
            >
              <ThumbsDown className="w-4 h-4" />
              Vote Against
            </button>
          </>
        )}
        {hasVoted && (
          <div className="flex-1 text-center py-2 bg-primary-50 text-primary-700 rounded-lg font-medium">
            You have voted
          </div> as any
        )}
        {votingEnded && isActive && (
          <button
            onClick={() => onExecute(proposalId)}
            disabled={isExecuting}
            className="btn-primary flex-1"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </>
            ) : (
              'Execute Proposal'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
