import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { encodeFunctionData } from 'viem';
import { CONTRACTS } from '../contracts/addresses';
import FundingEscrowABI from '../contracts/abis/FundingEscrow.json';

export function useEscrowStatus(escrowAddress?: `0x${string}`) {
  const address = escrowAddress || CONTRACTS.FUNDING_ESCROW;
  
  // Validate address format
  const isValidAddress = address && 
    address !== '0x0000000000000000000000000000000000000000' &&
    /^0x[a-fA-F0-9]{40}$/i.test(address);
  
  return useReadContract({
    address: isValidAddress ? address : undefined,
    abi: FundingEscrowABI.abi,
    functionName: 'getProjectStatus',
    query: {
      enabled: isValidAddress && !!escrowAddress, // Only query if valid address is provided
      refetchInterval: false, // Don't auto-refetch (prevents page refreshing)
      retry: (failureCount, error: any) => {
        // Don't retry on contract errors, but retry once on network/RPC errors
        if (error?.message?.includes('returned no data') || 
            error?.message?.includes('not a contract') ||
            error?.message?.includes('function selector was not recognized')) {
          return false;
        }
        // Retry once on network errors
        return failureCount < 1;
      },
      retryOnMount: true, // Retry on mount (will be stopped by retry function above)
      staleTime: 30000, // Consider data fresh for 30 seconds
    },
  });
}

export function useEscrowBalance(escrowAddress?: `0x${string}`) {
  const address = escrowAddress || CONTRACTS.FUNDING_ESCROW;
  
  return useReadContract({
    address,
    abi: FundingEscrowABI.abi,
    functionName: 'getBalance',
    query: {
      enabled: address !== '0x0000000000000000000000000000000000000000', // Only query if address is set
      refetchInterval: false, // Don't auto-refetch
      staleTime: 30000,
    },
  });
}

export function useUserContribution(userAddress?: `0x${string}`, escrowAddress?: `0x${string}`) {
  const address = escrowAddress || CONTRACTS.FUNDING_ESCROW;
  
  return useReadContract({
    address,
    abi: FundingEscrowABI.abi,
    functionName: 'contributions',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && address !== '0x0000000000000000000000000000000000000000' && !!escrowAddress,
      refetchInterval: false, // Don't auto-refetch
      staleTime: 30000,
      retry: false,
    },
  });
}

export function useStageAllocation(stageIndex: number, escrowAddress?: `0x${string}`) {
  const address = escrowAddress || CONTRACTS.FUNDING_ESCROW;
  
  return useReadContract({
    address,
    abi: FundingEscrowABI.abi,
    functionName: 'getStageAllocation',
    args: [BigInt(stageIndex)],
    query: {
      refetchInterval: false, // Don't auto-refetch
      staleTime: 30000,
    },
  });
}

export function useDonate() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { chainId } = useAccount();
  
  const donate = async (amount: bigint, escrowAddress?: `0x${string}`) => {
    const address = escrowAddress || CONTRACTS.FUNDING_ESCROW;
    
    // For localhost (chainId 1337), use direct MetaMask API to avoid block tag issues
    if (chainId === 1337 || chainId === 31337) {
      try {
        const provider = (window as any).ethereum;
        if (!provider) {
          throw new Error('MetaMask not found');
        }

        // Get current account
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('No account connected');
        }
        const from = accounts[0];

        // CRITICAL: Query Hardhat DIRECTLY (not through MetaMask) to get true latest block
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
        
        // Force MetaMask to sync by querying block number through it
        try {
          await provider.request({
            method: 'eth_blockNumber',
            params: [],
          });
          console.log('🔄 MetaMask block number synced');
        } catch (e) {
          console.warn('MetaMask block sync warning:', e);
        }

        // Encode the function call data first
        // donate() is: function donate() external payable
        const functionData = encodeFunctionData({
          abi: FundingEscrowABI.abi,
          functionName: 'donate',
        });

        // Get nonce DIRECTLY from Hardhat (bypass MetaMask cache)
        const nonceResponse = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionCount',
            params: [from, 'latest'],
            id: 1,
          }),
        });
        
        if (!nonceResponse.ok) {
          throw new Error('Failed to get nonce from Hardhat');
        }
        
        const nonceData = await nonceResponse.json();
        const currentNonce = nonceData.result;
        console.log('📝 Current nonce from Hardhat:', currentNonce);

        // Estimate gas DIRECTLY from Hardhat (bypass MetaMask cache)
        const gasEstimateResponse = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_estimateGas',
            params: [{
              from,
              to: address,
              value: `0x${amount.toString(16)}`,
              data: functionData,
            }],
            id: 1,
          }),
        });
        
        let gasEstimate = '0x186a0'; // Default: 100,000 in hex
        if (gasEstimateResponse.ok) {
          const gasData = await gasEstimateResponse.json();
          if (gasData.result) {
            gasEstimate = gasData.result;
            console.log('⛽ Gas estimate from Hardhat:', gasEstimate);
          }
        } else {
          console.warn('Gas estimation failed, using default');
        }

        // Send transaction with explicit values through MetaMask
        const txHash = await provider.request({
          method: 'eth_sendTransaction',
          params: [{
            from,
            to: address,
            value: `0x${amount.toString(16)}`,
            data: functionData,
            gas: gasEstimate,
            nonce: currentNonce,
            chainId: `0x${chainId.toString(16)}`,
          }],
        });

        console.log('✅ Donation transaction sent:', txHash);
        
        // Return the transaction hash - the caller can wait for it
        return txHash;
      } catch (error: any) {
        console.error('❌ Direct MetaMask donation failed:', error);
        
        // Check for block tag errors
        if (error?.message?.includes('invalid block tag') || error?.message?.includes('Internal JSON-RPC')) {
          throw new Error('Hardhat node may have been reset. Please restart Hardhat and try again.');
        }
        
        throw error;
      }
    }
    
    // For other networks, use Wagmi
    writeContract({
      address,
      abi: FundingEscrowABI.abi,
      functionName: 'donate',
      value: amount,
    });
  };
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  return {
    donate,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

export function useRefund() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const refund = (escrowAddress?: `0x${string}`) => {
    const address = escrowAddress || CONTRACTS.FUNDING_ESCROW;
    writeContract({
      address,
      abi: FundingEscrowABI.abi,
      functionName: 'refund',
    });
  };
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  return {
    refund,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}
