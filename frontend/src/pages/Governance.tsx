import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { Vote, ThumbsUp, ThumbsDown, Loader2, Shield, AlertCircle } from 'lucide-react';
import { useProposalCount, useProposal, useVote, useExecuteProposal, useHasVoted, useRegisterVoter, useVoterInfo } from '../hooks/useGovernance';
import { formatEther, getProposalStatusText } from '../lib/utils';
import { CONTRACTS } from '../contracts/addresses';
import { 
  isOffChainVoterRegistered, 
  getOffChainVoterInfo, 
  registerOffChainVoter,
  type OffChainVoter 
} from '../lib/voterStorage';
import toast from 'react-hot-toast';

export function Governance() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [stakeAmount, setStakeAmount] = useState('0.1');
  
  // Refs to track if we've shown the toast for each success
  const hasShownRegisterSuccess = useRef(false);
  const hasShownVoteSuccess = useRef(false);

  const { data: proposalCount } = useProposalCount();
  const { data: voterInfo, refetch: refetchVoterInfo } = useVoterInfo(address);
  const { register, isPending: isRegistering, isSuccess: isRegisterSuccess, error: registerError } = useRegisterVoter();
  const { vote, isPending: isVoting, isSuccess: isVoteSuccess, error: voteError } = useVote();
  const { execute, isPending: isExecuting } = useExecuteProposal();

  // Off-chain voter storage (persists across Hardhat resets)
  const [offChainVoter, setOffChainVoter] = useState<OffChainVoter | null>(null);
  const [isNodeConnected, setIsNodeConnected] = useState<boolean | null>(null);
  const [lastBlockNumber, setLastBlockNumber] = useState<number | null>(null);
  
  // Check Hardhat node connection status and clear cache if block number resets
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const currentBlock = parseInt(data.result, 16);
          
          // If block number decreased (Hardhat reset), clear all caches
          if (lastBlockNumber !== null && currentBlock < lastBlockNumber) {
            console.log('Block number decreased - Hardhat reset detected, clearing caches');
            queryClient.clear(); // Clear all React Query cache
            // Clear wagmi's internal block cache by invalidating all queries
            queryClient.invalidateQueries();
          }
          
          setLastBlockNumber(currentBlock);
          setIsNodeConnected(true);
        } else {
          setIsNodeConnected(false);
        }
      } catch (error) {
        setIsNodeConnected(false);
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 3000); // Check every 3 seconds
    return () => clearInterval(interval);
  }, [lastBlockNumber, queryClient]);
  
  // Check off-chain registration on mount and when address changes
  useEffect(() => {
    if (address) {
      const stored = getOffChainVoterInfo(address);
      setOffChainVoter(stored);
    } else {
      setOffChainVoter(null);
    }
  }, [address]);

  // Combine on-chain and off-chain registration status for display
  // For UI: show registered status if either on-chain or off-chain
  const onChainVoter = voterInfo as any;
  const isOffChainRegistered = isOffChainVoterRegistered(address);
  const isRegistered = isOffChainRegistered || onChainVoter?.isRegistered || false;
  
  // Use off-chain voter data if available, otherwise fall back to on-chain
  const voter = offChainVoter || onChainVoter;
  
  // For testing: Always allow registration (even if already registered)
  // The registration form will always be visible to allow multiple registrations

  // Refs to track if we've shown error toasts
  const hasShownRegisterError = useRef(false);
  const hasShownVoteError = useRef(false);

  // Show success toasts using useEffect (side effect, not during render)
  useEffect(() => {
    if (isRegisterSuccess && !hasShownRegisterSuccess.current && address) {
      // On-chain registration succeeded!
      toast.success('Successfully registered as voter on-chain!');
      hasShownRegisterSuccess.current = true;
      
      // Also save off-chain as backup (for persistence across Hardhat resets)
      const stakeAmountWei = BigInt(Math.floor(parseFloat(stakeAmount) * 1e18));
      const registeredVoter = registerOffChainVoter(address, stakeAmountWei);
      setOffChainVoter(registeredVoter);
      
      // Refresh voter info to update the UI immediately
      setTimeout(() => {
        refetchVoterInfo();
      }, 1000); // Wait 1 second for the transaction to be indexed
    }
    // Reset when registration is no longer successful (new transaction started)
    if (!isRegisterSuccess) {
      hasShownRegisterSuccess.current = false;
    }
  }, [isRegisterSuccess, refetchVoterInfo, address, stakeAmount]);

  // Show error toasts using useEffect
  // In testing mode, we allow registration even if contract fails
  useEffect(() => {
    if (registerError && !hasShownRegisterError.current && address) {
      // Log full error for debugging
      console.error('Registration error details:', registerError);
      
      // Try to extract detailed error message
      let errorMessage = registerError?.message || 'Transaction failed';
      let errorShortMessage = '';
      
      // Try to get the short message from error object
      if (registerError && typeof registerError === 'object') {
        const errorObj = registerError as any;
        errorShortMessage = errorObj?.shortMessage || errorObj?.data?.message || errorObj?.details || '';
        
        // Also check in cause/reason fields
        if (!errorShortMessage && errorObj?.cause) {
          errorShortMessage = errorObj.cause?.message || errorObj.cause?.reason || '';
        }
      }
      
      // Combine messages - check both main error and short message
      const fullError = `${errorMessage}${errorShortMessage ? `: ${errorShortMessage}` : ''}`;
      const combinedError = `${errorMessage} ${errorShortMessage}`.toLowerCase();
      
      let userMessage = 'Registration failed';
      let shouldRegisterOffChain = false;
      
      // Check for specific contract revert reasons (case-insensitive)
      const lowerError = fullError.toLowerCase();
      
      // Check for block tag errors and RPC errors first (most common issues)
      // "Internal JSON-RPC error" often indicates block tag issues when querying non-existent blocks
      // Also check errorShortMessage separately as it may contain the actual error
      const isBlockTagError = lowerError.includes('invalid block tag') || 
                              lowerError.includes('block number') ||
                              lowerError.includes('received invalid block') ||
                              lowerError.includes('latest block number') ||
                              combinedError.includes('invalid block tag') ||
                              combinedError.includes('block number');
      
      const isRPCError = lowerError.includes('internal json-rpc error') || 
                         combinedError.includes('internal json-rpc error') ||
                         (lowerError.includes('internal json-rpc') && lowerError.includes('error')) ||
                         (combinedError.includes('internal json-rpc') && combinedError.includes('error'));
      
      if (isBlockTagError || isRPCError) {
        // Block tag error or RPC error - node might be out of sync, immediately register off-chain
        shouldRegisterOffChain = true;
        userMessage = 'Blockchain node sync issue detected, registering off-chain as backup...';
      } else if (lowerError.includes('already registered') || lowerError.includes('already a registered')) {
        // In testing mode, allow re-registration off-chain
        shouldRegisterOffChain = true;
        userMessage = 'Already registered on-chain, registering off-chain for testing...';
      } else if (lowerError.includes('insufficient stake') || lowerError.includes('insufficient')) {
        userMessage = 'Stake amount must be at least 0.01 ETH';
        shouldRegisterOffChain = false; // Don't register if stake is too low
      } else if (lowerError.includes('user rejected') || lowerError.includes('user cancelled')) {
        userMessage = 'Transaction was cancelled';
        shouldRegisterOffChain = false; // Don't register if user cancelled
      } else if (lowerError.includes('internal json-rpc') || lowerError.includes('revert') || lowerError.includes('connection')) {
        // RPC error or connection issue - fall back to off-chain registration (backup)
        shouldRegisterOffChain = true;
        userMessage = 'On-chain registration failed (RPC error), using off-chain backup...';
      } else {
        // Unknown error - fall back to off-chain registration (backup)
        shouldRegisterOffChain = true;
        userMessage = `On-chain error, using off-chain backup: ${errorShortMessage || fullError.slice(0, 50)}`;
      }
      
      // Register off-chain as backup when on-chain fails
      if (shouldRegisterOffChain) {
        const stakeAmountWei = BigInt(Math.floor(parseFloat(stakeAmount) * 1e18));
        const registeredVoter = registerOffChainVoter(address, stakeAmountWei);
        setOffChainVoter(registeredVoter);
        toast.success(`Registered off-chain as backup! (Registration #${registeredVoter.registrationCount})`);
      } else {
        toast.error(userMessage);
      }
      
      hasShownRegisterError.current = true;
    }
    if (!registerError) {
      hasShownRegisterError.current = false;
    }
  }, [registerError, refetchVoterInfo, isRegistered, address, stakeAmount]);

  useEffect(() => {
    if (voteError && !hasShownVoteError.current) {
      const errorMessage = voteError?.message || 'Transaction failed';
      let userMessage = 'Vote failed';
      
      if (errorMessage.includes('revert') || errorMessage.includes('Internal JSON-RPC')) {
        userMessage = 'Transaction failed. Please check your wallet balance and try again.';
      } else if (errorMessage.includes('user rejected')) {
        userMessage = 'Transaction was cancelled';
      } else {
        userMessage = `Vote failed: ${errorMessage}`;
      }
      
      toast.error(userMessage);
      hasShownVoteError.current = true;
    }
    if (!voteError) {
      hasShownVoteError.current = false;
    }
  }, [voteError]);

  useEffect(() => {
    if (isVoteSuccess && !hasShownVoteSuccess.current) {
      toast.success('Vote submitted successfully!');
      hasShownVoteSuccess.current = true;
    }
    // Reset when vote is no longer successful (new transaction started)
    if (!isVoteSuccess) {
      hasShownVoteSuccess.current = false;
    }
  }, [isVoteSuccess]);

  const handleRegister = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!address) {
      toast.error('Wallet address not available');
      return;
    }
    
    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid stake amount');
      return;
    }

    // Validate minimum stake amount (0.01 ETH)
    if (amount < 0.01) {
      toast.error('Minimum stake amount is 0.01 ETH');
      return;
    }

    const stakeAmountWei = BigInt(Math.floor(amount * 1e18));

    // Primary: Attempt on-chain registration first (this is the main flow)
    // Off-chain registration will only happen as backup if on-chain fails
    if (CONTRACTS.MILESTONE_GOVERNANCE !== '0x0000000000000000000000000000000000000000' && isNodeConnected !== false) {
      // CRITICAL: Clear ALL queries before attempting transaction
      // This prevents wagmi from using cached block number 6 when Hardhat only has block 3
      queryClient.clear();
      queryClient.invalidateQueries();
      
      // Small delay to ensure cache is cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        // Try registration - on localhost this uses direct MetaMask call (bypasses wagmi cache)
        // On other networks it uses wagmi normally
        await register(stakeAmountWei);
        
        // Note: on localhost, register() uses direct MetaMask and returns immediately
        // on other networks, it uses wagmi and returns immediately
        // The success/error handlers below will handle the rest
      } catch (error: any) {
        // If register throws, the error handler useEffect will catch it and register off-chain
        console.error('Registration error (will be handled by error handler):', error);
      }
    } else {
      // No contract deployed or node not connected - register off-chain only
      const registeredVoter = registerOffChainVoter(address, stakeAmountWei);
      setOffChainVoter(registeredVoter);
      toast.success(`Registered off-chain! (Registration #${registeredVoter.registrationCount})`);
    }
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

      {/* Connection Status Warning */}
      {isNodeConnected === false && (
        <div className="card bg-red-50 border-red-200 mb-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <div className="flex-1">
              <strong>Hardhat Node Not Running!</strong>
              <p className="text-sm text-red-600 mt-1">
                The Hardhat blockchain node at localhost:8545 is not accessible. 
                Start it with: <code className="bg-red-100 px-1 rounded">cd blockchain && npx hardhat node</code>
              </p>
              <p className="text-xs text-red-500 mt-1">
                Registration will work off-chain, but on-chain transactions will fail with "Internal JSON-RPC error".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cache Reset Button - For fixing block tag errors */}
      {isConnected && (
        <div className="flex gap-2 justify-end mb-4">
          <button
            onClick={async () => {
              // Clear all caches to fix block tag errors
              queryClient.clear();
              queryClient.invalidateQueries();
              
              // Clear browser storage
              try {
                Object.keys(localStorage).forEach(key => {
                  if (key.includes('wagmi') || key.includes('block') || key.includes('query')) {
                    localStorage.removeItem(key);
                  }
                });
                Object.keys(sessionStorage).forEach(key => {
                  if (key.includes('wagmi') || key.includes('block') || key.includes('query')) {
                    sessionStorage.removeItem(key);
                  }
                });
              } catch (e) {}
              
              // Force MetaMask to sync block number
              if (typeof window !== 'undefined' && (window as any).ethereum) {
                try {
                  await (window as any).ethereum.request({
                    method: 'eth_blockNumber',
                    params: [],
                  });
                  toast.success('Cache cleared & MetaMask synced! Try registering again.');
                } catch (e) {
                  toast.success('Cache cleared! You may need to reset MetaMask account if errors persist.');
                }
              } else {
                toast.success('Cache cleared! Try registering again.');
              }
              
              // Refresh voter info with fresh data
              await refetchVoterInfo();
            }}
            className="btn-secondary text-xs"
          >
            🔄 Clear Cache
          </button>
          <button
            onClick={() => {
              toast(
                <div className="space-y-2">
                  <p className="font-bold">MetaMask Cache Reset Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Open MetaMask extension</li>
                    <li>Click the menu (3 dots)</li>
                    <li>Go to Settings → Advanced</li>
                    <li>Click "Reset Account"</li>
                    <li>Refresh this page and try again</li>
                  </ol>
                  <p className="text-xs text-gray-500 mt-2">
                    This clears MetaMask's cached block number and nonce data.
                  </p>
                </div>,
                { duration: 10000 }
              );
            }}
            className="btn-secondary text-xs bg-orange-100 hover:bg-orange-200"
          >
            📖 Reset MetaMask Instructions
          </button>
        </div>
      )}

      {/* Debug Info - Remove in production */}
      {isConnected && address && (
        <div className="card bg-gray-50 text-xs text-gray-600 p-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>Contract: {CONTRACTS.MILESTONE_GOVERNANCE.slice(0, 10)}...</div>
            <div>Address: {address.slice(0, 10)}...</div>
            <div>Registered: {isRegistered ? 'Yes' : 'No'}</div>
            <div>Source: {offChainVoter ? 'Off-chain' : onChainVoter ? 'On-chain' : 'None'}</div>
            <div>Node: {isNodeConnected === null ? 'Checking...' : isNodeConnected ? '✓ Connected' : '✗ Disconnected'}</div>
            {offChainVoter && (
              <>
                <div>Registrations: {offChainVoter.registrationCount}</div>
                <div>Stake: {formatEther(BigInt(offChainVoter.stakeAmount), 4)} ETH</div>
              </>
            )}
          </div>
          
          {/* RPC URL Verification */}
          <div className="mt-2 pt-2 border-t border-gray-300">
            <button
              onClick={async () => {
                try {
                  // Check what MetaMask thinks the chain is
                  if (typeof window !== 'undefined' && (window as any).ethereum) {
                    const ethereum = (window as any).ethereum;
                    const chainId = await ethereum.request({ method: 'eth_chainId' });
                    const networkVersion = await ethereum.request({ method: 'net_version' });
                    
                    // Check what the current network RPC URL is
                    // Note: MetaMask doesn't expose the RPC URL directly, but we can verify
                    // by checking if Hardhat responds
                    const hardhatResponse = await fetch('http://127.0.0.1:8545', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        jsonrpc: '2.0',
                        method: 'eth_blockNumber',
                        params: [],
                        id: 1,
                      }),
                    });
                    
                    const hardhatData = await hardhatResponse.json();
                    
                    toast(
                      <div className="space-y-1 text-left">
                        <p className="font-bold">RPC Configuration Check:</p>
                        <p>MetaMask Chain ID: {parseInt(chainId, 16)} (Expected: 1337)</p>
                        <p>MetaMask Network: {networkVersion} (Expected: 1337)</p>
                        <p>Hardhat RPC: http://127.0.0.1:8545</p>
                        <p>Hardhat Block: {hardhatData.result}</p>
                        {parseInt(chainId, 16) !== 1337 && (
                          <p className="text-red-600 font-bold mt-2">
                            ⚠️ Chain ID Mismatch! MetaMask needs Chain ID 1337
                          </p>
                        )}
                      </div>,
                      { duration: 8000 }
                    );
                  }
                } catch (e: any) {
                  toast.error(`RPC Check Error: ${e.message}`);
                }
              }}
              className="btn-secondary text-xs mt-2"
            >
              🔍 Verify RPC Configuration
            </button>
            <p className="text-xs text-gray-500 mt-1">
              Expected: Chain ID 1337, RPC: http://127.0.0.1:8545
            </p>
          </div>
        </div>
      )}

      {/* Voter Registration */}
      {/* Always show registration form (for testing - allows multiple registrations) */}
      {isConnected && (
        <div className="card bg-primary-50 border-primary-200">
          <div className="flex items-start gap-4">
            <Shield className="w-12 h-12 text-primary flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Register as a Voter
              </h3>
              <p className="text-gray-600 mb-4">
                Stake ETH to participate in governance voting. Your voting power is based on your stake and reputation.
                {isRegistered && (
                  <span className="block mt-2 text-sm text-primary-600 font-medium">
                    ✓ Already registered • You can register again for testing
                  </span>
                )}
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
                    isRegistered ? 'Register Again (Testing)' : 'Register'
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Minimum stake: 0.01 ETH • {isRegistered ? 'Testing mode: Multiple registrations allowed' : 'Registration will be on-chain (off-chain backup if error occurs)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Voter Stats */}
      {isRegistered && voter && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card">
              <div className="text-sm text-gray-600 mb-1">Your Stake</div>
              <div className="text-2xl font-bold text-primary">
                {offChainVoter 
                  ? formatEther(BigInt(offChainVoter.stakeAmount), 4)
                  : formatEther(voter.stakedAmount, 4)
                } ETH
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600 mb-1">Reputation</div>
              <div className="text-2xl font-bold text-gray-900">
                {offChainVoter ? offChainVoter.reputation : Number(voter.reputation)}
              </div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-600 mb-1">Proposals Voted</div>
              <div className="text-2xl font-bold text-gray-900">
                {offChainVoter ? 0 : Number(voter.proposalCount || 0)}
              </div>
            </div>
          </div>
          {offChainVoter && (
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Shield className="w-4 h-4" />
                <span>
                  Using off-chain registration (Testing Mode) - Registration #{offChainVoter.registrationCount} 
                  • Persists across Hardhat resets
                </span>
              </div>
            </div>
          )}
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
              />
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
