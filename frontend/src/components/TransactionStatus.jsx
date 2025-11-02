import { useEffect } from 'react'
import { useWaitForTransactionReceipt } from 'wagmi'
import toast from 'react-hot-toast'
import LoadingSpinner from './LoadingSpinner'

export default function TransactionStatus({ hash, onSuccess, onError }) {
  const { isLoading, isSuccess, isError, error } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    if (isSuccess) {
      toast.success('Transaction confirmed!')
      if (onSuccess) onSuccess()
    }
  }, [isSuccess, onSuccess])

  useEffect(() => {
    if (isError) {
      toast.error(`Transaction failed: ${error?.message || 'Unknown error'}`)
      if (onError) onError(error)
    }
  }, [isError, error, onError])

  if (!hash) return null

  return (
    <div className="flex items-center space-x-2 text-sm text-gray-600">
      {isLoading && (
        <>
          <LoadingSpinner size="sm" />
          <span>Confirming transaction...</span>
        </>
      )}
      {isSuccess && (
        <span className="text-green-600">? Transaction confirmed</span>
      )}
      {isError && (
        <span className="text-red-600">? Transaction failed</span>
      )}
    </div>
  )
}
