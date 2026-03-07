'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { decodeAbiParameters, parseEther, toHex } from 'viem'
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
      // walletAddress is exposed on MiniKit.user after install
      const addr = (MiniKit.user as any)?.walletAddress ?? (MiniKit.user as any)?.address ?? null
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
   * Full bet flow for World App:
   * 1. MiniKit.commandsAsync.verify() → shows World ID biometric drawer
   * 2. Decode ABI-encoded proof → uint256[8]
   * 3. MiniKit.commandsAsync.sendTransaction() → shows signing sheet
   */
  const placeBet = useCallback(async (
    marketId: number,
    isYes: boolean,
    betAmountEth: number,
  ) => {
    if (!MiniKit.isInstalled()) {
      throw new Error('Open in World App to place bets')
    }

    // ── STEP 1: World ID verification — opens biometric drawer ──
    const verifyResult = await MiniKit.commandsAsync.verify({
      action: process.env.NEXT_PUBLIC_WLD_ACTION_ID ?? 'place-bet',
      signal: user.address ?? '',
      verification_level: VerificationLevel.Orb,
    })

    if (verifyResult.finalPayload.status === 'error') {
      const errPayload = verifyResult.finalPayload as { error_code?: string }
      throw new Error(`World ID failed: ${errPayload.error_code ?? 'unknown'}`)
    }

    const { merkle_root, nullifier_hash, proof } = verifyResult.finalPayload as {
      merkle_root: string
      nullifier_hash: string
      proof: string
      status: 'success'
    }

    // ── STEP 2: Decode ABI-encoded proof → uint256[8] ──
    const unpackedProof = decodeAbiParameters(
      [{ type: 'uint256[8]' }],
      proof as `0x${string}`
    )[0] as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

    // ── STEP 3: Send transaction — opens World App signing sheet ──
    const txResult = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: CONTRACTS.pythia,
        abi: PYTHIA_ABI,
        functionName: 'placeBet',
        args: [
          BigInt(marketId),
          isYes,
          BigInt(merkle_root),
          BigInt(nullifier_hash),
          unpackedProof,
        ],
        value: toHex(parseEther(String(betAmountEth))),
      }],
    })

    if (txResult.finalPayload.status === 'error') {
      const errPayload = txResult.finalPayload as { error_code?: string }
      // user_rejected = user cancelled — don't treat as hard error
      if (errPayload.error_code === 'user_rejected') throw new Error('rejected')
      throw new Error(`Transaction failed: ${errPayload.error_code ?? 'unknown'}`)
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
