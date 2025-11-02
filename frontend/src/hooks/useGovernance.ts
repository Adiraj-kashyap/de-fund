import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { CONTRACTS } from '../contracts/addresses';
import GovernanceABI from '../contracts/abis/MilestoneGovernance.json';

export function useVoterInfo(voterAddress?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.MILESTONE_GOVERNANCE,
    abi: GovernanceABI.abi,
    functionName: 'getVoterInfo',
    args: voterAddress ? [voterAddress] : undefined,
    query: {
      enabled: !!voterAddress,
      refetchInterval: 5000,
    },
  });
}

export function useTotalStaked() {
  return useReadContract({
    address: CONTRACTS.MILESTONE_GOVERNANCE,
    abi: GovernanceABI.abi,
    functionName: 'getTotalStaked',
    query: {
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
  
  const register = (stakeAmount: bigint) => {
    writeContract({
      address: CONTRACTS.MILESTONE_GOVERNANCE,
      abi: GovernanceABI.abi,
      functionName: 'registerVoter',
      value: stakeAmount,
    });
  };
  
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  
  return {
    register,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
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
