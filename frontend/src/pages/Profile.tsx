import { useAccount } from 'wagmi';
import { Wallet, TrendingUp, Vote, AlertCircle } from 'lucide-react';
import { useVoterInfo, useTotalStaked } from '../hooks/useGovernance';
import { useUserContribution } from '../hooks/useEscrow';
import { CONTRACTS } from '../contracts/addresses';
import { formatEther, formatAddress } from '../lib/utils';
import { getOffChainVoterInfo, isOffChainVoterRegistered } from '../lib/voterStorage';

export function Profile() {
  const { address, isConnected } = useAccount();
  const { data: voterInfo } = useVoterInfo(address);
  const { data: totalStaked } = useTotalStaked();
  const { data: userContribution } = useUserContribution(address, CONTRACTS.FUNDING_ESCROW);

  // Check off-chain voter registration (for testing)
  const offChainVoter = address ? getOffChainVoterInfo(address) : null;
  const onChainVoter = voterInfo as any;
  
  // Use off-chain data if available, otherwise on-chain
  const voter = offChainVoter || onChainVoter;
  const contribution = userContribution as any;
  
  if (!isConnected) {
    return (
      <div className="card text-center py-12">
        <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600">
          Please connect your wallet to view your profile
        </p>
      </div>
    );
  }

  const isVoter = isOffChainVoterRegistered(address) || voter?.isRegistered || false;
  const votingPower = isVoter && voter
    ? (offChainVoter 
        ? (Number(offChainVoter.stakeAmount) + (offChainVoter.reputation * 1e18 / 100))
        : (Number(voter.stakedAmount || 0) + (Number(voter.reputation || 0) * 1e18 / 100))
      )
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {address?.[2]?.toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {formatAddress(address!)}
            </h1>
            <p className="text-gray-600">Your Profile</p>
          </div>
        </div>

        {/* Account Info */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Wallet className="w-4 h-4" />
              Wallet Address
            </div>
            <div className="font-mono text-sm text-gray-900 truncate">
              {address}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Vote className="w-4 h-4" />
              Voter Status
            </div>
            <div className="font-medium text-gray-900">
              {isVoter ? (
                <span className="text-success">Registered</span>
              ) : (
                <span className="text-gray-500">Not Registered</span>
              )}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Total Contributed
            </div>
            <div className="font-bold text-gray-900">
              {contribution ? formatEther(BigInt(contribution), 4) : '0'} ETH
            </div>
          </div>
        </div>
      </div>

      {/* Governance Stats */}
      {isVoter && voter && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Governance Stats
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Staked Amount</div>
              <div className="text-2xl font-bold text-primary">
                {offChainVoter 
                  ? formatEther(BigInt(offChainVoter.stakeAmount), 4)
                  : formatEther(BigInt(voter.stakedAmount || 0), 4)
                } ETH
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Reputation</div>
              <div className="text-2xl font-bold text-gray-900">
                {offChainVoter 
                  ? offChainVoter.reputation 
                  : Number(voter.reputation || 0)
                }
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Voting Power</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatEther(BigInt(Math.floor(votingPower)), 4)} ETH
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Proposals Voted</div>
              <div className="text-2xl font-bold text-gray-900">
                {offChainVoter ? 0 : Number(voter.proposalCount || 0)}
              </div>
            </div>
          </div>

          {totalStaked && (
            <div className="mt-6 p-4 bg-primary-50 rounded-lg">
              <div className="text-sm text-primary-700 mb-1">Your Stake Share</div>
              <div className="text-xl font-bold text-primary">
                {(offChainVoter 
                    ? Number(offChainVoter.stakeAmount) 
                    : Number(voter.stakedAmount || 0)
                  ) > 0
                  ? (((offChainVoter 
                        ? Number(offChainVoter.stakeAmount) 
                        : Number(voter.stakedAmount || 0)
                      ) / Number(totalStaked as any)) * 100).toFixed(2)
                  : '0'}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Projects Supported */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Projects Supported
        </h2>
        {contribution && BigInt(contribution) > 0n ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-semibold text-gray-900">Sample Project</h4>
                <p className="text-sm text-gray-600">{CONTRACTS.FUNDING_ESCROW}</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">
                  {formatEther(BigInt(contribution), 4)} ETH
                </div>
                <div className="text-sm text-gray-600">Contributed</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>You haven't supported any projects yet</p>
          </div>
        )}
      </div>

      {/* Call to Action */}
      {!isVoter && (
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Become a Governance Voter
          </h3>
          <p className="text-gray-600 mb-4">
            Stake ETH to participate in milestone verification and earn reputation rewards
          </p>
          <a href="/governance" className="btn-primary">
            Register Now
          </a>
        </div>
      )}
    </div>
  );
}
