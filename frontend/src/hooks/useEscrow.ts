import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '../contracts/addresses';
import FundingEscrowABI from '../contracts/abis/FundingEscrow.json';

export function useEscrowStatus(escrowAddress?: `0x${string}`) {
  const address = escrowAddress || CONTRACTS.FUNDING_ESCROW;
  
  return useReadContract({
    address,
    abi: FundingEscrowABI.abi,
    functionName: 'getProjectStatus',
    query: {
      refetchInterval: 5000, // Refetch every 5 seconds
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
      refetchInterval: 5000,
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
      enabled: !!userAddress,
      refetchInterval: 5000,
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
  });
}

export function useDonate() {
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  
  const donate = (amount: bigint, escrowAddress?: `0x${string}`) => {
    const address = escrowAddress || CONTRACTS.FUNDING_ESCROW;
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
