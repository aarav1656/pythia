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
  const { isConfirmed } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    // Check if running in World App
    const inWorldApp = MiniKit.isInstalled()
    setUser(prev => ({ ...prev, isInWorldApp: inWorldApp }))

    if (inWorldApp) {
      // Get user info from World App
      const checkUser = async () => {
        try {
          const { address } = MiniKit.user
          const isVerified = MiniKit.isVerified
          setUser({
            address: address ?? null,
            isVerified: isVerified ?? false,
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

  const verifyWorldID = useCallback(async (action: string) => {
    if (!MiniKit.isInstalled()) {
      throw new Error('MiniKit not installed - must open in World App')
    }

    try {
      // Generate verification payload
      const payload = await MiniKit.verifyWorldID({
        action: action,
        signal: 'bet', // signal can be bet amount or market id
      })
      
      return payload
    } catch (e) {
      console.error('World ID verification failed:', e)
      throw e
    }
  }, [])

  const placeBet = useCallback(async (
    marketId: number,
    isYes: boolean,
    nullifier: string
  ) => {
    const value = '0x0' // ETH value in hex
    
    try {
      if (MiniKit.isInstalled()) {
        // Use World App
        const { finalPayload } = await MiniKit.sendTransaction({
          transaction: [{
            to: CONTRACTS.pythia,
            value,
            data: '0x', // Would encode function call
          }]
        })
        return finalPayload
      } else if (isConnected) {
        // Use browser wallet
        const tx = await writeContractAsync({
          address: CONTRACTS.pythia,
          abi: PYTHIA_ABI,
          functionName: 'placeBet',
          args: [BigInt(marketId), isYes, nullifier as `0x${string}`],
          value: BigInt(0.01 * 1e18), // 0.01 ETH
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
    to: string,
    value: string,
    data?: string
  ) => {
    if (!MiniKit.isInstalled()) {
      throw new Error('MiniKit not installed')
    }

    try {
      const { commandPayload, finalPayload } = await MiniKit.sendTransaction({
        transaction: [
          {
            to,
            value,
            data: data ?? '0x',
          },
        ],
      })

      return { commandPayload, finalPayload }
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
    isTransactionConfirmed: isConfirmed,
  }
}

// Helper to format address
export function formatAddress(address: string | null): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
