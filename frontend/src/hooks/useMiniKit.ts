'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { parseEther, toHex } from 'viem'
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

  const { address: walletAddress, isConnected } = useAccount()
  const { writeContractAsync, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    const inWorldApp = MiniKit.isInstalled()

    if (inWorldApp) {
      // walletAddress lives on MiniKit.user after install
      const addr = (MiniKit.user as any)?.walletAddress
        ?? (MiniKit.user as any)?.address
        ?? null
      setUser({ address: addr, isVerified: false, isInWorldApp: true })
      setIsLoading(false)
    } else if (isConnected && walletAddress) {
      setUser({ address: walletAddress, isVerified: false, isInWorldApp: false })
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [isConnected, walletAddress])

  /**
   * Bet flow in World App:
   * 1. MiniKit.commandsAsync.verify() → World ID biometric drawer
   * 2. Convert nullifier_hash → bytes32 for the deployed contract
   * 3. MiniKit.commandsAsync.sendTransaction() → signing sheet
   *
   * NOTE: The deployed contract (0x6158fa6b...) uses the original
   * placeBet(marketId, isYes, bytes32 worldIdNullifier) signature.
   * The nullifier_hash from World ID verify is unique per (human × action),
   * providing sybil resistance. On-chain ZK proof verification is in the
   * updated Pythia.sol source — redeploy to activate it.
   */
  const placeBet = useCallback(async (
    marketId: number,
    isYes: boolean,
    betAmountEth: number,
  ) => {
    if (!MiniKit.isInstalled()) {
      throw new Error('Open in World App to place bets')
    }

    // ── Step 1: World ID biometric verification ──
    const verifyResult = await MiniKit.commandsAsync.verify({
      action: process.env.NEXT_PUBLIC_WLD_ACTION_ID ?? 'place-bet',
      signal: user.address ?? '',
      verification_level: VerificationLevel.Orb,
    })

    if (verifyResult.finalPayload.status === 'error') {
      const code = (verifyResult.finalPayload as any).error_code ?? 'unknown'
      if (code === 'user_rejected') throw new Error('rejected')
      throw new Error(`World ID failed: ${code}`)
    }

    const { nullifier_hash } = verifyResult.finalPayload as {
      nullifier_hash: string
      merkle_root: string
      proof: string
      status: 'success'
    }

    // ── Step 2: Convert nullifier_hash to bytes32 ──
    // nullifier_hash is a 0x-prefixed hex string — pad to 32 bytes
    const nullifierBytes32 = ('0x' + nullifier_hash.replace('0x', '').padStart(64, '0')) as `0x${string}`

    // ── Step 3: Send transaction via World App ──
    const txResult = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: CONTRACTS.pythia,
        abi: PYTHIA_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), isYes, nullifierBytes32],
        value: toHex(parseEther(String(betAmountEth))),
      }],
    })

    if (txResult.finalPayload.status === 'error') {
      const code = (txResult.finalPayload as any).error_code ?? 'unknown'
      if (code === 'user_rejected') throw new Error('rejected')
      throw new Error(`Transaction failed: ${code}`)
    }

    return (txResult.finalPayload as any).transaction_id as string
  }, [user.address])

  return {
    user,
    isLoading,
    placeBet,
    isInWorldApp: MiniKit.isInstalled(),
    isWalletConnected: isConnected,
    isTransactionPending: isPending,
    isTransactionConfirmed: isConfirming,
  }
}

export function formatAddress(address: string | null): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
