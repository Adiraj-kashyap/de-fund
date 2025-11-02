import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { useState, useEffect } from 'react';
import { CONTRACTS } from '../contracts/addresses';
import GovernanceABI from '../contracts/abis/MilestoneGovernance.json';

export function useVoterInfo(voterAddress?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.MILESTONE_GOVERNANCE,
    abi: GovernanceABI.abi,
    functionName: 'getVoterInfo',
    args: voterAddress ? [voterAddress] : undefined,
    query: {
      enabled: !!voterAddress && CONTRACTS.MILESTONE_GOVERNANCE !== '0x0000000000000000000000000000000000000000',
      refetchInterval: 5000,
      retry: false, // Don't retry on block tag errors
    },
  });
}

export function useTotalStaked() {
  return useReadContract({
    address: CONTRACTS.MILESTONE_GOVERNANCE,
    abi: GovernanceABI.abi,
    functionName: 'getTotalStaked',
    query: {
      enabled: CONTRACTS.MILESTONE_GOVERNANCE !== '0x0000000000000000000000000000000000000000', // Only query if address is set
      refetchInterval: 5000,
    },
  });
}

export function useProposal(proposalId: number) {
  return useReadContract({
    address: CONTRACTS.MILESTONE_GOVERNANCE,
    abi: GovernanceABI.abi,
    functionName: 'getProposal',
    args: [BigInt(proposalId)],
    query: {
      enabled: CONTRACTS.MILESTONE_GOVERNANCE !== '0x0000000000000000000000000000000000000000', // Only query if address is set
      refetchInterval: 5000,
    },
  });
}

export function useProposalCount() {
  return useReadContract({
    address: CONTRACTS.MILESTONE_GOVERNANCE,
    abi: GovernanceABI.abi,
    functionName: 'proposalCount',
    query: {
      enabled: CONTRACTS.MILESTONE_GOVERNANCE !== '0x0000000000000000000000000000000000000000', // Only query if address is set
      refetchInterval: 10000,
    },
  });
}

export function useHasVoted(proposalId: number, voterAddress?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.MILESTONE_GOVERNANCE,
    abi: GovernanceABI.abi,
    functionName: 'hasVoted',
    args: [BigInt(proposalId), voterAddress!],
    query: {
      enabled: !!voterAddress,
      refetchInterval: 5000,
    },
  });
}

