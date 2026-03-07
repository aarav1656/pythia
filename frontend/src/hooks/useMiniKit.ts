'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { parseEther, toHex } from 'viem'
import { CONTRACTS } from '@/lib/contracts'

// Minimal ABI matching the deployed contract: 0x6158fa6bA28a664660B3beb4F8992694dbAD4fAC
// placeBet(uint256 marketId, bool isYes, bytes32 worldIdNullifier)
// World ID nullifier_hash stored as bytes32 — provides sybil resistance via userHasBet mapping
const PLACE_BET_ABI = [
  {
    name: 'placeBet',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'marketId',         type: 'uint256' },
      { name: 'isYes',            type: 'bool' },
      { name: 'worldIdNullifier', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const

interface User {
  address: string | null
  isVerified: boolean
  isInWorldApp: boolean
}

function getMiniKitAddress(): string | null {
  const u = MiniKit.user as any
  return u?.walletAddress ?? u?.address ?? null
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
      const addr = getMiniKitAddress()
      setUser({ address: addr, isVerified: false, isInWorldApp: true })
      setIsLoading(false)

      const t = setTimeout(() => {
        const addrRetry = getMiniKitAddress()
        if (addrRetry) setUser(prev => ({ ...prev, address: addrRetry }))
      }, 500)
      return () => clearTimeout(t)
    } else if (isConnected && walletAddress) {
      setUser({ address: walletAddress, isVerified: false, isInWorldApp: false })
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [isConnected, walletAddress])

  const placeBet = useCallback(async (
    marketId: number,
    isYes: boolean,
    betAmountEth: number,
  ) => {
    if (!MiniKit.isInstalled()) {
      throw new Error('Open in World App to place bets')
    }

    const currentAddress = getMiniKitAddress() ?? user.address ?? ''

    // ── Step 1: World ID verification (Device level — works without Orb scan on testnet) ──
    // Action must be registered at developer.worldcoin.org → your app → Actions
    // Action ID must match NEXT_PUBLIC_WLD_ACTION_ID (default: 'place-bet')
    const verifyResult = await MiniKit.commandsAsync.verify({
      action: process.env.NEXT_PUBLIC_WLD_ACTION_ID ?? 'place-bet',
      signal: currentAddress,
      verification_level: VerificationLevel.Device,
    })

    if (verifyResult.finalPayload.status === 'error') {
      const code = (verifyResult.finalPayload as any).error_code ?? 'unknown'
      if (code === 'user_rejected') throw new Error('rejected')
      if (code === 'action_not_found' || code === 'invalid_action') {
        throw new Error('Action not registered — add "place-bet" action in developer.worldcoin.org → your app → Actions')
      }
      throw new Error(`Verification failed: ${code}`)
    }

    const { nullifier_hash } = verifyResult.finalPayload as {
      nullifier_hash: string
      merkle_root: string
      proof: string
      status: 'success'
    }

    // ── Step 2: Convert nullifier_hash → bytes32 ──
    // World ID returns nullifier_hash as decimal string — convert to padded hex
    const nullifierBigInt = BigInt(nullifier_hash)
    const nullifierBytes32 = `0x${nullifierBigInt.toString(16).padStart(64, '0')}` as `0x${string}`

    // ── Step 3: Send transaction ──
    // Contract: 0x6158fa6bA28a664660B3beb4F8992694dbAD4fAC
    // Stores nullifier bytes32 without on-chain ZK check — sybil resistance via userHasBet mapping
    console.log('[Pythia] sendTransaction args:', {
      contract: CONTRACTS.pythia,
      marketId, isYes, nullifierBytes32,
      value: toHex(parseEther(String(betAmountEth))),
    })
    const txResult = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: CONTRACTS.pythia,
        abi: PLACE_BET_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), isYes, nullifierBytes32],
        value: toHex(parseEther(String(betAmountEth))),
      }],
    })

    if (txResult.finalPayload.status === 'error') {
      const payload = txResult.finalPayload as any
      console.error('[Pythia] sendTransaction error payload:', JSON.stringify(payload, null, 2))
      const code = payload.error_code ?? payload.description ?? 'unknown'
      const desc = payload.description ?? payload.mini_app_error_detail ?? ''
      const debugUrl = payload.debug_url ?? ''
      if (code === 'user_rejected') throw new Error('rejected')
      if (code === 'insufficient_funds' || code === 'insufficient_balance') {
        throw new Error('insufficient_funds — need testnet ETH on World Chain Sepolia')
      }
      // Show full detail for every other error so we can diagnose
      const detail = [code, desc, debugUrl].filter(Boolean).join(' | ')
      throw new Error(detail || JSON.stringify(payload).slice(0, 300))
    }

    return (txResult.finalPayload as any).transaction_id as string
  }, [user.address])

  const walletAddressDisplay = MiniKit.isInstalled()
    ? getMiniKitAddress() ?? user.address
    : isConnected ? walletAddress ?? null : null

  return {
    user,
    isLoading,
    placeBet,
    walletAddress: walletAddressDisplay,
    isInWorldApp: MiniKit.isInstalled(),
    isWalletConnected: isConnected,
    isTransactionPending: isPending,
    isTransactionConfirmed: isConfirming,
  }
}

export function formatAddress(address: string | null | undefined): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
