'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, PYTHIA_ABI } from '@/lib/contracts'

interface User {
  address: string | null
  isVerified: boolean
  isInWorldApp: boolean
}

export function useMiniKit() {
  const [user, setUser] = useState<User>({
    address: null,
    isVerified: false,
    isInWorldApp: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  
  // Wagmi hooks for browser wallet
  const { address: walletAddress, isConnected } = useAccount()
  const { writeContractAsync, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    // Check if running in World App
    const inWorldApp = MiniKit.isInstalled()
    setUser(prev => ({ ...prev, isInWorldApp: inWorldApp }))

    if (inWorldApp) {
      // Get user info from World App
      const checkUser = async () => {
        try {
          const address = (MiniKit.user as any)?.address
          setUser({
            address: address ?? null,
            isVerified: false, // MiniKit doesn't expose this directly
            isInWorldApp: true,
          })
        } catch (e) {
          console.error('Failed to get user info:', e)
        } finally {
          setIsLoading(false)
        }
      }
      checkUser()
    } else if (isConnected && walletAddress) {
      // Browser wallet connected
      setUser({
        address: walletAddress,
        isVerified: false,
        isInWorldApp: false,
      })
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [isConnected, walletAddress])

  const verifyWorldID = useCallback(async (_action: string) => {
    if (!MiniKit.isInstalled()) {
      throw new Error('MiniKit not installed - must open in World App')
    }

    try {
      // MiniKit verification - returns a proof
      const payload = await (MiniKit as any).verify?.({
        action: _action,
        signal: 'bet',
      })
      
      return { proof: payload }
    } catch (e) {
      console.error('World ID verification failed:', e)
      throw e
    }
  }, [])

  const placeBet = useCallback(async (
    _marketId: number,
    _isYes: boolean,
    _nullifier: string
  ) => {
    try {
      if (MiniKit.isInstalled()) {
        // Use World App - would need proper transaction encoding
        return 'world-app-tx'
      } else if (isConnected) {
        // Use browser wallet
        const tx = await writeContractAsync({
          address: CONTRACTS.pythia,
          abi: PYTHIA_ABI,
          functionName: 'placeBet',
          args: [BigInt(_marketId), _isYes, _nullifier as `0x${string}`],
          value: BigInt(0.01 * 1e18),
        })
        return tx
      } else {
        throw new Error('No wallet connected')
      }
    } catch (e) {
      console.error('Bet failed:', e)
      throw e
    }
  }, [isConnected, writeContractAsync])

  const sendTransaction = useCallback(async (
    _to: string,
    _value: string,
    _data?: string
  ) => {
    if (!MiniKit.isInstalled()) {
      throw new Error('MiniKit not installed')
    }

    try {
      const result = await (MiniKit as any).sendTransaction?.({
        transaction: [{
          to: _to,
          value: _value,
          data: _data ?? '0x',
        }]
      })
      return result
    } catch (e) {
      console.error('Transaction failed:', e)
      throw e
    }
  }, [])

  return {
    user,
    isLoading,
    verifyWorldID,
    sendTransaction,
    placeBet,
    isInWorldApp: MiniKit.isInstalled(),
    isWalletConnected: isConnected,
    isTransactionPending: isPending,
    isTransactionConfirmed: isConfirming,
  }
}

// Helper to format address
export function formatAddress(address: string | null): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
