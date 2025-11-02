import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import toast from 'react-hot-toast'

/**
 * Custom hook for interacting with FundingEscrow contract
 */
export function useFundingEscrow(contractAddress) {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const donate = async (amount) => {
    try {
      writeContract({
        address: contractAddress,
        abi: [
          {
            name: 'donate',
            type: 'function',
            stateMutability: 'payable',
            inputs: [],
            outputs: [],
          },
        ],
        functionName: 'donate',
        value: parseEther(amount.toString()),
      })
    } catch (err) {
      console.error('Donation error:', err)
      toast.error('Failed to donate')
    }
  }

  const refund = async () => {
    try {
      writeContract({
        address: contractAddress,
        abi: [
          {
            name: 'refund',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [],
            outputs: [],
          },
        ],
        functionName: 'refund',
      })
    } catch (err) {
      console.error('Refund error:', err)
      toast.error('Failed to refund')
    }
  }

  return {
    donate,
    refund,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  }
}

/**
 * Custom hook for reading FundingEscrow state
 */
export function useFundingEscrowRead(contractAddress, functionName, args = []) {
  return useReadContract({
    address: contractAddress,
    abi: [
      {
        name: functionName,
        type: 'function',
        stateMutability: 'view',
        inputs: args.map((_, i) => ({ name: `arg${i}`, type: 'uint256' })),
        outputs: [{ type: 'uint256' }],
      },
    ],
    functionName,
    args,
    enabled: !!contractAddress,
  })
}
