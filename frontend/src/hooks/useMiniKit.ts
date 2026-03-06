'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'

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
    } else {
      setIsLoading(false)
    }
  }, [])

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
    isInWorldApp: MiniKit.isInstalled(),
  }
}

// Helper to format address
export function formatAddress(address: string | null): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