export function useRegisterVoter() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { address, chainId } = useAccount();
  const [directTxHash, setDirectTxHash] = useState<`0x${string}` | null>(null);
  const [isDirectPending, setIsDirectPending] = useState(false);
  
  // Check if we're on localhost (chainId 1337)
  const isLocalhost = chainId === 1337;
  
  const register = async (stakeAmount: bigint) => {
    // CRITICAL FIX: For localhost, ALWAYS use direct MetaMask to bypass wagmi's block cache
    // This is the ONLY way to prevent "block tag 6/8" errors when Hardhat resets
    if (isLocalhost && typeof window !== 'undefined' && (window as any).ethereum && address) {
      setIsDirectPending(true);
      try {
        // IMPORTANT: Get the RAW ethereum provider, not wagmi's wrapped one
        // This ensures we bypass ALL caching layers
        const ethereum = (window as any).ethereum;
        
        // STEP 1: Query Hardhat DIRECTLY (not through MetaMask) to get true latest block
        // This forces MetaMask to sync its cache
        const hardhatBlockResponse = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 1,
          }),
        });
        
        if (!hardhatBlockResponse.ok) {
          throw new Error('Hardhat node not accessible');
        }
        
        const hardhatBlockData = await hardhatBlockResponse.json();
        const hardhatBlockNumber = hardhatBlockData.result;
        console.log('📊 Hardhat current block:', hardhatBlockNumber);
        
        // STEP 2: Force MetaMask to sync by querying block number through it
        // This updates MetaMask's internal cache
        try {
          await ethereum.request({
            method: 'eth_blockNumber',
            params: [],
          });
          console.log('🔄 MetaMask block number synced');
        } catch (e) {
          console.warn('MetaMask block sync warning:', e);
        }
        
        // STEP 3: Get nonce DIRECTLY from Hardhat (bypass MetaMask cache)
        // This is critical - MetaMask may have cached nonce
        const nonceResponse = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionCount',
            params: [address, 'latest'],
            id: 1,
          }),
        });
        
        if (!nonceResponse.ok) {
          throw new Error('Failed to get nonce from Hardhat');
        }
        
        const nonceData = await nonceResponse.json();
        const currentNonce = nonceData.result;
        console.log('📝 Current nonce from Hardhat:', currentNonce);
        
        // STEP 4: Encode the function call
        const data = encodeFunctionData({
          abi: GovernanceABI.abi,
          functionName: 'registerVoter',
        });
        
        // STEP 5: Estimate gas DIRECTLY from Hardhat (bypass MetaMask cache)
        // This prevents MetaMask from using cached block numbers for gas estimation
        const gasEstimateResponse = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_estimateGas',
            params: [{
              from: address,
              to: CONTRACTS.MILESTONE_GOVERNANCE,
              value: `0x${stakeAmount.toString(16)}`,
              data: data,
            }],
            id: 1,
          }),
        });
        
        let gasLimit: string | undefined;
        if (gasEstimateResponse.ok) {
          const gasData = await gasEstimateResponse.json();
          
          // Check if gas estimation failed due to contract revert
          if (gasData.error) {
            const errorMsg = JSON.stringify(gasData.error).toLowerCase();
            if (errorMsg.includes('already registered') || errorMsg.includes('already a registered')) {
              // Contract prevents re-registration - this is expected behavior
              console.log('ℹ️ Contract prevents re-registration (expected). Using off-chain backup.');
              throw new Error('ALREADY_REGISTERED'); // Special error code for handler
            }
          }
          
          if (gasData.result) {
            // Add 20% buffer for safety
            const gasBigInt = BigInt(gasData.result);
            gasLimit = `0x${(gasBigInt + (gasBigInt * BigInt(20) / BigInt(100))).toString(16)}`;
            console.log('⛽ Gas estimate from Hardhat:', gasLimit);
          }
        } else {
          console.warn('⚠️ Gas estimation failed, MetaMask will estimate');
        }
        
        // STEP 6: Send transaction with explicit nonce and gas
        // This bypasses MetaMask's nonce/gas estimation cache
        const txHash = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: address,
            to: CONTRACTS.MILESTONE_GOVERNANCE,
            value: `0x${stakeAmount.toString(16)}`,
            data: data,
            nonce: currentNonce, // Use nonce from Hardhat directly
            ...(gasLimit ? { gas: gasLimit } : {}), // Use gas from Hardhat if available
            // Let MetaMask estimate other parameters, but we've set the critical ones
          }],
        });
        
        setDirectTxHash(txHash as `0x${string}`);
        setIsDirectPending(false);
        console.log('✅ Transaction sent directly via MetaMask (block synced):', txHash);
        return;
      } catch (directError: any) {
        setIsDirectPending(false);
        console.error('❌ Direct MetaMask call failed:', directError);
        
        // Check if it's a block tag error - if so, MetaMask cache is still wrong
        const errorMsg = directError?.message?.toLowerCase() || '';
        if (errorMsg.includes('block tag') || errorMsg.includes('block number')) {
          console.error('⚠️ MetaMask still has cached block number. User needs to reset MetaMask account.');
          throw new Error('MetaMask cache mismatch. Please go to MetaMask Settings > Advanced > Reset Account, then try again.');
        }
        
        throw directError;
      }
    }
    
    // For non-localhost networks, use wagmi (no cache issues on mainnet/testnet)
    writeContract({
      address: CONTRACTS.MILESTONE_GOVERNANCE,
      abi: GovernanceABI.abi,
      functionName: 'registerVoter',
      value: stakeAmount,
    });
  };
  
  // For direct transactions, wait for receipt using direct RPC
  const [directTxSuccess, setDirectTxSuccess] = useState(false);
  useEffect(() => {
    if (directTxHash && isLocalhost && typeof window !== 'undefined' && (window as any).ethereum) {
      const checkReceipt = async () => {
        try {
          const ethereum = (window as any).ethereum;
          const receipt = await ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [directTxHash],
          });
          
          if (receipt && receipt.status === '0x1') {
            setDirectTxSuccess(true);
          }
        } catch (e) {
          // Still waiting
        }
      };
      
      const interval = setInterval(checkReceipt, 2000);
      checkReceipt(); // Check immediately
      return () => clearInterval(interval);
    }
  }, [directTxHash, isLocalhost]);
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ 
    hash: directTxHash || hash,
    query: {
      enabled: !!hash || !!directTxHash,
      retry: false,
    },
  });
  
  return {
    register,
    isPending: isDirectPending || isPending,
    isConfirming,
    isSuccess: directTxSuccess || isSuccess,
    error,
    hash: directTxHash || hash,
  };
}

export function useCreateProposal() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const createProposal = (escrowAddress: `0x${string}`, stageIndex: number, evidenceHash: string) => {
    writeContract({
      address: CONTRACTS.MILESTONE_GOVERNANCE,
      abi: GovernanceABI.abi,
      functionName: 'createMilestoneProposal',
      args: [escrowAddress, BigInt(stageIndex), evidenceHash],
    });
  };
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  return {
    createProposal,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

export function useVote() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const vote = (proposalId: number, inFavor: boolean) => {
    writeContract({
      address: CONTRACTS.MILESTONE_GOVERNANCE,
      abi: GovernanceABI.abi,
      functionName: 'vote',
      args: [BigInt(proposalId), inFavor],
    });
  };
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  return {
    vote,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

export function useExecuteProposal() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const execute = (proposalId: number) => {
    writeContract({
      address: CONTRACTS.MILESTONE_GOVERNANCE,
      abi: GovernanceABI.abi,
      functionName: 'executeProposal',
      args: [BigInt(proposalId)],
    });
  };
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  return {
    execute,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

export function useAddStake() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const addStake = (amount: bigint) => {
    writeContract({
      address: CONTRACTS.MILESTONE_GOVERNANCE,
      abi: GovernanceABI.abi,
      functionName: 'addStake',
      value: amount,
    });
  };
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  return {
    addStake,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

export function useWithdrawStake() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const withdraw = () => {
    writeContract({
      address: CONTRACTS.MILESTONE_GOVERNANCE,
      abi: GovernanceABI.abi,
      functionName: 'withdrawStake',
    });
  };
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  return {
    withdraw,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}
