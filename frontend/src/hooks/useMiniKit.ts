'use client'

import { useState, useEffect, useCallback } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { parseEther, toHex } from 'viem'
import { CONTRACTS } from '@/lib/contracts'

// Minimal ABI for MiniKit — matches the deployed contract's placeBet signature
// New contract (0xC1aed1a6824a534be81d22Ef11D6f2d856bAde99): 5-param with ZK proof
const PLACE_BET_ABI = [
  {
    name: 'placeBet',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'marketId',      type: 'uint256' },
      { name: 'isYes',         type: 'bool' },
      { name: 'root',          type: 'uint256' },
      { name: 'nullifierHash', type: 'uint256' },
      { name: 'proof',         type: 'uint256[8]' },
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

    const { nullifier_hash, merkle_root, proof } = verifyResult.finalPayload as {
      nullifier_hash: string
      merkle_root: string
      proof: string
      status: 'success'
    }

    // ── Step 2: Decode ZK proof fields ──
    // World ID returns proof as a hex string of 8 packed uint256s (256 bytes total)
    const nullifierHash = BigInt(nullifier_hash)
    const root = BigInt(merkle_root)
    const proofHex = proof.startsWith('0x') ? proof.slice(2) : proof
    const proofArr = Array.from({ length: 8 }, (_, i) =>
      BigInt('0x' + proofHex.slice(i * 64, (i + 1) * 64))
    ) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

    // ── Step 3: Send transaction ──
    // Contract: 0xC1aed1a6824a534be81d22Ef11D6f2d856bAde99 (World Chain Sepolia)
    // Must be allowlisted at developer.worldcoin.org → Configuration → Advanced
    console.log('[Pythia] sendTransaction args:', {
      contract: CONTRACTS.pythia,
      marketId, isYes, root: root.toString(), nullifierHash: nullifierHash.toString(),
      value: toHex(parseEther(String(betAmountEth))),
    })
    const txResult = await MiniKit.commandsAsync.sendTransaction({
      transaction: [{
        address: CONTRACTS.pythia,
        abi: PLACE_BET_ABI,
        functionName: 'placeBet',
        args: [BigInt(marketId), isYes, root, nullifierHash, proofArr],
        value: toHex(parseEther(String(betAmountEth))),
      }],
    })

    if (txResult.finalPayload.status === 'error') {
      const payload = txResult.finalPayload as any
      // Log full payload so it appears in Vercel function logs / browser console
      console.error('[Pythia] sendTransaction error payload:', JSON.stringify(payload, null, 2))
      const code = payload.error_code ?? payload.description ?? 'unknown'
      if (code === 'user_rejected') throw new Error('rejected')
      if (code === 'insufficient_funds' || code === 'insufficient_balance') {
        throw new Error('Need testnet ETH — get from World Chain Sepolia faucet')
      }
      if (code === 'simulation_failed' || code === 'simulation_reverted') {
        const debugUrl = payload.debug_url ?? ''
        throw new Error(`simulation_failed${debugUrl ? ` — Tenderly: ${debugUrl}` : ' — already bet on this market or market closed'}`)
      }
      // Throw the raw payload JSON so it shows in the error banner
      throw new Error(`${code} — ${JSON.stringify(payload)}`)
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
